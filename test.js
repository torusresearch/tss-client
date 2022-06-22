var EC = require("elliptic").ec;
var ec = new EC("secp256k1");
var keccak256 = require("keccak256");
var eccrypto = require("eccrypto");
var axios = require("axios");
var BN = require("bn.js");
const { assert } = require("elliptic/lib/elliptic/utils");

const { io } = require("socket.io-client");

// let onlinephasestart = process.hrtime();

var base_port = 8000;
var base_ws_port = 18000;
var endpoint_prefix = "http://localhost:";
var ws_prefix = "ws://localhost:";
var msg = "hello world";
var msgHash = keccak256(msg);
var tag = "test" + Date.now();
var parties = [];
let endpoints = [];
let wsEndpoints = [];

let n = process.argv[2] ? parseInt(process.argv[2]) : 6

// generate parties and endpoints
for (let i = 1; i <= n; i++) {
  parties.push(i);
  endpoints.push(`${endpoint_prefix}${base_port + i}`);
  wsEndpoints.push(`${ws_prefix}${base_ws_port + i}`);
}

let wsConnecting = [];
let onlinePhaseComplete = Promise.all(
  wsEndpoints.map((wsEndpoint) => {
    const socket = io(wsEndpoint);
    wsConnecting.push(
      new Promise((resolve) => {
        socket.on("connect", () => {
          resolve(socket.id);
        });
      })
    );
    return new Promise((resolve) => {
      socket.on("notify", resolve);
    });
  })
);

var privKey = new BN(eccrypto.generatePrivate());

// generate 6-out-of-6 key sharing
var shares = [];
var shareSum = new BN(0);
for (let i = 0; i < n - 1; i++) {
  let share = new BN(eccrypto.generatePrivate());
  shares.push(share);
  shareSum = shareSum.add(share);
}
var finalShare = privKey.sub(shareSum.umod(ec.curve.n)).umod(ec.curve.n);
shares.push(finalShare);
var reduced = shares.reduce(
  (acc, share) => acc.add(share).umod(ec.curve.n),
  new BN(0)
);
assert.equal(reduced.toString(16), privKey.toString(16));
(async () => {
  try {
    let wsIds = await Promise.all(wsConnecting);
    let now = Date.now();

    // get public params
    console.log("getting public params", Date.now() - now);
    awaiting = [];
    let publicParams = await Promise.all(
      endpoints.map((endpoint) => {
        return axios
          .get(`${endpoint}/get_public_params`)
          .then((res) => res.data);
      })
    );

    // write shares to each node
    console.log("generating shares", Date.now() - now);
    var awaiting = [];
    for (let i = 0; i < n; i++) {
      let share = shares[i];
      awaiting.push(
        axios
          .post(`${endpoints[i]}/share`, {
            tag,
            share: share.toString(16),
          })
          .then((res) => res.data)
      );
    }
    await Promise.all(awaiting);

    // get share commitments
    console.log("getting gwis", Date.now() - now);
    let gwis = await Promise.all(
      endpoints.map((endpoint) =>
        axios
          .get(`${endpoint}/gwi/${tag}`)
          .then((res) => res.data)
          .then((obj) => obj.commitment)
      )
    );

    // publish tag info to each node
    console.log("publish tag info", Date.now() - now);
    awaiting = [];
    var pubkey = ec.curve.g.mul(privKey);
    for (let i = 0; i < n; i++) {
      let endpoint = endpoints[i];
      awaiting.push(
        axios.post(`${endpoint}/set_tag_info/${tag}`, {
          pubkey: {
            X: pubkey.x.toString("hex"),
            Y: pubkey.y.toString("hex"),
          },
          endpoints,
          parties,
          gwis,
          eks: publicParams.map((publicParam) => publicParam.ek),
          h1h2Ntildes: publicParams.map(
            (publicParam) => publicParam.h1h2Ntilde
          ),
        })
      );
    }
    await Promise.all(awaiting);

    console.log("WSIDS", wsIds);

    await Promise.all(
      endpoints.map((endpoint, index) => {
        axios.post(`${endpoint}/subscribeReady`, {
          tag,
          websocketId: wsIds[index],
        });
      })
    );

    // round 1
    console.log("start", Date.now() - now);
    await Promise.all(
      endpoints.map((endpoint) =>
        axios.post(`${endpoint}/start`, {
          tag,
        })
      )
    );

    await onlinePhaseComplete;

    let online_phase = Date.now() - now;
    console.log(`Time taken for online phase: ${online_phase / 1e3} seconds`);

    // round 7
    console.log("sign");
    let s_is = await Promise.all(
      endpoints.map((endpoint) =>
        axios
          .post(`${endpoint}/sign`, {
            tag,
            msg_hash: new BN(msgHash).toString("hex"),
          })
          .then((res) => res.data)
          .then((obj) => obj.s_i)
      )
    );

    // get signature
    let endpoint = `${endpoint_prefix}${base_port + 1}`;
    var resp = await axios.post(`${endpoint}/get_signature`, {
      s_is,
      tag,
      msg_hash: new BN(msgHash).toString("hex"),
    });
    var sig = JSON.parse(resp.data.sig);

    let hexToDecimal = (x) =>
      ec.keyFromPrivate(x, "hex").getPrivate().toString(10);
    var r = new BN(sig.r.scalar);
    var s = new BN(sig.s.scalar);
    var signature = { r, s, recoveryParam: sig.recid };
    var pubk = ec.recoverPubKey(
      hexToDecimal(msgHash),
      signature,
      signature.recoveryParam,
      "hex"
    );

    let passed = ec.verify(msgHash, signature, pubk);

    console.log("passed: ", passed);

    console.log(
      `Time taken for offline phase: ${
        (Date.now() - now - online_phase) / 1e3
      } seconds`
    );

    // let offlinephaseend = process.hrtime(offlinephasestart);

    // console.log(
    //   `Time taken for offline phase: ${
    //     (offlinephaseend[0] * 1e9 + offlinephaseend[1]) / 1e9
    //   } seconds`
    // );
  } catch (e) {
    console.error(e);
  }
})();
