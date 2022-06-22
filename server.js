const axios = require("axios");
const express = require("express");
const app = express();
app.use(express.json());
app.use(express.static("public"));
const port = process.argv[2];
const wsPort = process.argv[3];
const nodeKey = port;
if (!port) {
  throw new Error("port not specified");
}
const { getTagInfo, roundRunner, getRound } = require("./rounds");
const {
  generateNodeInfo,
  setShare,
  getGwi,
  getPublicParams,
  setTagInfo,
  tssSign,
  getSignature,
} = require("./methods");
const { get_signature } = require("tss-lib");

const db = require("./mem_db")(`${port}`);
const { wsSend, wsBroadcast } = require("./socket.js")(wsPort);
const { serverBroadcast, serverSend } = require("./comm")(wsSend, wsBroadcast);

app.post("/broadcast", async (req, res) => {
  const { tag, key, value, sender } = req.body;
  console.log("broadcast received", key, value, sender);
  await db.set(key, value);
  res.sendStatus(200);
  const roundName = getRound(key);
  roundRunner(nodeKey, db, tag, roundName, sender, serverSend, serverBroadcast);
});

app.post("/send", async (req, res) => {
  const { tag, key, value, sender } = req.body;
  console.log("send received", key, value, sender);
  await db.set(key, value);
  res.sendStatus(200);
  const roundName = getRound(key);
  roundRunner(nodeKey, db, tag, roundName, sender, serverSend, serverBroadcast);
});

app.post("/start", async (req, res) => {
  const { tag } = req.body;
  const roundName = getRound("start");
  await roundRunner(
    nodeKey,
    db,
    tag,
    roundName,
    undefined,
    serverSend,
    serverBroadcast
  );
  res.sendStatus(200);
});

app.get("/generate_node_info/:index", async (req, res) => {
  let index = req.params.index;
  await generateNodeInfo(db, nodeKey, index);
  res.sendStatus(200);
});

app.post("/share", async (req, res) => {
  let { tag, share } = req.body;
  await setShare(db, tag, share);
  res.sendStatus(200);
});

app.get("/gwi/:tag", async (req, res) => {
  let tag = req.params.tag;
  const commitment = await getGwi(db, tag);
  res.send({ commitment });
});

app.get("/get_public_params", async (req, res) => {
  const { h1h2Ntilde, ek } = await getPublicParams(db, nodeKey);
  res.send({
    h1h2Ntilde,
    ek,
  });
});

app.post("/set_tag_info/:tag", async (req, res) => {
  let tag = req.params.tag;
  let { pubkey, endpoints, parties, gwis, eks, h1h2Ntildes } = req.body;
  await setTagInfo(
    db,
    nodeKey,
    tag,
    pubkey,
    endpoints,
    parties,
    gwis,
    eks,
    h1h2Ntildes
  );
  res.sendStatus(200);
});

app.post("/sign", async (req, res) => {
  let { tag, msg_hash } = req.body;
  let { s_i, local_sig } = await tssSign(db, nodeKey, tag, msg_hash);
  res.send({ s_i });
});

app.post("/get_signature", async (req, res) => {
  let { s_is, tag, msg_hash } = req.body;
  let sig = await getSignature(db, nodeKey, tag, s_is, msg_hash);
  res.send({ sig });
});

// app.post("/round_1", async (req, res) => {
//   let { tag } = req.body;
//   let { endpoints } = await getTagInfo(db, tag);
//   let index = await db.get(`${nodeKey}:index`);

//   let gamma_i = tss.random_bigint();
//   let [com, blind_factor, g_gamma_i] = tss.phase_1_broadcast(gamma_i);
//   let k_i = tss.random_bigint();

//   await Promise.all([
//     db.set(`${nodeKey}:${tag}:com`, com),
//     db.set(`${nodeKey}:${tag}:blind_factor`, blind_factor),
//     db.set(`${nodeKey}:${tag}:g_gamma_i`, g_gamma_i),
//     db.set(`${nodeKey}:${tag}:k_i`, k_i),
//     db.set(`${nodeKey}:${tag}:gamma_i`, gamma_i),
//   ]);
//   await serverBroadcast(endpoints, `node-${index}:${tag}:com`, com);
//   res.sendStatus(200);
// });

// app.post("/round_2_MessageA", async (req, res) => {
//   let { tag } = req.body;
//   let { parties, endpoints, h1h2Ntildes } = await getTagInfo(db, tag);

