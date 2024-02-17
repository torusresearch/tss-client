import { Client } from "@toruslabs/tss-client";
import BN from "bn.js";
import eccrypto, { generatePrivate } from "eccrypto";
import { privateToAddress } from "ethereumjs-util";
import keccak256 from "keccak256";
import * as tss from "@toruslabs/tss-lib";

import { getEcCrypto } from "./utils";
import { createSockets, distributeShares, getSignatures } from "./localUtils";

// NOTE: Calls to this route should be evenly distributed across servers
const tssImportUrl = `http://localhost:8000/clientWasm`;

const DELIMITERS = {
    Delimiter1: "\u001c",
    Delimiter2: "\u0015",
    Delimiter3: "\u0016",
    Delimiter4: "\u0017",
  };
const servers = 4;
const msg = "hello world";
const msgHash = keccak256(msg);
const clientIndex = servers - 1;
const ec = getEcCrypto();

const log = (...args: unknown[]) => {
    let msg = "";
    args.forEach((arg) => {
      msg += JSON.stringify(arg);
      msg += " ";
    });
    console.log(msg);
  };
  
const setupMockShares = async (endpoints: string[], parties: number[], session: string) => {
  const privKey = new BN(eccrypto.generatePrivate());
  const pubKeyElliptic = ec.curve.g.mul(privKey);
  const pubKeyX = pubKeyElliptic.getX().toString(16, 64);
  const pubKeyY = pubKeyElliptic.getY().toString(16, 64);
  const pubKeyHex = `${pubKeyX}${pubKeyY}`;
  const pubKey = Buffer.from(pubKeyHex, "hex").toString("base64");

  // distribute shares to servers and local device
  const share = await distributeShares(privKey, parties, endpoints, clientIndex, session);

  return { share, pubKey, privKey };
};

const setupSockets = async (tssWSEndpoints: string[]) => {
  const sockets = await createSockets(tssWSEndpoints);

  // wait for websockets to be connected
  await new Promise((resolve) => {
    const checkConnectionTimer = setInterval(() => {
      for (let i = 0; i < sockets.length; i++) {
        if (sockets[i] !== null && !sockets[i].connected) return;
      }
      clearInterval(checkConnectionTimer);
      resolve(true);
    }, 100);
  });

  return sockets;
};

const generateEndpoints = (parties: number, clientIndex: number) => {
  const endpoints: string[] = [];
  const tssWSEndpoints: string[] = [];
  const partyIndexes: number[] = [];
  let serverPortOffset = 0;
  const basePort = 8000;
  for (let i = 0; i < parties ; i++) {
    partyIndexes.push(i);
    if (i === clientIndex) {
      endpoints.push(null);
      tssWSEndpoints.push(null);
    } else {
      endpoints.push(`http://localhost:${basePort + serverPortOffset}`);
      tssWSEndpoints.push(`http://localhost:${basePort + serverPortOffset}`);
      serverPortOffset++;
    }
  }
  return { endpoints, tssWSEndpoints, partyIndexes };
};


const runTest = async () => {
  // this identifier is only required for testing,
  // so that clients cannot override shares of actual users incase
  // share route is exposed in production, which is exposed only in development/testing
  // by default.
  const testingRouteIdentifier = "testingShares";
  const randomNonce = keccak256(generatePrivate().toString("hex") + Date.now());
  const vid = `test_verifier_name${DELIMITERS.Delimiter1}test_verifier_id`;
  const session = `${testingRouteIdentifier}${vid}${DELIMITERS.Delimiter2}default${DELIMITERS.Delimiter3}0${
    DELIMITERS.Delimiter4
    }${randomNonce.toString("hex")}${testingRouteIdentifier}`;
  
  // generate mock signatures.
  const signatures = getSignatures();

  // const session = `test:${Date.now()}`;

  const parties = 4;
  const clientIndex = parties - 1;

  // generate endpoints for servers
  const { endpoints, tssWSEndpoints, partyIndexes } = generateEndpoints(parties, clientIndex);

  // setup mock shares, sockets and tss wasm files.
  const [{ share, pubKey, privKey }, sockets] = await Promise.all([
    setupMockShares(endpoints, partyIndexes, session),
    setupSockets(tssWSEndpoints),
    tss.default(tssImportUrl)
  ]);

  const serverCoeffs: Record<number,string> = {};
  const participatingServerDKGIndexes = [1, 2, 3]; 

  for (let i = 0; i < participatingServerDKGIndexes.length; i++) {
    const serverIndex = participatingServerDKGIndexes[i];
    serverCoeffs[serverIndex] = new BN(1).toString("hex");
  }

  console.log(sockets);
  const client = new Client(session, clientIndex, partyIndexes, endpoints, sockets, share, pubKey, true, tssImportUrl);
  client.log = log;
  // initiate precompute
  console.log("starting precompute");
  client.precompute(tss, { signatures, server_coeffs: serverCoeffs });
  await client.ready();
  // initiate signature.
  
  const signature = await client.sign(tss, msgHash.toString("base64"), true, msg, "keccak256", { signatures });

  const hexToDecimal = (x: Buffer) => ec.keyFromPrivate(x, "hex").getPrivate().toString(10);
  const pubk = ec.recoverPubKey(hexToDecimal(msgHash), signature, signature.recoveryParam, "hex");

  client.log(`pubkey, ${JSON.stringify(pubKey)}`);
  client.log(`msgHash: 0x${msgHash.toString("hex")}`);
  client.log(`signature: 0x${signature.r.toString(16, 64)}${signature.s.toString(16, 64)}${new BN(27 + signature.recoveryParam).toString(16)}`);
  client.log(`address: 0x${privateToAddress(Buffer.from(privKey.toString(16, 64), "hex")).toString("hex")}`);
  const passed = ec.verify(msgHash, signature, pubk);

  client.log(`passed: ${passed}`);
  client.log(`precompute time: ${client._endPrecomputeTime - client._startPrecomputeTime}`);
  client.log(`signing time: ${client._endSignTime - client._startSignTime}`);
  await client.cleanup(tss, { signatures });
  client.log("client cleaned up");
};

export const runLocalServerTest = async()=>{
  try {
    await runTest();
    console.log("test succeeded");
    document.title = "Test succeeded";
  } catch (error) {
    console.log("test failed", error);
    document.title = "Test failed";
  }
};

runLocalServerTest();