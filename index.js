const express = require("express");
const { del } = require("express/lib/application");
const { set } = require("lodash");
const app = express();
app.use(express.json());
const port = process.argv[2];
const nodeKey = port;
if (!port) {
  throw new Error("port not specified");
}
const tss = require("tss-lib");

const db = require("./db")(`${port}`);
const { serverBroadcast, serverSend } = require("./comm");

app.post("/broadcast", async (req, res) => {
  const { key, value } = req.body;
  await db.set(key, value);
  res.sendStatus(200);
});

app.post("/send", async (req, res) => {
  const { key, value } = req.body;
  await db.set(key, value);
  res.sendStatus(200);
});

app.get("/generate_node_info/findex", async (req, res) => {
  let [keys, ek, h1h2Ntilde] = tss.generate_keys(parseInt(req.params.index));
  await Promise.all([
    db.set(`${nodeKey}:index`, req.params.index),
    db.set(`${nodeKey}:keys`, keys),
    db.set(`${nodeKey}:ek`, ek),
    db.set(`${nodeKey}:h1h2Ntilde`, h1h2Ntilde),
  ]);
  res.sendStatus(200);
});

app.post("/share", async (req, res) => {
  let { user, share } = req.body;
  await db.set(`user-${user}:share`, share);
  let gwi = tss.scalar_mul(tss.generator(), share);

  res.send({ commitment: gwi });
});

app.get("/share/:user", async (req, res) => {
  res.send({ share: await db.get(`share:${req.params.user}`) });
});

app.get("/get_h1h2Ntilde", async (req, res) => {
  res.send({ h1h2Ntilde: await db.get(`${nodeKey}:h1h2Ntilde`) });
});

app.get("/get_paillier_ek", async (req, res) => {
  res.send({ ek: await db.get(`${nodeKey}:ek`) });
});

app.post("/pubkey/:user", async (req, res) => {
  let { X, Y } = req.body;
  let serialized_coords = tss.coords_to_pt(X, Y);
  await db.set(`user-${req.params.user}:pubkey`, serialized_coords);
  res.sendStatus(200);
});

app.post("/round_1", async (req, res) => {
  let { endpoints, index, user } = req.body; // TODO: get from db
  let gamma_i = tss.random_bigint();
  let [com, blind_factor, g_gamma_i] = tss.phase_1_broadcast(gamma_i);
  let k_i = tss.random_bigint();
  await Promise.all([
    db.set(`${nodeKey}:${user}:com`, com),
    db.set(`${nodeKey}:${user}:blind_factor`, blind_factor),
    db.set(`${nodeKey}:${user}:g_gamma_i`, g_gamma_i),
    db.set(`${nodeKey}:${user}:k_i`, k_i),
    db.set(`${nodeKey}:${user}:gamma_i`, gamma_i),
  ]);
  await serverBroadcast(endpoints, `node-${index}:${user}:com`, com);
  res.sendStatus(200);
});

app.post("/round_2_MessageA", async (req, res) => {
  let { index, parties, endpoints, user, h1h2Ntildes } = req.body; // TODO: get from db
  let k_i = await db.get(`${nodeKey}:${user}:k_i`);
  let ek = await db.get(`${nodeKey}:ek`);
  var awaiting = [];
  for (let i = 0; i < parties.length; i++) {
    let party = parties[i];
    if (party === index) continue;
    let [msgA, msgA_randomness] = tss.message_A(k_i, ek, h1h2Ntildes[i]);
    awaiting.push(db.set(`user-${user}:from-${index}:to-${party}:m_a`, msgA));
    awaiting.push(
      serverSend(
        endpoints[i],
        `user-${user}:from-${index}:to-${party}:m_a`,
        msgA
      )
    );
    awaiting.push(
      db.set(
        `user-${user}:from-${index}:to-${party}:m_a_randomness`,
        msgA_randomness
      )
    );
  }
  await Promise.all(awaiting);
  res.sendStatus(200);
});

