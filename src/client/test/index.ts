import axios from "axios";
import BN from "bn.js";
import eccrypto from "eccrypto";
import EC from "elliptic";
import keccak256 from "keccak256";
import { io, Socket } from "socket.io-client";
import * as tss from "tss-lib";

import { Client } from "../client";
import { localStorageDB } from "../db";

// eslint-disable-next-line new-cap
const ec = new EC.ec("secp256k1");

// CONSTANTS
const base_port = 8000;
const base_ws_port = 18000;
const endpoint_prefix = "http://localhost:";
const ws_prefix = "ws://localhost:";
const msg = "hello world";
const msgHash = keccak256(msg);
const session = `test${Date.now()}`;
const tssImportUrl = "/mpecdsa_bg.wasm";
const servers = 1; // process.argv[2] ? parseInt(process.argv[2]) : 2;

const getLagrangeCoeff = (parties, party): BN => {
  const partyIndex = new BN(party + 1);
  let upper = new BN(1);
  let lower = new BN(1);
  for (let i = 0; i < parties.length; i += 1) {
    const otherParty = parties[i];
    const otherPartyIndex = new BN(parties[i] + 1);
    if (party !== otherParty) {
      console.log(party, otherParty, i);
      upper = upper.mul(otherPartyIndex.neg());
      upper = upper.umod(ec.curve.n);
      let temp = partyIndex.sub(otherPartyIndex);
      temp = temp.umod(ec.curve.n);
      lower = lower.mul(temp).umod(ec.curve.n);
    }
  }

  const delta = upper.mul(lower.invm(ec.curve.n)).umod(ec.curve.n);
  console.log(delta.toString(16));
  return delta;
};

// (async () => {
//   const parties = [0, 1];
//   let shares = [
//     new BN(Buffer.from("4cadd4abcdd91857e3c3e5e6073bd52f3b536fccb9b807dd227b67999456d133", "hex")),
//     new BN(Buffer.from("e300d528d17abf8cd0b023e04ab83f6c213c6b454821c64404049409ed0bf307", "hex")),
//   ];
//   shares = shares.map((share, party) => {
//     return share.mul(getLagrangeCoeff(parties, party)).umod(ec.curve.n);
//   });
//   let sumShares = new BN(0);
//   shares.map((share) => {
//     sumShares = sumShares.add(share).umod(ec.curve.n);
//   });
//   const pubkey = ec.curve.g.mul(sumShares);
//   const x = pubkey.getX().toString(16, 64);
//   const y = pubkey.getY().toString(16, 64);
//   const pubkeyHex = `${x}${y}`;
//   const pubKeyb64 = Buffer.from(pubkeyHex, "hex").toString("base64");
//   console.log("pubkey64", pubKeyb64);
// })();

// generate n-out-of-n key sharing
const distributeShares = async (privKey, parties, endpoints) => {
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
  } else {
    console.log("additive shares add up to private key");
  }

  // denormalise shares
  const shares = additiveShares.map((additiveShare, party) => {
    return additiveShare.mul(getLagrangeCoeff(parties, party).invm(ec.curve.n)).umod(ec.curve.n);
  });

  console.log(
    "shares",
    shares.map((s) => s.toString(16, 64))
  );
  shares.map((share) => console.log(Buffer.from(share.toString(16, 64), "hex").toString("base64")));

  const waiting = [];
  for (let i = 0; i < parties.length; i++) {
    const share = shares[i];
    if (i === parties.length - 1) {
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

(async () => {
  const parties: number[] = [];
  const endpoints = [];
  const tssWSEndpoints = [];
  // try {
  // generate parties and endpoints

  // generate endpoints for servers
  for (let i = 0; i < servers; i++) {
    parties.push(i);
    endpoints.push(`${endpoint_prefix}${base_port + i + 1}`);
    tssWSEndpoints.push(`${ws_prefix}${base_ws_port + i + 1}`);
  }

  // generate for local
  parties.push(servers);
  endpoints.push(null);
  tssWSEndpoints.push(null);

  // generate private key and public key
  const privKey = new BN(eccrypto.generatePrivate());
  const pubKeyElliptic = ec.curve.g.mul(privKey);
  const pubKeyX = pubKeyElliptic.getX().toString(16, 64);
  const pubKeyY = pubKeyElliptic.getY().toString(16, 64);
  const pubKeyHex = `${pubKeyX}${pubKeyY}`;
  const pubKey = Buffer.from(pubKeyHex, "hex").toString("base64");

  console.log("pubkey", pubKey);

  // distribute shares to servers and local device
  await distributeShares(privKey, parties, endpoints);

  // create websockets
  const sockets = await createSockets(tssWSEndpoints);

  await new Promise((r) => setTimeout(r, 1000));

  // load tss library;
  await tss.default(tssImportUrl);

  const share = await localStorageDB.get(`session-${session}:share`);
  const client = new Client(session, servers, parties, endpoints, sockets, share, pubKey);

  client.precompute(tss);
  await client.ready();
  const sig = client.sign(tss, msgHash.toString("base64"), true);
  console.log("sig ", sig);

  const sigHex = Buffer.from(sig, "base64").toString("hex");
  const r = new BN(sigHex.slice(0, 64), 16);
  const s = new BN(sigHex.slice(64), 16);
  const signature = { r, s, recoveryParam: 0 };
  console.log("what is r", r);

  const hexToDecimal = (x) => ec.keyFromPrivate(x, "hex").getPrivate().toString(10);
  const pubk = ec.recoverPubKey(hexToDecimal(msgHash), signature, signature.recoveryParam, "hex");

  const passed = ec.verify(msgHash, signature, pubk);

  console.log("passed: ", passed);

  // console.log(`Time taken for offline phase: ${(Date.now() - now - online_phase) / 1e3} seconds`);
  // } catch (e) {
  //   console.error(e);
  // }
})();
