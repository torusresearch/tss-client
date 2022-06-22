const getTagInfo = async function (db, tag) {
  let tagInfo = await db.get(`tag-${tag}:info`);
  return JSON.parse(tagInfo);
};

const { work, workerNum } = require("./work");
const tss = require("tss-lib");

function createRoundTracker(parties, selfIndex) {
  let roundTracker = {};

  // round 1 commitment broadcast
  roundTracker.round_1_commitment_broadcast = false;

  // round 1 commitment received
  roundTracker.round_1_commitment_received = {};
  parties.map((party) => {
    roundTracker.round_1_commitment_received[party.toString()] = false;
  });

  // round 2 message A sent
  roundTracker.round_2_MessageA_sent = {};
  parties.map((party) => {
    if (selfIndex.toString() !== party.toString())
      roundTracker.round_2_MessageA_sent[party.toString()] = false;
  });

  // round 2 message A received
  roundTracker.round_2_MessageA_received = {};
  parties.map((party) => {
    if (selfIndex.toString() !== party.toString())
      roundTracker.round_2_MessageA_received[party.toString()] = false;
  });

  // round 2 message Bs gamma sent
  roundTracker.round_2_MessageBs_gamma_sent = {};
  parties.map((party) => {
    if (selfIndex.toString() !== party.toString())
      roundTracker.round_2_MessageBs_gamma_sent[party.toString()] = false;
  });

  // round 2 message Bs gamma received
  roundTracker.round_2_MessageBs_gamma_received = {};
  parties.map((party) => {
    if (selfIndex.toString() !== party.toString())
      roundTracker.round_2_MessageBs_gamma_received[party.toString()] = false;
  });

  // round 2 message Bs w sent
  roundTracker.round_2_MessageBs_w_sent = {};
  parties.map((party) => {
    if (selfIndex.toString() !== party.toString())
      roundTracker.round_2_MessageBs_w_sent[party.toString()] = false;
  });

  // round 2 message Bs w received
  roundTracker.round_2_MessageBs_w_received = {};
  parties.map((party) => {
    if (selfIndex.toString() !== party.toString())
      roundTracker.round_2_MessageBs_w_received[party.toString()] = false;
  });

  // round 2 message Alphas generated
  roundTracker.round_2_Alphas = {};
  parties.map((party) => {
    if (selfIndex.toString() !== party.toString())
      roundTracker.round_2_Alphas[party.toString()] = false;
  });

  // round 3 delta broadcast
  roundTracker.round_3_Delta_broadcast = false;

  // round 3 deltas received
  roundTracker.round_3_Delta_received = {};
  parties.map((party) => {
    roundTracker.round_3_Delta_received[party.toString()] = false;
  });

  // round 4 Di broadcast
  roundTracker.round_4_Di_broadcast = false;

  // round 4 Di received
  roundTracker.round_4_Di_received = {};
  parties.map((party) => {
    roundTracker.round_4_Di_received[party.toString()] = false;
  });

  // round 4 Di verify
  roundTracker.round_4_Di_verified = false;

  // round 5 proof pdl sent
  roundTracker.round_5_proof_pdl_sent = {};
  parties.map((party) => {
    if (selfIndex.toString() !== party.toString())
      roundTracker.round_5_proof_pdl_sent[party.toString()] = false;
  });

  // round 5 proof pdl recieved
  roundTracker.round_5_proof_pdl_received = {};
  parties.map((party) => {
    if (selfIndex.toString() !== party.toString())
      roundTracker.round_5_proof_pdl_received[party.toString()] = false;
  });

  // round 5 Rki broadcast
  roundTracker.round_5_Rki_broadcast = false;

  // round 5 Rki received
  roundTracker.round_5_Rki_received = {};
  parties.map((party) => {
    roundTracker.round_5_Rki_received[party.toString()] = false;
  });

  // round 5 Rki verified
  roundTracker.round_5_Rki_verified = false;

  // round 6 Rsigmai broadcast
  roundTracker.round_6_Rsigmai_broadcast = false;

  // round 6 Rsigmai received
  roundTracker.round_6_Rsigmai_received = {};
  parties.map((party) => {
    roundTracker.round_6_Rsigmai_received[party.toString()] = false;
  });

  // round 6 Rsigmai verified
  roundTracker.round_6_Rsigmai_verified = false;

  // round 7
  roundTracker.round_7 = false;

  return roundTracker;
}