app.post("/round_2_MessageBs", async (req, res) => {
  let { index, parties, endpoints, user, eks } = req.body; // TODO: get from db
  let gamma_i = await db.get(`${nodeKey}:${user}:gamma_i`);
  let w_i = await db.get(`user-${user}:share`);
  let h1h2Ntilde = await db.get(`${nodeKey}:h1h2Ntilde`);
  var awaiting = [];
  for (let i = 0; i < parties.length; i++) {
    let party = parties[i];
    if (party === index) continue;
    let endpoint = endpoints[i];
    let ek = eks[i];
    let msgA = await db.get(`user-${user}:from-${party}:to-${index}:m_a`);
    var [m_b_gamma, beta_gamma, beta_randomness, beta_tag, m_b_w, beta_wi] =
      tss.message_Bs(gamma_i, w_i, ek, msgA, h1h2Ntilde);
    await db.set(`user-${user}:from-${index}:to-${party}:m_b_gamma`, m_b_gamma);
    await db.set(
      `user-${user}:from-${index}:to-${party}:beta_gamma`,
      beta_gamma
    );
    await db.set(
      `user-${user}:from-${index}:to-${party}:beta_randomness`,
      beta_randomness
    );
    await db.set(`user-${user}:from-${index}:to-${party}:beta_tag`, beta_tag);
    await db.set(`user-${user}:from-${index}:to-${party}:m_b_w`, m_b_w);
    await db.set(`user-${user}:from-${index}:to-${party}:beta_wi`, beta_wi);
    awaiting.push(
      serverSend(
        endpoint,
        `user-${user}:from-${index}:to-${party}:m_b_gamma`,
        m_b_gamma
      )
    );
    awaiting.push(
      serverSend(
        endpoint,
        `user-${user}:from-${index}:to-${party}:m_b_w`,
        m_b_w
      )
    );
  }
  await Promise.all(awaiting);
  res.sendStatus(200);
});

app.post("/round_2_Alphas", async (req, res) => {
  let { user, index, parties, endpoints, gwis } = req.body; // TODO: get from db
  let w_i = await db.get(`user-${user}:share`);
  let k_i = await db.get(`${nodeKey}:${user}:k_i`);
  let gamma_i = await db.get(`${nodeKey}:${user}:gamma_i`);
  let keys = await db.get(`${nodeKey}:keys`);

  let m_b_gammas = [];
  let m_b_ws = [];
  let beta_gammas = [];
  let beta_wis = [];
  for (let i = 0; i < parties.length; i++) {
    let party = parties[i];
    if (party === index) continue;
    m_b_gammas.push(
      await db.get(`user-${user}:from-${party}:to-${index}:m_b_gamma`)
    );
    m_b_ws.push(await db.get(`user-${user}:from-${party}:to-${index}:m_b_w`));
    beta_gammas.push(
      await db.get(`user-${user}:from-${index}:to-${party}:beta_gamma`)
    );
    beta_wis.push(
      await db.get(`user-${user}:from-${index}:to-${party}:beta_wi`)
    );
  }

  var [delta, sigma] = tss.message_Alphas(
    k_i,
    gamma_i,
    w_i,
    keys,
    gwis,
    m_b_gammas,
    m_b_ws,
    beta_gammas,
    beta_wis,
    index,
    parties
  );
  await db.set(`node-${index}:${user}:delta`, delta);
  await db.set(`${nodeKey}:${user}:sigma`, sigma);

  await serverBroadcast(endpoints, `node-${index}:${user}:delta`, delta);
  res.sendStatus(200);
});

app.post("/round_3_DeltaInv", async (req, res) => {
  let { user, parties } = req.body;
  let deltas = [];
  for (let i = 0; i < parties.length; i++) {
    let party = parties[i];
    deltas.push(await db.get(`node-${party}:${user}:delta`));
  }
  let deltaInv = tss.phase_3_deltaInv(deltas);
  await db.set(`${nodeKey}:${user}:delta_inv`, deltaInv);
  res.sendStatus(200);
});

app.post("/round_4_Di", async (req, res) => {
  let { user, index, endpoints } = req.body;
  let Di = await db.get(`${nodeKey}:${user}:g_gamma_i`);
  let Diblind = await db.get(`${nodeKey}:${user}:blind_factor`);
  await serverBroadcast(endpoints, `node-${index}:${user}:D_i`, Di);
  await serverBroadcast(endpoints, `node-${index}:${user}:D_i_blind`, Diblind);
  res.sendStatus(200);
});

app.post("/round_4_Di_verify", async (req, res) => {
  let { user, index, parties } = req.body;
  let b_proofs = [];
  let blind_factors = [];
  let g_gamma_is = [];
  let coms = [];
  for (let i = 0; i < parties.length; i++) {
    let party = parties[i];
    // note: these are length of n, other arrays are length n - 1
    g_gamma_is.push(await db.get(`node-${party}:${user}:D_i`));
    coms.push(await db.get(`node-${party}:${user}:com`));
    blind_factors.push(await db.get(`node-${party}:${user}:D_i_blind`));
    if (party === index) {
      continue;
    }
    let m_b_gamma = await db.get(
      `user-${user}:from-${party}:to-${index}:m_b_gamma`
    );
    b_proofs.push(tss.get_b_proof(m_b_gamma));
  }

  let deltaInv = await db.get(`${nodeKey}:${user}:delta_inv`);
  let R = tss.phase_4_Di_verify(
    coms,
    g_gamma_is,
    blind_factors,
    b_proofs,
    deltaInv,
    index,
    parties
  );
  await db.set(`${nodeKey}:${user}:R`, R);
  res.sendStatus(200);
});

