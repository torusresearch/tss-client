// tss server tests
import { Client, DELIMITERS, getDKLSCoeff, getTSSPubKey, setupSockets, generateEndpoints} from "@toruslabs/tss-client";
import BN from "bn.js";
import { generatePrivate } from "eccrypto";
import keccak256 from "keccak256";
import { TorusServiceProvider } from "@tkey-mpc/service-provider-torus";
import { MockStorageLayer } from "@tkey-mpc/storage-layer-torus";
import { ThresholdKey } from "@tkey-mpc/default";
import { fetchPostboxKeyAndSigs, generateRandomEmail, getEcCrypto } from "./utils";
import { getPubKeyPoint } from "@tkey-mpc/common-types";
import { TestConfigType } from "./interfaces";
import { fetchLocalConfig } from "@toruslabs/fnd-base";
import { TORUS_NETWORK_TYPE } from "@toruslabs/constants/dist/types/interfaces";
import tssLib from "@toruslabs/tss-dkls-lib";


const PRIVATE_KEY = generatePrivate().toString("hex");

const ec = getEcCrypto();


// to extend tss client log
const log = (_: string, ...args: unknown[]) => {
    let msg = "";
    args.forEach((arg) => {
      msg += JSON.stringify(arg);
      msg += " ";
    });
    console.log(msg);
};
  
