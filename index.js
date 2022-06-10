const { default: axios } = require("axios");
const express = require("express");
const app = express();
app.use(express.json());
const port = process.argv[2];
const nodeKey = port;
if (!port) {
  throw new Error("port not specified");
}

const path = require('path')
const os = require('os')
const {Worker, MessageChannel} = require("worker_threads");

// const getWorker = () => new Worker(path.resolve(__dirname, "./worker.js"));

// req/res style communication to workers

const workers = [];
let workerCounter = 0;
async function work(workerIndex, method, args) {
  workerIndex = workerIndex % workers.length;
  let worker = workers[workerIndex]
  const data = { method, args };
  const mc = new MessageChannel();
  const res =  new Promise(resolve => {
      mc.port1.once("message", ({data}) => resolve(data));
  });
  const ports = [mc.port2];
  worker.postMessage({data, ports}, ports);
  const finalRes = await res;
  return finalRes;
}

for (let i = 0; i < os.cpus().length; i++) {
  const worker = new Worker(path.resolve(__dirname, "./calc.js"));
  workers.push(worker);
}

const tss = require("tss-lib");

const db = require("./mem_db")(`${port}`);
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

app.get("/generate_node_info/:index", async (req, res) => {
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
  let { tag, share } = req.body;
  await db.set(`tag-${tag}:share`, share);
  let gwi = tss.scalar_mul(tss.generator(), share);

  res.send({ commitment: gwi });
});

app.get("/share/:tag", async (req, res) => {
  res.send({ share: await db.get(`share:${req.params.tag}`) });
});

app.get("/get_h1h2Ntilde", async (req, res) => {
  res.send({ h1h2Ntilde: await db.get(`${nodeKey}:h1h2Ntilde`) });
});

app.get("/get_paillier_ek", async (req, res) => {
  res.send({ ek: await db.get(`${nodeKey}:ek`) });
});

app.post("/pubkey/:tag", async (req, res) => {
  let { X, Y } = req.body;
  let serialized_coords = tss.coords_to_pt(X, Y);
  // let serialized_coords = await work("coords_to_pt", [X, Y])
  await db.set(`tag-${req.params.tag}:pubkey`, serialized_coords);
  res.sendStatus(200);
});

app.post("/round_1", async (req, res) => {
  let { endpoints, index, tag } = req.body; // TODO: get from db
  let gamma_i = tss.random_bigint();
  let [com, blind_factor, g_gamma_i] = tss.phase_1_broadcast(gamma_i);
  let k_i = tss.random_bigint();

  await Promise.all([
    db.set(`${nodeKey}:${tag}:com`, com),
    db.set(`${nodeKey}:${tag}:blind_factor`, blind_factor),
    db.set(`${nodeKey}:${tag}:g_gamma_i`, g_gamma_i),
    db.set(`${nodeKey}:${tag}:k_i`, k_i),
    db.set(`${nodeKey}:${tag}:gamma_i`, gamma_i),
  ]);
  await serverBroadcast(endpoints, `node-${index}:${tag}:com`, com);
  res.sendStatus(200);
});

app.post("/round_2_MessageA", async (req, res) => {
  let { index, parties, endpoints, tag, h1h2Ntildes } = req.body; // TODO: get from db
  let k_i = await db.get(`${nodeKey}:${tag}:k_i`);
  let ek = await db.get(`${nodeKey}:ek`);
  var awaiting = [];
  for (let i = 0; i < parties.length; i++) {
    let party = parties[i];
    if (party === index) continue;
    awaiting.push(work(workerCounter++, "message_A", [k_i, ek, h1h2Ntildes[i]])
    .then(res => {
      let [msgA, msgA_randomness] = res;
      return Promise.all([
        db.set(`tag-${tag}:from-${index}:to-${party}:m_a`, msgA),
        db.set(
          `tag-${tag}:from-${index}:to-${party}:m_a_randomness`,
          msgA_randomness
        ),
        serverSend(
          endpoints[i],
          `tag-${tag}:from-${index}:to-${party}:m_a`,
          msgA
        )
      ])
    }));
    
  }
  await Promise.all(awaiting);
  res.sendStatus(200);
});