//   let index = await db.get(`${nodeKey}:index`);
//   let k_i = await db.get(`${nodeKey}:${tag}:k_i`);
//   let ek = await db.get(`${nodeKey}:ek`);
//   var awaiting = [];
//   for (let i = 0; i < parties.length; i++) {
//     let party = parties[i];
//     if (party === index) continue;
//     awaiting.push(
//       work(workerNum(), "message_A", [k_i, ek, h1h2Ntildes[i]]).then((res) => {
//         let [msgA, msgA_randomness] = res;
//         return Promise.all([
//           db.set(`tag-${tag}:from-${index}:to-${party}:m_a`, msgA),
//           db.set(
//             `tag-${tag}:from-${index}:to-${party}:m_a_randomness`,
//             msgA_randomness
//           ),
//           serverSend(
//             endpoints[i],
//             `tag-${tag}:from-${index}:to-${party}:m_a`,
//             msgA
//           ),
//         ]);
//       })
//     );
//   }
//   await Promise.all(awaiting);
//   res.sendStatus(200);
// });

// app.post("/round_2_MessageBs", async (req, res) => {
//   let { tag } = req.body;
//   let { parties, endpoints, eks } = await getTagInfo(db, tag);
//   let index = await db.get(`${nodeKey}:index`);
//   let gamma_i = await db.get(`${nodeKey}:${tag}:gamma_i`);
//   let w_i = await db.get(`tag-${tag}:share`);
//   let h1h2Ntilde = await db.get(`${nodeKey}:h1h2Ntilde`);
//   var awaiting = [];
//   for (let i = 0; i < parties.length; i++) {
//     let party = parties[i];
//     if (party === index) continue;
//     let endpoint = endpoints[i];
//     let ek = eks[i];
//     let msgA = await db.get(`tag-${tag}:from-${party}:to-${index}:m_a`);

//     awaiting.push(
//       work(workerNum(), "message_Bs", [
//         gamma_i,
//         w_i,
//         ek,
//         msgA,
//         h1h2Ntilde,
//       ]).then((res) => {
//         let [m_b_gamma, beta_gamma, beta_randomness, beta_tag, m_b_w, beta_wi] =
//           res;
//         return Promise.all([
//           db.set(`tag-${tag}:from-${index}:to-${party}:m_b_gamma`, m_b_gamma),
//           db.set(`tag-${tag}:from-${index}:to-${party}:beta_gamma`, beta_gamma),
//           db.set(
//             `tag-${tag}:from-${index}:to-${party}:beta_randomness`,
//             beta_randomness
//           ),
//           db.set(`tag-${tag}:from-${index}:to-${party}:beta_tag`, beta_tag),
//           db.set(`tag-${tag}:from-${index}:to-${party}:m_b_w`, m_b_w),
//           db.set(`tag-${tag}:from-${index}:to-${party}:beta_wi`, beta_wi),
//           serverSend(
//             endpoint,
//             `tag-${tag}:from-${index}:to-${party}:m_b_gamma`,
//             m_b_gamma
//           ),
//           serverSend(
//             endpoint,
//             `tag-${tag}:from-${index}:to-${party}:m_b_w`,
//             m_b_w
//           ),
//         ]);
//       })
//     );
//   }
//   await Promise.all(awaiting);
//   res.sendStatus(200);
// });

// app.post("/round_2_Alphas", async (req, res) => {
//   let { tag } = req.body;
//   let { parties, endpoints, gwis } = await getTagInfo(db, tag);
//   let index = await db.get(`${nodeKey}:index`);
//   let w_i = await db.get(`tag-${tag}:share`);
//   let k_i = await db.get(`${nodeKey}:${tag}:k_i`);
//   let gamma_i = await db.get(`${nodeKey}:${tag}:gamma_i`);
//   let keys = await db.get(`${nodeKey}:keys`);

//   let m_b_gammas = [];
//   let m_b_ws = [];
//   let beta_gammas = [];
//   let beta_wis = [];
//   for (let i = 0; i < parties.length; i++) {
//     let party = parties[i];
//     if (party == index) continue;
//     m_b_gammas.push(db.get(`tag-${tag}:from-${party}:to-${index}:m_b_gamma`));
//     m_b_ws.push(db.get(`tag-${tag}:from-${party}:to-${index}:m_b_w`));
//     beta_gammas.push(db.get(`tag-${tag}:from-${index}:to-${party}:beta_gamma`));
//     beta_wis.push(db.get(`tag-${tag}:from-${index}:to-${party}:beta_wi`));
//   }

