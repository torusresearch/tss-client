import { Client } from "@toruslabs/tss-client";
import { localStorageDB } from "./mockDB";

import { load as loadLib } from "@toruslabs/tss-dkls-lib";
import BN from "bn.js";
import eccrypto, { generatePrivate } from "eccrypto";
import { privateToAddress } from "@ethereumjs/util";
import keccak256 from "keccak256";

import { deserializePoint_Secp256k1_ConcatXY, deserializeScalar_Secp256k1, getEcCrypto, serializePoint_Secp256k1_ConcatXY, serializeScalar_Secp256k1 } from "./utils";
import { createSockets, distributeShares, getSignatures } from "./localUtils";


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
  await distributeShares(privKey, parties, endpoints, clientIndex, session);

  return { pubKey, privKey };
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

  console.log("sockets", tssWSEndpoints, sockets);
  return sockets;
};

// This is specifically for local testing
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


const runPostNonceTest = async () => {
  // this identifier is only required for testing,
  // so that clients cannot override shares of actual users incase
  // share route is exposed in production, which is exposed only in development/testing
  // by default.
  const nonce = ec.genKeyPair().getPrivate();

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
  const [{ pubKey, privKey }, sockets] = await Promise.all([
    setupMockShares(endpoints, partyIndexes, session),
    setupSockets(tssWSEndpoints),
  ]);

  const serverCoeffs: Record<number, string> = {};
  const participatingServerDKGIndexes = [1, 2, 3]; 

  for (let i = 0; i < participatingServerDKGIndexes.length; i++) {
    const serverIndex = participatingServerDKGIndexes[i];
    serverCoeffs[serverIndex] = new BN(1).toString("hex");
  }

  // Get the share and add nonce.
  const share = await localStorageDB.get(`session-${session}:share`);
  const shareBuffer = Buffer.from(share, "base64");
  const shareBN = deserializeScalar_Secp256k1(shareBuffer).add(nonce).umod(ec.n);
  const shareDerived = serializeScalar_Secp256k1(shareBN).toString("base64");

  // Add nonce to pub key.
  const pubKeyBuffer = Buffer.from(pubKey, "base64");
  const pubKeyPoint = deserializePoint_Secp256k1_ConcatXY(ec, pubKeyBuffer);
  const nonceBuffer = serializeScalar_Secp256k1(nonce);
  const noncePoint = ec.keyFromPrivate(nonceBuffer).getPublic();
  const pubKeyDerivedPoint = pubKeyPoint.add(noncePoint);
  const pubKeyDerived = serializePoint_Secp256k1_ConcatXY(pubKeyDerivedPoint).toString("base64");

  // Load WASM lib.
  const tssLib = await loadLib();

  // Initialize client.
  const client = new Client(session, clientIndex, partyIndexes, endpoints, sockets, shareDerived, pubKeyDerived, true, tssLib);
  client.log = log;

  // Run precompute protocol.
  client.precompute({ signatures, server_coeffs: serverCoeffs, _transport: 1, nonce: nonceBuffer.toString("base64") });
  await client.ready();

  // Run signing protocol.
  const signature = await client.sign(msgHash.toString("base64"), true, msg, "keccak256", { signatures });

  const hexToDecimal = (x: Buffer) => ec.keyFromPrivate(x).getPrivate().toString(10);
  const pubk = ec.recoverPubKey(hexToDecimal(msgHash), signature, signature.recoveryParam, "hex");

  client.log(`pubKeyDerived, ${JSON.stringify(pubKeyDerived)}`);
  client.log(`msgHash: 0x${msgHash.toString("hex")}`);
  client.log(`signature: 0x${signature.r.toString(16, 64)}${signature.s.toString(16, 64)}${new BN(27 + signature.recoveryParam).toString(16)}`);
  client.log(`address: 0x${Buffer.from(privateToAddress(privKey.toArrayLike(Buffer, "be", 32))).toString("hex")}`);
  const passed = ec.verify(msgHash, signature, pubk);

  client.log(`passed: ${passed}`);
  client.log(`precompute time: ${client._endPrecomputeTime - client._startPrecomputeTime}`);
  client.log(`signing time: ${client._endSignTime - client._startSignTime}`);
  await client.cleanup({ signatures });
  client.log("client cleaned up");
};


const runPreNonceTest = async () => {
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
  const [{ pubKey, privKey }, sockets] = await Promise.all([
    setupMockShares(endpoints, partyIndexes, session),
    setupSockets(tssWSEndpoints),
  ]);

  const serverCoeffs: Record<number, string> = {};
  const participatingServerDKGIndexes = [1, 2, 3]; 

  for (let i = 0; i < participatingServerDKGIndexes.length; i++) {
    const serverIndex = participatingServerDKGIndexes[i];
    serverCoeffs[serverIndex] = new BN(1).toString("hex");
  }
  // get the shares.
  const share = await localStorageDB.get(`session-${session}:share`);

  // Load WASM lib.
  const tssLib = await loadLib();

  // initialize client.
  const client = new Client(session, clientIndex, partyIndexes, endpoints, sockets, share, pubKey, true, tssLib);
  client.log = log;
  // initiate precompute
  client.precompute({ signatures, server_coeffs: serverCoeffs, _transport: 1 });
  await client.ready();

  // initiate signature.
  const signature = await client.sign(msgHash.toString("base64"), true, msg, "keccak256", { signatures });

  const hexToDecimal = (x: Buffer) => ec.keyFromPrivate(x).getPrivate().toString(10);
  const pubk = ec.recoverPubKey(hexToDecimal(msgHash), signature, signature.recoveryParam, "hex");

  client.log(`pubkey, ${JSON.stringify(pubKey)}`);
  client.log(`msgHash: 0x${msgHash.toString("hex")}`);
  client.log(`signature: 0x${signature.r.toString(16, 64)}${signature.s.toString(16, 64)}${new BN(27 + signature.recoveryParam).toString(16)}`);
  client.log(`address: 0x${Buffer.from(privateToAddress(privKey.toArrayLike(Buffer, "be", 32))).toString("hex")}`);
  const passed = ec.verify(msgHash, signature, pubk);

  client.log(`passed: ${passed}`);
  client.log(`precompute time: ${client._endPrecomputeTime - client._startPrecomputeTime}`);
  client.log(`signing time: ${client._endSignTime - client._startSignTime}`);
  await client.cleanup({ signatures });
  client.log("client cleaned up");
};

export const runLocalServerTest = async()=>{
  try {
    // for (let i = 0; i < 20; i++) {
    await runPreNonceTest();
    await runPostNonceTest();
    // }
    console.log("test succeeded");
    document.title = "Test succeeded";
  } catch (error) {
    console.log("test failed", error);
    document.title = "Test failed";
  }
};

runLocalServerTest();