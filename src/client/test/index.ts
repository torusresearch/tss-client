import axios from "axios";
import BN from "bn.js";
import eccrypto from "eccrypto";
import EC from "elliptic";
import { privateToAddress } from "ethereumjs-utils";
import keccak256 from "keccak256";
import { io, Socket } from "socket.io-client";
import * as tss from "tss-lib";

import { Client } from "../client";
import { localStorageDB } from "../db";

(window as any).BN = BN;
(window as any).Buffer = Buffer;

// eslint-disable-next-line new-cap
const ec = new EC.ec("secp256k1");
const log = function (...args) {
  let msg = "";
  args.map((arg) => {
    msg += JSON.stringify(arg);
    msg += " ";
  });
  const ul = (window as any).document.getElementById("output");
  const li = document.createElement("li");
  li.appendChild(document.createTextNode(msg));
  ul.appendChild(li);
};

// CONSTANTS
const base_port = 8000;
// const endpoint_prefix = "http://localhost:";
// const ws_prefix = "ws://localhost:";
const msg = "hello world";
const msgHash = keccak256(msg);
const session = `test${Date.now()}`;
const tssImportUrl = "/mpecdsa_bg.wasm";

const getLagrangeCoeff = (parties, party): BN => {
  const partyIndex = new BN(party + 1);
  let upper = new BN(1);
  let lower = new BN(1);
  for (let i = 0; i < parties.length; i += 1) {
    const otherParty = parties[i];
    const otherPartyIndex = new BN(parties[i] + 1);
    if (party !== otherParty) {
      upper = upper.mul(otherPartyIndex.neg());
      upper = upper.umod(ec.curve.n);
      let temp = partyIndex.sub(otherPartyIndex);
      temp = temp.umod(ec.curve.n);
      lower = lower.mul(temp).umod(ec.curve.n);
    }
  }

  const delta = upper.mul(lower.invm(ec.curve.n)).umod(ec.curve.n);
  return delta;
};

// generate n-out-of-n key sharing
const distributeShares = async (privKey, parties, endpoints, localClientIndex) => {
  const additiveShares = [];
  let shareSum = new BN(0);
  for (let i = 0; i < parties.length - 1; i++) {
    const share = new BN(eccrypto.generatePrivate());
    additiveShares.push(share);
    shareSum = shareSum.add(share);
  }

  const finalShare = privKey.sub(shareSum.umod(ec.curve.n)).umod(ec.curve.n);
  additiveShares.push(finalShare);
  const reduced = additiveShares.reduce((acc, share) => acc.add(share).umod(ec.curve.n), new BN(0));

  if (reduced.toString(16) !== privKey.toString(16)) {
    throw new Error("additive shares dont sum up to private key");
  }

  // denormalise shares
  const shares = additiveShares.map((additiveShare, party) => {
    return additiveShare.mul(getLagrangeCoeff(parties, party).invm(ec.curve.n)).umod(ec.curve.n);
  });

  console.log(
    "shares",
    shares.map((s) => s.toString(16, 64))
  );

  const waiting = [];
  for (let i = 0; i < parties.length; i++) {
    const share = shares[i];
    if (i === localClientIndex) {
      waiting.push(localStorageDB.set(`session-${session}:share`, Buffer.from(share.toString(16, 64), "hex").toString("base64")));
      continue;
    }
    waiting.push(
      axios
        .post(`${endpoints[i]}/share`, {
          session,
          share: Buffer.from(share.toString(16, 64), "hex").toString("base64"),
        })
        .then((res) => res.data)
    );
  }
  await Promise.all(waiting);
};

const createSockets = async (wsEndpoints): Promise<Socket[]> => {
  return wsEndpoints.map((wsEndpoint) => {
    if (wsEndpoint === null || wsEndpoint === undefined) {
      return null;
    }
    return io(wsEndpoint);
  });
};

const tssTest = async () => {
  // const parties = [0, 1];
  // const endpoints = ["http://mpecdsa-sg-1.web3auth.io", null];
  // const tssWSEndpoints = ["http://mpecdsa-sg-1.web3auth.io", null];

  const servers = parseInt((document.getElementById("servers") as any).value);
  const clientIndex = servers; // Note: parties with higher index tend to read more data than they send, which is good
  const websocketOnly = (document.getElementById("websocket-send") as any).value === "y";

  const parties: number[] = [];
  const endpoints = [];
  const tssWSEndpoints = [];
  // try {
  // generate parties and endpoints

  // generate for local

  const region = (document.getElementById("region") as any).value;

  // generate endpoints for servers
  let serverPortOffset = 1;
  for (let i = 0; i < servers + 1; i++) {
    parties.push(i);
    if (i === clientIndex) {
      endpoints.push(null);
      tssWSEndpoints.push(null);
    } else if (region !== "localhost") {
      endpoints.push(`http://mpecdsa-${region}-${serverPortOffset}.web3auth.io`);
      tssWSEndpoints.push(`http://mpecdsa-${region}-${serverPortOffset}.web3auth.io`);
      serverPortOffset++;
    } else {
      endpoints.push(`http://localhost:${base_port + serverPortOffset}`);
      tssWSEndpoints.push(`http://localhost:${base_port + serverPortOffset}`);
      serverPortOffset++;
    }
  }

  // generate private key and public key
  const privKey = new BN(eccrypto.generatePrivate());
  (window as any).privKey = privKey;
  const pubKeyElliptic = ec.curve.g.mul(privKey);
  const pubKeyX = pubKeyElliptic.getX().toString(16, 64);
  const pubKeyY = pubKeyElliptic.getY().toString(16, 64);
  const pubKeyHex = `${pubKeyX}${pubKeyY}`;
  const pubKey = Buffer.from(pubKeyHex, "hex").toString("base64");

  // distribute shares to servers and local device
  await distributeShares(privKey, parties, endpoints, clientIndex);

  // create websockets
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

  // load tss library;
  await tss.default(tssImportUrl);

  const share = await localStorageDB.get(`session-${session}:share`);
  const client = new Client(session, clientIndex, parties, endpoints, sockets, share, pubKey, websocketOnly, tssImportUrl);
  client.log = log;
  (window as any).client = client;

  global.startTime = Date.now();

  client.precompute(tss);
  await client.ready();
  const signature = client.sign(tss, msgHash.toString("base64"), true);

  const hexToDecimal = (x) => ec.keyFromPrivate(x, "hex").getPrivate().toString(10);
  const pubk = ec.recoverPubKey(hexToDecimal(msgHash), signature, signature.recoveryParam, "hex");

  client.log(`pubkey, ${JSON.stringify(pubKey)}`);
  client.log(`msgHash: 0x${msgHash.toString("hex")}`);
  client.log(`signature: 0x${signature.r.toString(16, 64)}${signature.s.toString(16, 64)}${new BN(27 + signature.recoveryParam).toString(16)}`);
  client.log(`address: 0x${Buffer.from(privateToAddress(privKey)).toString("hex")}`);
  const passed = ec.verify(msgHash, signature, pubk);

  client.log(`passed: ${passed}`);
  client.log(`precompute time: ${client._endPrecomputeTime - client._startPrecomputeTime}`);
  client.log(`signing time: ${client._endSignTime - client._startSignTime}`);
  (window as any).document.getElementById("run").setAttribute("disabled", true);
};

(window as any).tssTest = tssTest;