//   m_b_gammas = await Promise.all(m_b_gammas);
//   m_b_ws = await Promise.all(m_b_ws);
//   beta_gammas = await Promise.all(beta_gammas);
//   beta_wis = await Promise.all(beta_wis);

//   var [delta, sigma] = await work(workerNum(), "message_Alphas", [
//     k_i,
//     gamma_i,
//     w_i,
//     keys,
//     gwis,
//     m_b_gammas,
//     m_b_ws,
//     beta_gammas,
//     beta_wis,
//     index,
//     parties,
//   ]);

//   await Promise.all([
//     db.set(`node-${index}:${tag}:delta`, delta),
//     db.set(`${nodeKey}:${tag}:sigma`, sigma),
//   ]);
//   await serverBroadcast(endpoints, `node-${index}:${tag}:delta`, delta);
//   res.sendStatus(200);
// });

// app.post("/round_3_DeltaInv", async (req, res) => {
//   let { tag } = req.body;
//   let { parties } = await getTagInfo(db, tag);
//   let deltas = [];
//   for (let i = 0; i < parties.length; i++) {
//     let party = parties[i];
//     deltas.push(db.get(`node-${party}:${tag}:delta`));
//   }
//   deltas = await Promise.all(deltas);
//   let deltaInv = tss.phase_3_deltaInv(deltas);
//   await db.set(`${nodeKey}:${tag}:delta_inv`, deltaInv);
//   res.sendStatus(200);
// });

// app.post("/round_4_Di", async (req, res) => {
//   let { tag } = req.body;
//   let { endpoints } = await getTagInfo(db, tag);
//   let index = await db.get(`${nodeKey}:index`);
//   let D_i = await db.get(`${nodeKey}:${tag}:g_gamma_i`);
//   let D_i_blind = await db.get(`${nodeKey}:${tag}:blind_factor`);
//   await Promise.all([
//     serverBroadcast(
//       endpoints,
//       `node-${index}:${tag}:D_i_and_blind`,
//       JSON.stringify({ D_i, D_i_blind })
//     ),
//   ]);
//   res.sendStatus(200);
// });

// app.post("/round_4_Di_verify", async (req, res) => {
//   let { tag } = req.body;
//   let { parties } = await getTagInfo(db, tag);
//   let index = await db.get(`${nodeKey}:index`);
//   let b_proofs = [];
//   let blind_factors = [];
//   let g_gamma_is = [];
//   let coms = [];

//   for (let i = 0; i < parties.length; i++) {
//     let party = parties[i];
//     // note: these are length of n, other arrays are length n - 1
//     g_gamma_is.push(
//       db.get(`node-${party}:${tag}:D_i_and_blind`).then((d) => {
//         return JSON.parse(d).D_i;
//       })
//     );
//     coms.push(db.get(`node-${party}:${tag}:com`));
//     blind_factors.push(
//       db.get(`node-${party}:${tag}:D_i_and_blind`).then((d) => {
//         return JSON.parse(d).D_i_blind;
//       })
//     );
//     if (party === index) {
//       continue;
//     }
//     let m_b_gamma = db
//       .get(`tag-${tag}:from-${party}:to-${index}:m_b_gamma`)
//       .then(tss.get_b_proof);
//     b_proofs.push(m_b_gamma);
//   }

//   g_gamma_is = await Promise.all(g_gamma_is);
//   coms = await Promise.all(coms);
//   blind_factors = await Promise.all(blind_factors);
//   b_proofs = await Promise.all(b_proofs);

//   let deltaInv = await db.get(`${nodeKey}:${tag}:delta_inv`);

//   let R = tss.phase_4_Di_verify(
//     coms,
//     g_gamma_is,
//     blind_factors,
//     b_proofs,
//     deltaInv,
//     index,
//     parties
//   );
//   await db.set(`${nodeKey}:${tag}:R`, R);
//   res.sendStatus(200);
// });

