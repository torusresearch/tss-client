var EC = require("elliptic").ec;
var ec = new EC("secp256k1");
var keccak256 = require("keccak256");
var eccrypto = require("eccrypto");
var axios = require("axios");
var BN = require("bn.js");
const { assert } = require("elliptic/lib/elliptic/utils");

let onlinephasestart = process.hrtime();

var base_port = 8000;
var endpoint_prefix = "http://localhost:";
var msg = "hello world";
var msgHash = keccak256(msg);
var user = "test";
var parties = [1,2,3,4,5,6];
var endpoints = parties
  .map((party) => `${endpoint_prefix}${base_port + parseInt(party)}`)
const delay = 150

var privKey = new BN(eccrypto.generatePrivate());

// generate 6-out-of-6 key sharing
var shares = [];
var shareSum = new BN(0);
for (let i = 0; i < 5; i++) {
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
    // write shares to each node
    await new Promise((resolve) => setTimeout(resolve, delay));
    var awaiting = [];
    for (let i = 0; i < 6; i++) {
      let share = shares[i];
      let endpoint = `${endpoint_prefix}${base_port + i + 1}`;
      awaiting.push(
        axios
          .post(`${endpoint}/share`, {
            user,
            share: share.toString(16),
          })
          .then((res) => res.data)
      );
    }
    var gwis = await Promise.all(awaiting);
    // console.log("gwis", gwis)

    // get node h1h2ntilde
    await new Promise((resolve) => setTimeout(resolve, delay));
    awaiting = [];
    for (let i = 1; i <= 6; i++) {
      let endpoint = `${endpoint_prefix}${base_port + i}`;
      awaiting.push(
        axios.get(`${endpoint}/get_h1h2Ntilde`).then((res) => res.data)
      );
    }
    var h1h2Ntildes = await Promise.all(awaiting);
    // console.log("h1h2ntildes", h1h2Ntildes)

    // get node paillier eks
    await new Promise((resolve) => setTimeout(resolve, delay));
    awaiting = [];
    for (let i = 1; i <= 6; i++) {
      let endpoint = `${endpoint_prefix}${base_port + i}`;
      awaiting.push(
        axios.get(`${endpoint}/get_paillier_ek`).then((res) => res.data)
      );
    }
    var eks = await Promise.all(awaiting);
    // console.log("eks", eks)

    // publish pub key
    await new Promise((resolve) => setTimeout(resolve, delay));
    awaiting = [];
    var pubkey = ec.curve.g.mul(privKey);
    for (let i = 1; i <= 6; i++) {
      let endpoint = `${endpoint_prefix}${base_port + i}`;
      awaiting.push(
        axios.post(`${endpoint}/pubkey/${user}`, {
          X: pubkey.x.toString("hex"),
          Y: pubkey.y.toString("hex"),
        })
      );
    }
    await Promise.all(awaiting);

    // round 1
    await new Promise((resolve) => setTimeout(resolve, delay));
    awaiting = [];
    for (let i = 1; i <= 6; i++) {
      let endpoint = `${endpoint_prefix}${base_port + i}`;
      awaiting.push(
        axios.post(`${endpoint}/round_1`, {
          index: i,
          user,
          parties,
          endpoints,
        })
      );
    }
    await Promise.all(awaiting);


    // round 2 MessageA
    await new Promise((resolve) => setTimeout(resolve, delay));
    awaiting = [];
    for (let i = 1; i <= 6; i++) {
      let endpoint = `${endpoint_prefix}${base_port + i}`;
      awaiting.push(
        axios.post(`${endpoint}/round_2_MessageA`, {
          index: i,
          user,
          parties,
          endpoints,
          h1h2Ntildes,
        })
      );
    }
    await Promise.all(awaiting);

    // round 2 MessageBs
    await new Promise((resolve) => setTimeout(resolve, delay));
    awaiting = [];

    console.log("ENDPOINTS", endpoints);
    for (let i = 1; i <= 6; i++) {
      let endpoint = `${endpoint_prefix}${base_port + i}`;
      awaiting.push(
        axios.post(`${endpoint}/round_2_MessageBs`, {
          index: i,
          user,
          parties,
          endpoints,
          h1h2Ntildes,
          eks,
        })
      );
    }
    await Promise.all(awaiting);

    // round 2 Alphas
    await new Promise((resolve) => setTimeout(resolve, delay));
    awaiting = [];
    for (let i = 1; i <= 6; i++) {
      let endpoint = `${endpoint_prefix}${base_port + i}`;
      awaiting.push(
        axios.post(`${endpoint}/round_2_Alphas`, {
          index: i,
          user,
          parties,
          endpoints,
          gwis
        })
      );
    }
    await Promise.all(awaiting);

    // round 3 DeltaInv
    await new Promise((resolve) => setTimeout(resolve, delay));
    awaiting = [];
    for (let i = 1; i <= 6; i++) {
      let endpoint = `${endpoint_prefix}${base_port + i}`;
      awaiting.push(
        axios.post(`${endpoint}/round_3_DeltaInv`, {
          index: i,
          user,
          parties,
          endpoints,
        })
      );
    }
    await Promise.all(awaiting);

    // round 3 Ti
    // await new Promise((resolve) => setTimeout(resolve, delay));
    // awaiting = [];
    // for (let i = 1; i <= 6; i++) {
    //   let endpoint = `${endpoint_prefix}${base_port + i}`;
    //   awaiting.push(
    //     axios.post(`${endpoint}/round_3_Ti`, {
    //       index: i,
    //       u: user,
    //       parties,
    //       endpoints,
    //     })
    //   );
    // }
    // await Promise.all(awaiting);

    // round 3 Ti_verify
    // await new Promise((resolve) => setTimeout(resolve, delay));
    // awaiting = [];
    // for (let i = 1; i <= 6; i++) {
    //   let endpoint = `${endpoint_prefix}${base_port + i}`;
    //   awaiting.push(
    //     axios.post(`${endpoint}/round_3_Ti_verify`, {
    //       index: i,
    //       u: user,
    //       parties,
    //       endpoints,
    //     })
    //   );
    // }
    // await Promise.all(awaiting);

    // round 4 Di
    await new Promise((resolve) => setTimeout(resolve, delay));
    awaiting = [];
    for (let i = 1; i <= 6; i++) {
      let endpoint = `${endpoint_prefix}${base_port + i}`;
      awaiting.push(
        axios.post(`${endpoint}/round_4_Di`, {
          index: i,
          user,
          parties,
          endpoints,
        })
      );
    }
    await Promise.all(awaiting);

    // round 4 Di_verify
    await new Promise((resolve) => setTimeout(resolve, delay));
    awaiting = [];
    for (let i = 1; i <= 6; i++) {
      let endpoint = `${endpoint_prefix}${base_port + i}`;
      awaiting.push(
        axios.post(`${endpoint}/round_4_Di_verify`, {
          index: i,
          user,
          parties,
          endpoints,
        })
      );
    }
    await Promise.all(awaiting);

    // round 5 Rki
    await new Promise((resolve) => setTimeout(resolve, delay));
    awaiting = [];
    for (let i = 1; i <= 6; i++) {
      let endpoint = `${endpoint_prefix}${base_port + i}`;
      awaiting.push(
        axios.post(`${endpoint}/round_5_Rki`, {
          index: i,
          user,
          parties,
          endpoints,
          h1h2Ntildes,
        })
      );
    }
    await Promise.all(awaiting);

    // round 5 verify
    await new Promise((resolve) => setTimeout(resolve, delay));
    awaiting = [];
    for (let i = 1; i <= 6; i++) {
      let endpoint = `${endpoint_prefix}${base_port + i}`;
      awaiting.push(
        axios.post(`${endpoint}/round_5_verify`, {
          index: i,
          user,
          parties,
          endpoints,
          eks,
        })
      );
    }
    await Promise.all(awaiting);

    // round 6 Rsigmai
    await new Promise((resolve) => setTimeout(resolve, delay));
    awaiting = [];
    for (let i = 1; i <= 6; i++) {
      let endpoint = `${endpoint_prefix}${base_port + i}`;
      awaiting.push(
        axios.post(`${endpoint}/round_6_Rsigmai`, {
          index: i,
          user,
          parties,
          endpoints,
        })
      );
    }
    await Promise.all(awaiting);

    // round 6 verify
    await new Promise((resolve) => setTimeout(resolve, delay));
    awaiting = [];
    for (let i = 1; i <= 6; i++) {
      let endpoint = `${endpoint_prefix}${base_port + i}`;
      awaiting.push(
        axios.post(`${endpoint}/round_6_verify`, {
          index: i,
          user,
          parties,
          endpoints,
        })
      );
    }
    await Promise.all(awaiting);

    let onlinephaseend = process.hrtime(onlinephasestart);

    console.log(
      `Time taken for online phase: ${
        (onlinephaseend[0] * 1e9 + onlinephaseend[1]) / 1e9
      } seconds`
    );

    let offlinephasestart = process.hrtime();

    // round 7
    var partialSigs = [];
    for (let i = 1; i <= 6; i++) {
      let endpoint = `${endpoint_prefix}${base_port + i}`;
      let resp = await axios.post(`${endpoint}/round_7`, {
        index: i,
        user,
        msg_hash: new BN(msgHash).toString("hex"),
        parties,
        endpoints,
      });

      partialSigs.push(resp.data);
    }

    // get signature

    let endpoint = `${endpoint_prefix}${base_port + 1}`;
    var resp = await axios.post(
      `${endpoint}/get_signature?u=${user}`,
      partialSigs
    );
    var sig = resp.data;

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
    let offlinephaseend = process.hrtime(offlinephasestart);

    console.log(
      `Time taken for offline phase: ${
        (offlinephaseend[0] * 1e9 + offlinephaseend[1]) / 1e9
      } seconds`
    );
  } catch (e) {
    console.error(e);
  }
})();