app.post("/round_5_Rki", async (req, res) => {
  try {
    let { user, index, parties, endpoints, h1h2Ntildes } = req.body;
    let R = await db.get(`${nodeKey}:${user}:R`);
    let k_i = await db.get(`${nodeKey}:${user}:k_i`);
    let keys = await db.get(`${nodeKey}:keys`);
    let m_as = [];
    let m_a_randoms = [];
    for (let i = 0; i < parties.length; i++) {
      let party = parties[i];
      if (index === party) continue;
      m_as.push(await db.get(`user-${user}:from-${index}:to-${party}:m_a`));
      m_a_randoms.push(
        await db.get(`user-${user}:from-${index}:to-${party}:m_a_randomness`)
      );
    }
    let proofs = tss.phase_5_Rki(
      R,
      k_i,
      m_as,
      m_a_randoms,
      h1h2Ntildes,
      keys,
      index,
      parties
    );

    let Rki = proofs.shift();
    await serverBroadcast(endpoints, `node-${index}:${user}:R_k_i`, Rki);

    for (let i = 0; i < parties.length; i++) {
      let party = parties[i];
      if (party === index) continue;
      let ind = party < index ? i : i - 1;
      await db.set(
        `user-${user}:from-${index}:to-${party}:proof_pdl`,
        proofs[ind]
      );
      await serverSend(
        endpoints[i],
        `user-${user}:from-${index}:to-${party}:proof_pdl`,
        proofs[ind]
      );
    }

    res.sendStatus(200);
  } catch (e) {
    console.error(e);
  }
});

app.post("/round_5_verify", async (req, res) => {
  let { user, index, parties, eks } = req.body;
  let Rkis = [];
  let msgAs = [];
  let proofs = [];
  let proofs_Rkis = [];
  let h1h2Ntilde = await db.get(`${nodeKey}:h1h2Ntilde`);
  let R = await db.get(`${nodeKey}:${user}:R`);

  for (let i = 0; i < parties.length; i++) {
    let party = parties[i];
    Rkis.push(await db.get(`node-${party}:${user}:R_k_i`));
    if (party === index) continue;
    proofs_Rkis.push(await db.get(`node-${party}:${user}:R_k_i`));
    msgAs.push(await db.get(`user-${user}:from-${party}:to-${index}:m_a`));
    proofs.push(
      await db.get(`user-${user}:from-${party}:to-${index}:proof_pdl`)
    );
  }
  let verify = tss.phase_5_verify(
    Rkis,
    eks,
    msgAs,
    proofs,
    proofs_Rkis,
    h1h2Ntilde,
    R,
    index,
    parties
  );
  if (!verify) {
    throw new Error("failed verification check for phase 5");
  }

  res.sendStatus(200);
});

app.post("/round_6_Rsigmai", async (req, res) => {
  let { user, index, endpoints } = req.body;
  let R = await db.get(`${nodeKey}:${user}:R`);
  let sigma_i = await db.get(`${nodeKey}:${user}:sigma`);

  let Rsigmai = tss.phase_6_Rsigmai(R, sigma_i);
  await serverBroadcast(endpoints, `node-${index}:${user}:S_i`, Rsigmai);

  res.sendStatus(200);
});

app.post("/round_6_verify", async (req, res) => {
  let { user, index, parties } = req.body;
  let S_is = [];
  for (let i = 0; i < parties.length; i++) {
    let party = parties[i];
    S_is.push(await db.get(`node-${party}:${user}:S_i`));
  }
  let y = await db.get(`user-${user}:pubkey`);
  let verify = tss.phase_6_verify(S_is, y);
  if (!verify) {
    throw new Error("failed verification check for phase 6");
  }
  res.sendStatus(200);
});

app.post("/round_7", async (req, res) => {
  let { user, index, msg_hash } = req.body;
  let k_i = await db.get(`${nodeKey}:${user}:k_i`);
  let R = await db.get(`${nodeKey}:${user}:R`);
  let sigma_i = await db.get(`${nodeKey}:${user}:sigma`);
  let y = await db.get(`user-${user}:pubkey`);
  let [s_i, local_sig] = tss.phase_7_sign(msg_hash, k_i, R, sigma_i, y);
  res.send({ s_i });
});

app.post("/get_signature", async (req, res) => {
  let { s_is, user, msg_hash } = req.body;
  let y = await db.get(`user-${user}:pubkey`);
  let R = await db.get(`${nodeKey}:${user}:R`);
  res.send({ sig: tss.get_signature(y, msg_hash, R, s_is) });
});

(async () => {
  console.log("app listening on port", port);
  app.listen(port);
})();