// app.post("/round_5_Rki", async (req, res) => {
//   let { tag } = req.body;
//   let { parties, endpoints, h1h2Ntildes } = await getTagInfo(db, tag);
//   let index = await db.get(`${nodeKey}:index`);
//   let R = await db.get(`${nodeKey}:${tag}:R`);
//   let k_i = await db.get(`${nodeKey}:${tag}:k_i`);
//   let keys = await db.get(`${nodeKey}:keys`);
//   let m_as = [];
//   let m_a_randoms = [];
//   for (let i = 0; i < parties.length; i++) {
//     let party = parties[i];
//     if (index === party) continue;
//     m_as.push(await db.get(`tag-${tag}:from-${index}:to-${party}:m_a`));
//     m_a_randoms.push(
//       await db.get(`tag-${tag}:from-${index}:to-${party}:m_a_randomness`)
//     );
//   }
//   let proofs = tss.phase_5_Rki(
//     R,
//     k_i,
//     m_as,
//     m_a_randoms,
//     h1h2Ntildes,
//     keys,
//     index,
//     parties
//   );

//   let Rki = proofs.shift();
//   await serverBroadcast(endpoints, `node-${index}:${tag}:R_k_i`, Rki);

//   for (let i = 0; i < parties.length; i++) {
//     let party = parties[i];
//     if (party === index) continue;
//     let ind = party < index ? i : i - 1;
//     await db.set(`tag-${tag}:from-${index}:to-${party}:proof_pdl`, proofs[ind]);
//     await serverSend(
//       endpoints[i],
//       `tag-${tag}:from-${index}:to-${party}:proof_pdl`,
//       proofs[ind]
//     );
//   }

//   res.sendStatus(200);
// });

// app.post("/round_5_verify", async (req, res) => {
//   let { tag } = req.body;
//   let { parties, eks } = await getTagInfo(db, tag);
//   let index = await db.get(`${nodeKey}:index`);
//   let Rkis = [];
//   let msgAs = [];
//   let proofs = [];
//   let proofs_Rkis = [];
//   let h1h2Ntilde = await db.get(`${nodeKey}:h1h2Ntilde`);
//   let R = await db.get(`${nodeKey}:${tag}:R`);

//   for (let i = 0; i < parties.length; i++) {
//     let party = parties[i];
//     Rkis.push(await db.get(`node-${party}:${tag}:R_k_i`));
//     if (party === index) continue;
//     proofs_Rkis.push(await db.get(`node-${party}:${tag}:R_k_i`));
//     msgAs.push(await db.get(`tag-${tag}:from-${party}:to-${index}:m_a`));
//     proofs.push(await db.get(`tag-${tag}:from-${party}:to-${index}:proof_pdl`));
//   }
//   let verify = tss.phase_5_verify(
//     Rkis,
//     eks,
//     msgAs,
//     proofs,
//     proofs_Rkis,
//     h1h2Ntilde,
//     R,
//     index,
//     parties
//   );
//   if (!verify) {
//     throw new Error("failed verification check for phase 5");
//   }

//   res.sendStatus(200);
// });

// app.post("/round_6_Rsigmai", async (req, res) => {
//   let { tag } = req.body;
//   let { endpoints } = await getTagInfo(db, tag);
//   let index = await db.get(`${nodeKey}:index`);
//   let R = await db.get(`${nodeKey}:${tag}:R`);
//   let sigma_i = await db.get(`${nodeKey}:${tag}:sigma`);

//   let Rsigmai = tss.phase_6_Rsigmai(R, sigma_i);
//   await serverBroadcast(endpoints, `node-${index}:${tag}:S_i`, Rsigmai);

//   res.sendStatus(200);
// });

// app.post("/round_6_verify", async (req, res) => {
//   let { tag } = req.body;
//   let { parties, pubkey } = await getTagInfo(db, tag);
//   let S_is = [];
//   for (let i = 0; i < parties.length; i++) {
//     let party = parties[i];
//     S_is.push(await db.get(`node-${party}:${tag}:S_i`));
//   }
//   let verify = tss.phase_6_verify(S_is, pubkey);
//   if (!verify) {
//     throw new Error("failed verification check for phase 6");
//   }
//   res.sendStatus(200);
// });

// app.post("/round_7", async (req, res) => {
//   let { tag, msg_hash } = req.body;
//   let { pubkey } = await getTagInfo(db, tag);
//   let k_i = await db.get(`${nodeKey}:${tag}:k_i`);
//   let R = await db.get(`${nodeKey}:${tag}:R`);
//   let sigma_i = await db.get(`${nodeKey}:${tag}:sigma`);
//   let [s_i, local_sig] = tss.phase_7_sign(msg_hash, k_i, R, sigma_i, pubkey);
//   res.send({ s_i });
// });

(async () => {
  console.log("app listening on port", port);
  app.listen(port);
})();