app.post("/round_2_MessageBs", async (req, res) => {
  let { index, parties, endpoints, tag, eks } = req.body; // TODO: get from db
  let gamma_i = await db.get(`${nodeKey}:${tag}:gamma_i`);
  let w_i = await db.get(`tag-${tag}:share`);
  let h1h2Ntilde = await db.get(`${nodeKey}:h1h2Ntilde`);
  var awaiting = [];
  for (let i = 0; i < parties.length; i++) {
    let party = parties[i];
    if (party === index) continue;
    let endpoint = endpoints[i];
    let ek = eks[i];
    let msgA = await db.get(`tag-${tag}:from-${party}:to-${index}:m_a`);
    
    awaiting.push(work(workerCounter++, "message_Bs", [gamma_i, w_i, ek, msgA, h1h2Ntilde])
    .then(res => {
      let [m_b_gamma, beta_gamma, beta_randomness, beta_tag, m_b_w, beta_wi] = res;
      return Promise.all([
        db.set(`tag-${tag}:from-${index}:to-${party}:m_b_gamma`, m_b_gamma),
        db.set(`tag-${tag}:from-${index}:to-${party}:beta_gamma`, beta_gamma),
        db.set(
          `tag-${tag}:from-${index}:to-${party}:beta_randomness`,
          beta_randomness
        ),
        db.set(`tag-${tag}:from-${index}:to-${party}:beta_tag`, beta_tag),
        db.set(`tag-${tag}:from-${index}:to-${party}:m_b_w`, m_b_w),
        db.set(`tag-${tag}:from-${index}:to-${party}:beta_wi`, beta_wi),
        serverSend(
          endpoint,
          `tag-${tag}:from-${index}:to-${party}:m_b_gamma`,
          m_b_gamma
        ),
        serverSend(
          endpoint,
          `tag-${tag}:from-${index}:to-${party}:m_b_w`,
          m_b_w
        )
        ])
    }));
    // let worker = await spawn(new Worker("./worker.js"));
    // var [m_b_gamma, beta_gamma, beta_randomness, beta_tag, m_b_w, beta_wi] =
    //   await worker.message_Bs(gamma_i, w_i, ek, msgA, h1h2Ntilde);
    // await Thread.terminate(worker)
  }
  await Promise.all(awaiting);
  res.sendStatus(200);
});

app.post("/round_2_Alphas", async (req, res) => {
  let { tag, index, parties, endpoints, gwis } = req.body; // TODO: get from db
  let w_i = await db.get(`tag-${tag}:share`);
  let k_i = await db.get(`${nodeKey}:${tag}:k_i`);
  let gamma_i = await db.get(`${nodeKey}:${tag}:gamma_i`);
  let keys = await db.get(`${nodeKey}:keys`);

  let m_b_gammas = [];
  let m_b_ws = [];
  let beta_gammas = [];
  let beta_wis = [];
  for (let i = 0; i < parties.length; i++) {
    let party = parties[i];
    if (party === index) continue;
    m_b_gammas.push(db.get(`tag-${tag}:from-${party}:to-${index}:m_b_gamma`));
    m_b_ws.push(db.get(`tag-${tag}:from-${party}:to-${index}:m_b_w`));
    beta_gammas.push(
      db.get(`tag-${tag}:from-${index}:to-${party}:beta_gamma`)
    );
    beta_wis.push(db.get(`tag-${tag}:from-${index}:to-${party}:beta_wi`));
  }

  m_b_gammas = await Promise.all(m_b_gammas);
  m_b_ws = await Promise.all(m_b_ws);
  beta_gammas = await Promise.all(beta_gammas);
  beta_wis = await Promise.all(beta_wis);

  var [delta, sigma] = await work(workerCounter++, "message_Alphas", [
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
  ]);

  await Promise.all([
    db.set(`node-${index}:${tag}:delta`, delta),
    db.set(`${nodeKey}:${tag}:sigma`, sigma),
  ]);
  await serverBroadcast(endpoints, `node-${index}:${tag}:delta`, delta)
  res.sendStatus(200);
});

app.post("/round_3_DeltaInv", async (req, res) => {
  let { tag, parties } = req.body;
  let deltas = [];
  for (let i = 0; i < parties.length; i++) {
    let party = parties[i];
    deltas.push(db.get(`node-${party}:${tag}:delta`));
  }
  deltas = await Promise.all(deltas);
  let deltaInv = tss.phase_3_deltaInv(deltas);
  await db.set(`${nodeKey}:${tag}:delta_inv`, deltaInv);
  res.sendStatus(200);
});

app.post("/round_4_Di", async (req, res) => {
  let { tag, index, endpoints } = req.body;
  let Di = await db.get(`${nodeKey}:${tag}:g_gamma_i`);
  let Diblind = await db.get(`${nodeKey}:${tag}:blind_factor`);
  await Promise.all([
    serverBroadcast(endpoints, `node-${index}:${tag}:D_i`, Di),
    serverBroadcast(endpoints, `node-${index}:${tag}:D_i_blind`, Diblind)
  ]);
  res.sendStatus(200);
});