const runTest = async (testConfig: TestConfigType) => {
  const network: TORUS_NETWORK_TYPE = testConfig.network || "sapphire_mainnet";
  const networkConfig = fetchLocalConfig(network, "secp256k1");
  if (!networkConfig) {
    throw new Error(`Invalid network: ${network}`);
  }

  // initialize service provider
  const torusSp = new TorusServiceProvider({
    postboxKey: PRIVATE_KEY,
    useTSS: true,
    nodeEndpoints: networkConfig.torusNodeEndpoints,
    customAuthArgs: {
      network,
      web3AuthClientId: "YOUR_CLIENT_ID",
      baseUrl: "http://localhost:3000",
    },
  });
  const verifier = "torus-test-health";
  torusSp.verifierName = verifier;
  torusSp.verifierId = testConfig.verifier_id || generateRandomEmail();
  
  // init storage layer
  const torusSL =  new MockStorageLayer();
  
  // instantiate tKey
  const tb = new ThresholdKey({ serviceProvider: torusSp, storageLayer: torusSL, manualSync: true });
  
  const deviceTSSShare = new BN(generatePrivate());
  const deviceTSSIndex = 3;

  console.log(`running tss signing test for verifier: ${verifier} and verifierId: ${torusSp.verifierId}`);
  // factor key needs to passed from outside of tKey
  const factorKey = new BN(generatePrivate());
  const factorPub = getPubKeyPoint(factorKey);


  const parties = 4;
  const clientIndex = parties - 1;

  const msg = "hello world";
  const msgHash = keccak256(msg);


  const randomSessionNonce = keccak256(generatePrivate().toString("hex") + Date.now());
  const vid = `${verifier}${DELIMITERS.Delimiter1}${torusSp.verifierId}`;

 
  // 1. setup



  // 2. get postbox key (login with oauth)
  const { signatures, postboxkey, nodeIndexes } = await fetchPostboxKeyAndSigs({ verifierName: verifier, verifierId: torusSp.verifierId }, network).catch((err) => {
    console.log("errr", err);
    throw new Error(`${err} sss_error`);
  });
  
  console.log("initializing tkey");
  console.log("fetching sss pub keys using 'fetchPostboxKeyAndSig'");

  await tb.initialize({ useTSS: true, factorPub, deviceTSSShare, deviceTSSIndex }).catch((err: unknown)=>{
    throw new Error(`${err} tkey_error`);
  });
  console.log("syncing tkey metadata");

  await tb.syncLocalMetadataTransitions().catch((err: unknown)=>{
    throw new Error(`meta-data error:${err}`);
  });

  const tssNonce = tb.metadata.tssNonces[tb.tssTag];
  console.log("fetching tss keys");

  
  const { pubKey: pubKeyDetails } = await tb.serviceProvider.getTSSPubKey(tb.tssTag, tssNonce).catch((err)=>{
    throw new Error(`error getting tss-pub-key: ${err}`);
  });
  // generate endpoints for servers
  const { endpoints, tssWSEndpoints, partyIndexes } = generateEndpoints(networkConfig.torusNodeTSSEndpoints, parties, clientIndex, nodeIndexes);
  console.log("endpoints", endpoints, tssWSEndpoints);
  const dkgTssPubKey = { x: pubKeyDetails.x.toString("hex"), y: pubKeyDetails.y.toString("hex") };

  torusSp.postboxKey = new BN(postboxkey, "hex");
  console.log("fetching tss share with device factor key");

  const { tssShare: userShare, tssIndex: userTSSIndex } = await tb.getTSSShare(factorKey);

  const session = `${vid}${DELIMITERS.Delimiter2}default${DELIMITERS.Delimiter3}${tssNonce}${
    DELIMITERS.Delimiter4
    }${randomSessionNonce.toString("hex")}`;

  console.log("setting up sockets");
  // setup mock shares, sockets and tss wasm files.
  const [sockets] = await Promise.all([
    setupSockets(tssWSEndpoints, session.split(DELIMITERS.Delimiter4)[1]
    )
  ]);

  // 3. get user's tss share from tkey.
  const userSharePub = ec.curve.g.mul(userShare);
  const userSharePubKey = { x: userSharePub.getX().toString("hex"), y: userSharePub.getY().toString("hex") };

  // 4. derive tss pub key, tss pubkey is implicitly formed using the dkgPubKey and the userShare (as well as userTSSIndex)
  const tssPubKey = getTSSPubKey(dkgTssPubKey, userSharePubKey, userTSSIndex);
  const pubKey = Buffer.from(`${tssPubKey.getX().toString(16, 64)}${tssPubKey.getY().toString(16,64)}`, "hex").toString("base64");

    // 5. Derive coeffs to make user share additive.
  const participatingServerDKGIndexes = nodeIndexes;
  const dklsCoeff = getDKLSCoeff(true, participatingServerDKGIndexes, userTSSIndex);
  const denormalisedShare = dklsCoeff.mul(userShare).umod(ec.curve.n);
  const share = Buffer.from(denormalisedShare.toString(16, 64), "hex").toString("base64");

  // 6. Derive coeffs to make server share additive.
  const serverCoeffs: Record<number, string> = {};
  for (let i = 0; i < participatingServerDKGIndexes.length; i++) {
    const serverIndex = participatingServerDKGIndexes[i];
    serverCoeffs[serverIndex] = getDKLSCoeff(false, participatingServerDKGIndexes, userTSSIndex, serverIndex).toString("hex");
  }


  const tssProcessingStart = window.performance.now();
  const lib = await tssLib.load();

  const client = new Client(session, clientIndex, partyIndexes, endpoints, sockets, share, pubKey, true, lib);
  client.log = (...args: unknown[]) => {
    log(testConfig.label, ...args);
  };
  console.log("doing tss precompute");

  // initiate precompute
  client.precompute({ signatures, server_coeffs: serverCoeffs });
  await client.ready().catch((err)=>{
    throw new Error(`tss_error during compute: ${err}`);
  });
  console.log("ready for signing");

  // initiate signature.
  const signature = await client.sign(msgHash.toString("base64"), true, msg, "keccak256", { signatures }).catch((err)=>{
    throw new Error(`${testConfig.label} tss_error during sign: ${err}`);
  });

  const tssProcessingEnd = window.performance.now();
  console.log(`signed successfully`);
  console.log(`perf_tss_${(Math.floor(tssProcessingEnd) - Math.floor(tssProcessingStart)) / 1000}`);
  const hexToDecimal = (x: Buffer) => ec.keyFromPrivate(x, "hex").getPrivate().toString(10);
  const pubk = ec.recoverPubKey(hexToDecimal(msgHash), signature, signature.recoveryParam, "hex");

  client.log(`pubkey, ${JSON.stringify(pubKey)}`);
  client.log(`msgHash: 0x${msgHash.toString("hex")}`);
  client.log(`signature: 0x${signature.r.toString(16, 64)}${signature.s.toString(16, 64)}${new BN(27 + signature.recoveryParam).toString(16)}`);
  const passed = ec.verify(msgHash, signature, pubk);
  client.log(`precompute time: ${client._endPrecomputeTime - client._startPrecomputeTime}`);
  client.log(`signing time: ${client._endSignTime - client._startSignTime}`);
  await client.cleanup({ signatures }).catch((err)=>{
    throw new Error(`${testConfig.label} tss_error during cleanup: ${err}`);
  });
  sockets.map((soc)=>{
    if (soc && soc.connected) {
      console.log(`closing socket: ${soc.id}`);
      soc.close();
    }
  });
  

  if (!passed) {
    throw new Error("Invalid signature found");
  }
  client.log("client cleaned up");
};

(async ()=>{
  try {
    await runTest({
      label: "tss_signing_test",
      network: "sapphire_devnet",
      userType: "new",
    }); 
    console.log("test succeeded");
    document.title = "Test succeeded";
  } catch (error: unknown) {
    console.log("test failed", error);
    document.title = "Test failed";
    throw error;
  }
  
})();