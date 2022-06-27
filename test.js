var EC = require("elliptic").ec;
var ec = new EC("secp256k1");
var keccak256 = require("keccak256");
var eccrypto = require("eccrypto");
var axios = require("axios");
var BN = require("bn.js");

const { io } = require("socket.io-client");
const { Client, localStorageDB } = require("./client");
const {
  setShare,
  getGwi,
  setTagInfo,
  generateNodeInfo,
  getPublicParams,
} = require("./methods");
const { getTagInfo } = require("./rounds");

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
let sockets = [];
const useClient = true;
let client;

let n = process.argv[2] ? parseInt(process.argv[2]) : 6;

// generate parties and endpoints
for (let i = 1; i <= n; i++) {
  parties.push(i);
  endpoints.push(`${endpoint_prefix}${base_port + i}`);
  wsEndpoints.push(`${ws_prefix}${base_ws_port + i}`);
}

let wsConnecting = [];

// initialize websocket connections, store sockets, setup notify
let onlinePhaseCompleteForServers = Promise.all(
  wsEndpoints.map((wsEndpoint) => {
    const socket = io(wsEndpoint);
    sockets.push(socket);
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

// generate n-out-of-n key sharing
var shares = [];
var shareSum = new BN(0);
for (let i = 0; i < (useClient ? n : n - 1); i++) {
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

if (reduced.toString(16) !== privKey.toString(16)) {
  throw new Error("shares dont sum up to private key")
};
(async () => {
  try {
    let wsIds = await Promise.all(wsConnecting);
    let now = Date.now();

    if (useClient) {
      await generateNodeInfo(localStorageDB, "client", n + 1);
      let partiesAndClient = parties.slice();
      partiesAndClient.push(parties[parties.length - 1] + 1);
      client = new Client(n + 1, partiesAndClient, sockets);
      client.registerTag(tag)
    }

    // get public params
    console.log("getting public params", Date.now() - now);
    awaiting = [];
    let publicParamsAwaiting = endpoints.map((endpoint) => {
      return axios.get(`${endpoint}/get_public_params`).then((res) => res.data);
    });
    if (useClient) {
      publicParamsAwaiting.push(getPublicParams(localStorageDB, "client"));
    }
    let publicParams = await Promise.all(publicParamsAwaiting);

    // write shares to each node
    console.log("generating shares", Date.now() - now);
    var awaiting = [];
    for (let i = 0; i < (useClient ? n + 1 : n); i++) {
      let share = shares[i];
      if (i == n) {
        // useClient is true
        await setShare(localStorageDB, tag, share.toString(16));
        continue;
      }
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
    let gwisAwaiting = endpoints.map((endpoint) =>
      axios
        .get(`${endpoint}/gwi/${tag}`)
        .then((res) => res.data)
        .then((obj) => obj.commitment)
    );
    if (useClient) {
      gwisAwaiting.push(getGwi(localStorageDB, tag));
    }
    let gwis = await Promise.all(gwisAwaiting);

    // publish tag info to each node
    console.log("publish tag info", Date.now() - now);
    awaiting = [];
    var pubkey = ec.curve.g.mul(privKey);
    for (let i = 0; i < n; i++) {
      let endpoint = endpoints[i];
      let customEndpoints = endpoints.slice();
      let partiesAndClient = parties.slice();
      if (useClient) {
        customEndpoints.push(`websocket:${wsIds[i]}`);
        partiesAndClient.push(parties[parties.length - 1] + 1);
      }

      awaiting.push(
        axios.post(`${endpoint}/set_tag_info/${tag}`, {
          pubkey: {
            X: pubkey.x.toString("hex"),
            Y: pubkey.y.toString("hex"),
          },
          endpoints: customEndpoints,
          parties: partiesAndClient,
          gwis,
          eks: publicParams.map((publicParam) => publicParam.ek),
          h1h2Ntildes: publicParams.map(
            (publicParam) => publicParam.h1h2Ntilde
          ),
        })
      );
    }
    if (useClient) {
      // awaiting.push(async () => {
      let customEndpoints = endpoints.slice();
      customEndpoints.push("websocket:?");
      let partiesAndClient = parties.slice();
      partiesAndClient.push(parties[parties.length - 1] + 1);
      await setTagInfo(
        localStorageDB,
        "client",
        tag,
        {
          X: pubkey.x.toString("hex"),
          Y: pubkey.y.toString("hex"),
        },
        customEndpoints,
        partiesAndClient,
        gwis,
        publicParams.map((publicParam) => publicParam.ek),
        publicParams.map((publicParam) => publicParam.h1h2Ntilde)
      );
      // });
    }

    await Promise.all(awaiting);

    // subscribe to when online phase is complete and servers are ready to sign
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
    if (useClient) {
      await client.start(tag);
    }
    await Promise.all(
      endpoints.map((endpoint) =>
        axios.post(`${endpoint}/start`, {
          tag,
        })
      )
    );

    await onlinePhaseCompleteForServers;
    if (useClient) {
      await client.ready[tag];
    }

    let online_phase = Date.now() - now;
    console.log(`Time taken for online phase: ${online_phase / 1e3} seconds`);

    // round 7
    console.log("sign");
    let s_is_awaiting = endpoints.map((endpoint) =>
      axios
        .post(`${endpoint}/sign`, {
          tag,
          msg_hash: new BN(msgHash).toString("hex"),
        })
        .then((res) => res.data)
        .then((obj) => obj.s_i)
    );
    if (useClient) {
      s_is_awaiting.push(client.sign(new BN(msgHash).toString("hex"), tag).then(obj => obj.s_i))
    }
    let s_is = await Promise.all(s_is_awaiting)

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
