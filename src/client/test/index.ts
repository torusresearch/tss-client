import axios from "axios";
import BN from "bn.js";
import eccrypto from "eccrypto";
import EC from "elliptic";
import keccak256 from "keccak256";
import * as tssLib from "tss-lib";

import methods from "../../shared/methods";
import Round from "../../shared/rounds";
import { localStorageDB } from "../db";
import { TssSign } from "../sign";
import { work } from "../worker";

const round = new Round(work);

// eslint-disable-next-line new-cap
const ec = new EC.ec("secp256k1");
const { setShare } = methods(round);

// let onlinephasestart = process.hrtime();

const base_port = 8000;
const base_ws_port = 18000;
const endpoint_prefix = "http://localhost:";
const ws_prefix = "ws://localhost:";
const msg = "hello world";
const msgHash = keccak256(msg);
const tag = `test${Date.now()}`;
const parties = [];
const endpoints = [];
const wsEndpoints = [];
const useClient = true;

const n = 1; // process.argv[2] ? parseInt(process.argv[2]) : 2;

// generate parties and endpoints
for (let i = 1; i <= n; i++) {
  parties.push(i);
  endpoints.push(`${endpoint_prefix}${base_port + i}`);
  wsEndpoints.push(`${ws_prefix}${base_ws_port + i}`);
}

const privKey = new BN(eccrypto.generatePrivate());

const setupCode = async () => {
  // generate n-out-of-n key sharing
  const shares = [];
  let shareSum = new BN(0);
  for (let i = 0; i < (useClient ? n : n - 1); i++) {
    const share = new BN(eccrypto.generatePrivate());
    shares.push(share);
    shareSum = shareSum.add(share);
  }

  const finalShare = privKey.sub(shareSum.umod(ec.curve.n)).umod(ec.curve.n);
  shares.push(finalShare);
  const reduced = shares.reduce((acc, share) => acc.add(share).umod(ec.curve.n), new BN(0));

  if (reduced.toString(16) !== privKey.toString(16)) {
    throw new Error("shares dont sum up to private key");
  }

  console.log("generating shares");
  const waiting = [];
  for (let i = 0; i < (useClient ? n + 1 : n); i++) {
    const share = shares[i];
    if (i === n) {
      // useClient is true
      waiting.push(setShare(localStorageDB, tag, share.toString(16)));
      continue;
    }
    waiting.push(
      axios
        .post(`${endpoints[i]}/share`, {
          tag,
          share: share.toString(16),
        })
        .then((res) => res.data)
    );
  }
  await Promise.all(waiting);
};

(async () => {
  const timer = `${endpoint_prefix}${base_port + 1}`;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (tssLib as any).default();
    await setupCode();

    const tssSign = new TssSign({ numberOfNodes: n, endpoints, wsEndpoints });

    await tssSign.init(privKey, tag);

    const sig = await tssSign.sign(msgHash);

    const hexToDecimal = (x) => ec.keyFromPrivate(x, "hex").getPrivate().toString(10);
    const r = new BN(sig.r.scalar);
    const s = new BN(sig.s.scalar);
    const signature = { r, s, recoveryParam: sig.recid };
    const pubk = ec.recoverPubKey(hexToDecimal(msgHash), signature, signature.recoveryParam, "hex");

    const passed = ec.verify(msgHash, signature, pubk);

    console.log("passed: ", passed);

    // console.log(`Time taken for offline phase: ${(Date.now() - now - online_phase) / 1e3} seconds`);
  } catch (e) {
    console.error(e);
  }
  console.log(await axios.post(`${timer}/get_timer`, {}));
})();