const roundTrackerLocks = {};

// the purpose of roundRunner is to prevent duplicate messages from being sent
// it does not prevent duplicate messages from being received
async function roundRunner(
  nodeKey,
  db,
  tag,
  roundName, 
  party,
  serverSend,
  serverBroadcast
) {
  let release;
  try {
    if (db === undefined || tag === undefined || roundName === undefined) {
      throw new Error(
        `undefined arguments for roundRunner: ${JSON.stringify(arguments)}`
      );
    }
    // acquire lock on tag
    if (roundTrackerLocks[tag] === undefined) {
      roundTrackerLocks[tag] = new Promise((res) => {
        release = () => {
          delete roundTrackerLocks[tag]; // release lock
          res();
        };
      });
    } else {
      // wait to acquire lock
      await roundTrackerLocks[tag];
      return roundRunner(
        nodeKey,
        db,
        tag,
        roundName,
        party,
        serverSend,
        serverBroadcast
      );
    }

    let roundTracker = JSON.parse(await db.get(`tag-${tag}:rounds`));
    if (roundTracker === undefined) {
      throw new Error("could not get roundTracker")
    }
    let { parties, endpoints, eks, h1h2Ntildes, gwis, pubkey } = await getTagInfo(
      db,
      tag
    );
    let index = await db.get(`${nodeKey}:index`);

    if (!checkKeys(roundTracker, parties.length)) {
      throw new Error(
        `roundTracker is invalid, expected parties length to be ${
          parties.length
        }, roundTracker ${JSON.stringify(roundTracker)}`
      );
    }

    if (roundName === "round_1_commitment_broadcast") {
      if (roundTracker.round_1_commitment_broadcast === false) {
        roundTracker.round_1_commitment_broadcast = true;
        await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
        release();
        // run round 1 here
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
        await serverBroadcast(
          index,
          tag,
          endpoints,
          `node-${index}:${tag}:com`,
          com
        );
        return;
      }
      throw new Error("round 1 commitment broadcast has already been sent");
    } else if (roundName === "round_1_commitment_received") {
      if (party === undefined)
        throw new Error("round 1 commitment received from unknown");
      roundTracker.round_1_commitment_received[party] = true;
      // check if all commitments have been received
      if (allTrue(roundTracker.round_1_commitment_received)) {
        for (let i = 0; i < parties.length; i++) {
          let p = parties[i].toString();
          if (roundTracker.round_2_MessageA_sent[p] === true) {
            throw new Error(
              `round 2 message A has already been sent for party ${p}`
            );
          }
          roundTracker.round_2_MessageA_sent[p] = true;
        }
        await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
        release();
        // run round 2 message A sending here
        let k_i = await db.get(`${nodeKey}:${tag}:k_i`);
        let ek = await db.get(`${nodeKey}:ek`);
        let awaiting = [];
        for (let i = 0; i < parties.length; i++) {
          let p = parties[i].toString();
          if (p === index.toString()) continue;
          let endpoint = endpoints[i];
          awaiting.push(
            work(workerNum(), "message_A", [k_i, ek, h1h2Ntildes[i]]).then(
              (res) => {
                let [msgA, msgA_randomness] = res;
                return Promise.all([
                  db.set(`tag-${tag}:from-${index}:to-${p}:m_a`, msgA),
                  db.set(
                    `tag-${tag}:from-${index}:to-${p}:m_a_randomness`,
                    msgA_randomness
                  ),
                ]).then(() => {
                  return serverSend(
                    index,
                    tag,
                    endpoint,
                    `tag-${tag}:from-${index}:to-${p}:m_a`,
                    msgA
                  );
                });
              }
            )
          );
        }
        await Promise.all(awaiting);
        return;
      }
      await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
      release();
    } else if (roundName === "round_2_MessageA_received") {
      // TODO: handle case where this arrives earlier than round 1 commitment
      if (party === undefined)
        throw new Error("round 2 message A received from unknown");
      roundTracker.round_2_MessageA_received[party] = true;
      if (
        roundTracker.round_2_MessageBs_gamma_sent[party] === true ||
        roundTracker.round_2_MessageBs_w_sent === true
      ) {
        throw new Error(
          `round 2 message B gamma/w has already been sent for party ${party}, ${roundName}`
        );
      }
      roundTracker.round_2_MessageBs_gamma_sent[party] = true;
      roundTracker.round_2_MessageBs_w_sent[party] = true;
      // run round 2 message Bs sending here for party
      let gamma_i = await db.get(`${nodeKey}:${tag}:gamma_i`);
      let w_i = await db.get(`tag-${tag}:share`);
      let h1h2Ntilde = await db.get(`${nodeKey}:h1h2Ntilde`);
      let i = parties.indexOf(party);
      let endpoint = endpoints[i];
      let ek = eks[i];
      let msgA = await db.get(`tag-${tag}:from-${party}:to-${index}:m_a`);
      await work(workerNum(), "message_Bs", [
        gamma_i,
        w_i,
        ek,
        msgA,
        h1h2Ntilde,
      ]).then((res) => {
        let [m_b_gamma, beta_gamma, beta_randomness, beta_tag, m_b_w, beta_wi] =
          res;
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
            index,
            tag,
            endpoint,
            `tag-${tag}:from-${index}:to-${party}:m_b_gamma`,
            m_b_gamma
          ),
          serverSend(
            index,
            tag,
            endpoint,
            `tag-${tag}:from-${index}:to-${party}:m_b_w`,
            m_b_w
          ),
        ]);
      });
      await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
      release();
      return;
    } else if (
      roundName === "round_2_MessageBs_gamma_received" ||
      roundName === "round_2_MessageBs_w_received"
    ) {
      if (party === undefined)
        throw new Error("round 2 message B received from unknown");
      roundTracker[roundName][party] = true;
      if (
        allTrue(roundTracker.round_2_MessageBs_w_received) &&
        allTrue(roundTracker.round_2_MessageBs_gamma_received)
      ) {
        // update roundTracker and release lock
        for (let i = 0; i < parties.length; i++) {
          let p = parties[i].toString();
          if (p === index.toString()) continue;
          if (roundTracker.round_2_Alphas[p] === true) {
            throw new Error(`round 2 alphas already generated for party ${p}`);
          }
          roundTracker.round_2_Alphas[p] = true;
        }
        if (roundTracker.round_3_Delta_broadcast === true) {
          throw new Error("round 3 delta already broadcast");
        }
        roundTracker.round_3_Delta_broadcast = true;

        // run round 2 alpha generation here
        let w_i = await db.get(`tag-${tag}:share`);
        let k_i = await db.get(`${nodeKey}:${tag}:k_i`);
        let gamma_i = await db.get(`${nodeKey}:${tag}:gamma_i`);
        let keys = await db.get(`${nodeKey}:keys`);

        let m_b_gammas = [];
        let m_b_ws = [];
        let beta_gammas = [];
        let beta_wis = [];
        for (let i = 0; i < parties.length; i++) {
          let p = parties[i].toString();
          if (p === index.toString()) continue;
          m_b_gammas.push(db.get(`tag-${tag}:from-${p}:to-${index}:m_b_gamma`));
          m_b_ws.push(db.get(`tag-${tag}:from-${p}:to-${index}:m_b_w`));
          beta_gammas.push(
            db.get(`tag-${tag}:from-${index}:to-${p}:beta_gamma`)
          );
          beta_wis.push(db.get(`tag-${tag}:from-${index}:to-${p}:beta_wi`));
        }

        m_b_gammas = await Promise.all(m_b_gammas);
        m_b_ws = await Promise.all(m_b_ws);
        beta_gammas = await Promise.all(beta_gammas);
        beta_wis = await Promise.all(beta_wis);

        var [delta, sigma] = await work(workerNum(), "message_Alphas", [
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
          parties,
        ]);
        await Promise.all([
          db.set(`node-${index}:${tag}:delta`, delta),
          db.set(`${nodeKey}:${tag}:sigma`, sigma),
        ]);
        await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
        release();
        await serverBroadcast(
          index,
          tag,
          endpoints,
          `node-${index}:${tag}:delta`,
          delta
        );
        return;
      }
      await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
      release();
    } else if (roundName === "round_3_Delta_received") {
      if (party === undefined)
        throw new Error("round 3 delta broadcast received from unknown");
      roundTracker.round_3_Delta_received[party] = true;
      if (allTrue(roundTracker.round_3_Delta_received)) {
        if (roundTracker.round_4_Di_broadcast === true) {
          throw new Error("round 4 Di already broadcast");
        }
        roundTracker.round_4_Di_broadcast = true;
        await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
        release();
        // run deltaInv and round 4 Di and blind broadcast
        let deltas = [];
        for (let i = 0; i < parties.length; i++) {
          let p = parties[i].toString();
          deltas.push(db.get(`node-${p}:${tag}:delta`));
        }
        deltas = await Promise.all(deltas);
        let deltaInv = tss.phase_3_deltaInv(deltas);
        await db.set(`${nodeKey}:${tag}:delta_inv`, deltaInv);
        let D_i = await db.get(`${nodeKey}:${tag}:g_gamma_i`);
        let D_i_blind = await db.get(`${nodeKey}:${tag}:blind_factor`);
        await serverBroadcast(
          index,
          tag,
          endpoints,
          `node-${index}:${tag}:D_i_and_blind`,
          JSON.stringify({ D_i, D_i_blind })
        );
        return;
      }
      await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
      release();
    } else if (roundName === "round_4_Di_received") {
      if (party === undefined) throw new Error("round 4 received from unknown");
      roundTracker.round_4_Di_received[party] = true;
      if (allTrue(roundTracker.round_4_Di_received)) {
        // run round 4 Di verify
        let b_proofs = [];
        let blind_factors = [];
        let g_gamma_is = [];
        let coms = [];

        for (let i = 0; i < parties.length; i++) {
          let p = parties[i].toString();
          // note: these are length of n, other arrays are length n - 1
          g_gamma_is.push(
            db.get(`node-${p}:${tag}:D_i_and_blind`).then((d) => {
              return JSON.parse(d).D_i;
            })
          );
          coms.push(db.get(`node-${p}:${tag}:com`));
          blind_factors.push(
            db.get(`node-${p}:${tag}:D_i_and_blind`).then((d) => {
              return JSON.parse(d).D_i_blind;
            })
          );
          if (p === index.toString()) {
            continue;
          }
          let m_b_gamma = db
            .get(`tag-${tag}:from-${p}:to-${index}:m_b_gamma`)
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
        roundTracker.round_4_Di_verified = true;
        roundTracker.round_5_Rki_broadcast = true;
        for (let party in roundTracker.round_5_proof_pdl_sent) {
          roundTracker.round_5_proof_pdl_sent[party] = true;
        }
        await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
        release();

        // run round 5 Rki broadcast
        let k_i = await db.get(`${nodeKey}:${tag}:k_i`);
        let keys = await db.get(`${nodeKey}:keys`);
        let m_as = [];
        let m_a_randoms = [];
        for (let i = 0; i < parties.length; i++) {
          let p = parties[i].toString();
          if (p === index.toString()) continue;
          m_as.push(await db.get(`tag-${tag}:from-${index}:to-${p}:m_a`));
          m_a_randoms.push(
            await db.get(`tag-${tag}:from-${index}:to-${p}:m_a_randomness`)
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
        
        for (let i = 0, passedIndex = false; i < parties.length; i++) {
          let p = parties[i].toString();
          if (p === index.toString()) {
            passedIndex = true;
            continue; 
          }
          let ind = !passedIndex ? i : i - 1;
          let endpoint = endpoints[i];
          await db.set(
            `tag-${tag}:from-${index}:to-${p}:proof_pdl`,
            proofs[ind]
          );
          await serverSend(
            index,
            tag,
            endpoint,
            `tag-${tag}:from-${index}:to-${p}:proof_pdl`,
            proofs[ind]
          );
        }
        await serverBroadcast(
          index,
          tag,
          endpoints,
          `node-${index}:${tag}:R_k_i`,
          Rki
        );
        return;
      }
      await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
      release();
    } else if (
      roundName === "round_5_Rki_received" ||
      roundName === "round_5_proof_pdl_received"
    ) {
      if (party === undefined) throw new Error("round 5 received from unknown");
      roundTracker[roundName][party] = true;
      if (
        allTrue(roundTracker.round_5_Rki_received) &&
        allTrue(roundTracker.round_5_proof_pdl_received)
      ) {
        // run round 5 Rki verify
        let Rkis = [];
        let msgAs = [];
        let proofs = [];
        let proofs_Rkis = [];
        let h1h2Ntilde = await db.get(`${nodeKey}:h1h2Ntilde`);
        let R = await db.get(`${nodeKey}:${tag}:R`);

        for (let i = 0; i < parties.length; i++) {
          let p = parties[i].toString();
          Rkis.push(await db.get(`node-${p}:${tag}:R_k_i`));
          if (p === index.toString()) continue;
          proofs_Rkis.push(await db.get(`node-${p}:${tag}:R_k_i`));
          msgAs.push(await db.get(`tag-${tag}:from-${p}:to-${index}:m_a`));
          proofs.push(
            await db.get(`tag-${tag}:from-${p}:to-${index}:proof_pdl`)
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
        roundTracker.round_5_Rki_verified = true;
        roundTracker.round_6_Rsigmai_broadcast = true;
        await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
        release();
        // run round 6 Rsigmai broadcast
        let sigma_i = await db.get(`${nodeKey}:${tag}:sigma`);

        let Rsigmai = tss.phase_6_Rsigmai(R, sigma_i);
        await serverBroadcast(
          index,
          tag,
          endpoints,
          `node-${index}:${tag}:S_i`,
          Rsigmai
        );
        return;
      }
      await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
      release();
    } else if (roundName === "round_6_Rsigmai_received") {
      if (party === undefined) throw new Error("round 6 received from unknown");
      roundTracker.round_6_Rsigmai_received[party] = true;
      if (allTrue(roundTracker.round_6_Rsigmai_received)) {
        // run round 6 verify
        let S_is = [];
        for (let i = 0; i < parties.length; i++) {
          let p = parties[i].toString();
          S_is.push(await db.get(`node-${p}:${tag}:S_i`));
        }
        let verify = tss.phase_6_verify(S_is, pubkey);
        if (!verify) {
          throw new Error("round 6 Rsigmai verify failed");
        }
        roundTracker.round_6_Rsigmai_verified = true;
        await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
        release();
      }
      await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
      release();
      return;
    } else {
      throw new Error(`roundName ${roundName} not found`);
    }
  } catch (e) {
    if (release) release();
    console.error(e);
    throw e;
  }
}

function checkKeys(roundTracker, n) {
  for (let key in roundTracker) {
    if (typeof roundTracker[key] === "boolean") continue;
    if (typeof roundTracker[key] === "object") {
      let keys = Object.keys(roundTracker[key]);
      if (keys.length < n - 1 || keys.length > n) {
        return false;
      }
      continue;
    }
    return false;
  }
  return true;
}

function allTrue(obj) {
  if (typeof obj !== "object") return false;
  if (obj === null || obj === undefined) return false;
  for (let key in obj) {
    if (obj[key] !== true) return false;
  }
  return true;
}

module.exports = {
  createRoundTracker,
  getTagInfo,
  roundRunner,
};