app.post("/round_4_Di_verify", async (req, res) => {
  let { tag, index, parties } = req.body;
  let b_proofs = [];
  let blind_factors = [];
  let g_gamma_is = [];
  let coms = [];
  for (let i = 0; i < parties.length; i++) {
    let party = parties[i];
    // note: these are length of n, other arrays are length n - 1
    g_gamma_is.push(db.get(`node-${party}:${tag}:D_i`));
    coms.push(db.get(`node-${party}:${tag}:com`));
    blind_factors.push(db.get(`node-${party}:${tag}:D_i_blind`));
    if (party === index) {
      continue;
    }
    let m_b_gamma = db
      .get(`tag-${tag}:from-${party}:to-${index}:m_b_gamma`)
      .then(tss.get_b_proof);
    b_proofs.push(m_b_gamma);
  }

  g_gamma_is = await Promise.all(g_gamma_is);
  coms = await Promise.all(coms);
  blind_factors = await Promise.all(blind_factors);
  b_proofs = await Promise.all(b_proofs);

  let deltaInv = await db.get(`${nodeKey}:${tag}:delta_inv`);
  let R = tss.phase_4_Di_verify(
    coms,
    g_gamma_is,
    blind_factors,
    b_proofs,
    deltaInv,
    index,
    parties
  );
  await db.set(`${nodeKey}:${tag}:R`, R);
  res.sendStatus(200);
});

app.post("/round_5_Rki", async (req, res) => {
  try {
    let { tag, index, parties, endpoints, h1h2Ntildes } = req.body;
    let R = await db.get(`${nodeKey}:${tag}:R`);
    let k_i = await db.get(`${nodeKey}:${tag}:k_i`);
    let keys = await db.get(`${nodeKey}:keys`);
    let m_as = [];
    let m_a_randoms = [];
    for (let i = 0; i < parties.length; i++) {
      let party = parties[i];
      if (index === party) continue;
      m_as.push(await db.get(`tag-${tag}:from-${index}:to-${party}:m_a`));
      m_a_randoms.push(
        await db.get(`tag-${tag}:from-${index}:to-${party}:m_a_randomness`)
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
    await serverBroadcast(endpoints, `node-${index}:${tag}:R_k_i`, Rki);

    for (let i = 0; i < parties.length; i++) {
      let party = parties[i];
      if (party === index) continue;
      let ind = party < index ? i : i - 1;
      await db.set(
        `tag-${tag}:from-${index}:to-${party}:proof_pdl`,
        proofs[ind]
      );
      await serverSend(
        endpoints[i],
        `tag-${tag}:from-${index}:to-${party}:proof_pdl`,
        proofs[ind]
      );
    }

    res.sendStatus(200);
  } catch (e) {
    console.error(e);
  }
});

app.post("/round_5_verify", async (req, res) => {
  let { tag, index, parties, eks } = req.body;
  let Rkis = [];
  let msgAs = [];
  let proofs = [];
  let proofs_Rkis = [];
  let h1h2Ntilde = await db.get(`${nodeKey}:h1h2Ntilde`);
  let R = await db.get(`${nodeKey}:${tag}:R`);

  for (let i = 0; i < parties.length; i++) {
    let party = parties[i];
    Rkis.push(await db.get(`node-${party}:${tag}:R_k_i`));
    if (party === index) continue;
    proofs_Rkis.push(await db.get(`node-${party}:${tag}:R_k_i`));
    msgAs.push(await db.get(`tag-${tag}:from-${party}:to-${index}:m_a`));
    proofs.push(
      await db.get(`tag-${tag}:from-${party}:to-${index}:proof_pdl`)
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
  let { tag, index, endpoints } = req.body;
  let R = await db.get(`${nodeKey}:${tag}:R`);
  let sigma_i = await db.get(`${nodeKey}:${tag}:sigma`);

  let Rsigmai = tss.phase_6_Rsigmai(R, sigma_i);
  await serverBroadcast(endpoints, `node-${index}:${tag}:S_i`, Rsigmai);

  res.sendStatus(200);
});

app.post("/round_6_verify", async (req, res) => {
  let { tag, index, parties } = req.body;
  let S_is = [];
  for (let i = 0; i < parties.length; i++) {
    let party = parties[i];
    S_is.push(await db.get(`node-${party}:${tag}:S_i`));
  }
  let y = await db.get(`tag-${tag}:pubkey`);
  let verify = tss.phase_6_verify(S_is, y);
  if (!verify) {
    throw new Error("failed verification check for phase 6");
  }
  res.sendStatus(200);
});

app.post("/round_7", async (req, res) => {
  let { tag, index, msg_hash } = req.body;
  let k_i = await db.get(`${nodeKey}:${tag}:k_i`);
  let R = await db.get(`${nodeKey}:${tag}:R`);
  let sigma_i = await db.get(`${nodeKey}:${tag}:sigma`);
  let y = await db.get(`tag-${tag}:pubkey`);
  let [s_i, local_sig] = tss.phase_7_sign(msg_hash, k_i, R, sigma_i, y);
  res.send({ s_i });
});

app.post("/get_signature", async (req, res) => {
  let { s_is, tag, msg_hash } = req.body;
  let y = await db.get(`tag-${tag}:pubkey`);
  let R = await db.get(`${nodeKey}:${tag}:R`);
  res.send({ sig: tss.get_signature(y, msg_hash, R, s_is) });
});

(async () => {
  console.log("app listening on port", port);
  app.listen(port);
})();
