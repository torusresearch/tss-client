import * as tssLib from "tss-lib";

const tssProxy = new Proxy(tssLib, {
  get: (target, prop) => {
    if (typeof target[prop] === "function") {
      return function () {
        console.log("tss method", prop, "is being called with args", JSON.stringify(arguments));
        return target[prop](...arguments);
      };
    }
    return target[prop];
  },
});

const roundTrackerLocks = {};

export default class Rounds {
  constructor(private _worker) {}

  createRoundTracker = (parties, selfIndex) => {
    const roundTracker = {} as Record<string, unknown>;

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
      if (selfIndex.toString() !== party.toString()) roundTracker.round_2_MessageA_sent[party.toString()] = false;
    });

    // round 2 message A received
    roundTracker.round_2_MessageA_received = {};
    parties.map((party) => {
      if (selfIndex.toString() !== party.toString()) roundTracker.round_2_MessageA_received[party.toString()] = false;
    });

    // round 2 message Bs gamma sent
    roundTracker.round_2_MessageBs_gamma_sent = {};
    parties.map((party) => {
      if (selfIndex.toString() !== party.toString()) roundTracker.round_2_MessageBs_gamma_sent[party.toString()] = false;
    });

    // round 2 message Bs gamma received
    roundTracker.round_2_MessageBs_gamma_received = {};
    parties.map((party) => {
      if (selfIndex.toString() !== party.toString()) roundTracker.round_2_MessageBs_gamma_received[party.toString()] = false;
    });

    // round 2 message Bs w sent
    roundTracker.round_2_MessageBs_w_sent = {};
    parties.map((party) => {
      if (selfIndex.toString() !== party.toString()) roundTracker.round_2_MessageBs_w_sent[party.toString()] = false;
    });

    // round 2 message Bs w received
    roundTracker.round_2_MessageBs_w_received = {};
    parties.map((party) => {
      if (selfIndex.toString() !== party.toString()) roundTracker.round_2_MessageBs_w_received[party.toString()] = false;
    });

    // round 2 message Alphas generated
    roundTracker.round_2_Alphas = {};
    parties.map((party) => {
      if (selfIndex.toString() !== party.toString()) roundTracker.round_2_Alphas[party.toString()] = false;
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
      if (selfIndex.toString() !== party.toString()) roundTracker.round_5_proof_pdl_sent[party.toString()] = false;
    });

    // round 5 proof pdl recieved
    roundTracker.round_5_proof_pdl_received = {};
    parties.map((party) => {
      if (selfIndex.toString() !== party.toString()) roundTracker.round_5_proof_pdl_received[party.toString()] = false;
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
  };

  // the purpose of roundRunner is to prevent duplicate messages from being sent
  // it does not prevent duplicate messages from being received
  roundRunner = async ({
    nodeKey,
    db,
    tag,
    roundName,
    party,
    serverSend,
    serverBroadcast,
    wsNotify = (..._args) => {},
    clientReadyResolve = null,
    tss = tssProxy,
  }) => {
    let release;
    try {
      if (db === undefined || tag === undefined || roundName === undefined) {
        throw new Error(`undefined arguments for roundRunner: ${JSON.stringify({ db, tag, roundName })}`);
      }
      // acquire lock on tag
      if (roundTrackerLocks[tag] === undefined) {
        roundTrackerLocks[tag] = new Promise<void>((res) => {
          release = () => {
            delete roundTrackerLocks[tag]; // release lock
            res();
          };
        });
      } else {
        // wait to acquire lock
        await roundTrackerLocks[tag].then();
        return this.roundRunner({
          nodeKey,
          db,
          tag,
          roundName,
          party,
          serverSend,
          serverBroadcast,
          wsNotify,
          clientReadyResolve,
          tss,
        });
      }

      const roundTracker = JSON.parse(await db.get(`tag-${tag}:rounds`));
      if (roundTracker === undefined) {
        throw new Error("could not get roundTracker");
      }
      const { parties, endpoints, eks, h1h2Ntildes, gwis, pubkey } = await this.getTagInfo(db, tag);
      const index = parseInt(await db.get(`${nodeKey}:index`));

      if (!this._checkKeys(roundTracker, parties.length)) {
        throw new Error(`roundTracker is invalid, expected parties length to be ${parties.length}, roundTracker ${JSON.stringify(roundTracker)}`);
      }

      if (roundName === "round_1_commitment_broadcast") {
        if (roundTracker.round_1_commitment_broadcast === false) {
          roundTracker.round_1_commitment_broadcast = true;
          await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
          release();
          // run round 1 here
          const gamma_i = tss.random_bigint();
          const [com, blind_factor, g_gamma_i] = tss.phase_1_broadcast(gamma_i);
          const k_i = tss.random_bigint();
          await Promise.all([
            db.set(`${nodeKey}:${tag}:com`, com),
            db.set(`${nodeKey}:${tag}:blind_factor`, blind_factor),
            db.set(`${nodeKey}:${tag}:g_gamma_i`, g_gamma_i),
            db.set(`${nodeKey}:${tag}:k_i`, k_i),
            db.set(`${nodeKey}:${tag}:gamma_i`, gamma_i),
          ]);
          await serverBroadcast(index, parties, tag, endpoints, `node-${index}:${tag}:com`, com);
          return;
        }
        throw new Error("round 1 commitment broadcast has already been sent");
      } else if (roundName === "round_1_commitment_received") {
        if (party === undefined) {
          throw new Error("round 1 commitment received from unknown");
        }
        roundTracker.round_1_commitment_received[party] = true;
        // check if all commitments have been received
        if (this._allTrue(roundTracker.round_1_commitment_received)) {
          for (let i = 0; i < parties.length; i++) {
            const p = parties[i].toString();
            if (p === index.toString()) continue;
            if (roundTracker.round_2_MessageA_sent[p] === true) {
              throw new Error(`round 2 message A has already been sent for party ${p}`);
            }
            roundTracker.round_2_MessageA_sent[p] = true;
          }
          await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
          release();
          // run round 2 message A sending here
          const k_i = await db.get(`${nodeKey}:${tag}:k_i`);
          const ek = await db.get(`${nodeKey}:ek`);
          const awaiting = [];
          for (let i = 0; i < parties.length; i++) {
            const p = parties[i].toString();
            if (p === index.toString()) continue;
            const endpoint = endpoints[i];
            awaiting.push(
              this._worker("message_A", [k_i, ek, h1h2Ntildes[i]]).then((res) => {
                const [msgA, msgA_randomness] = res;
                return Promise.all([
                  db.set(`tag-${tag}:from-${index}:to-${p}:m_a`, msgA),
                  db.set(`tag-${tag}:from-${index}:to-${p}:m_a_randomness`, msgA_randomness),
                ]).then(() => {
                  return serverSend(index, tag, endpoint, `tag-${tag}:from-${index}:to-${p}:m_a`, msgA);
                });
              })
            );
          }
          await Promise.all(awaiting);
          return;
        }
        await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
        release();
      } else if (roundName === "round_2_MessageA_received") {
        // TODO: handle case where this arrives earlier than round 1 commitment
        if (party === undefined) throw new Error("round 2 message A received from unknown");
        roundTracker.round_2_MessageA_received[party] = true;
        if (roundTracker.round_2_MessageBs_gamma_sent[party] === true || roundTracker.round_2_MessageBs_w_sent[party] === true) {
          throw new Error(`round 2 message B gamma/w has already been sent for party ${party}, ${roundName}`);
        }
        roundTracker.round_2_MessageBs_gamma_sent[party] = true;
        roundTracker.round_2_MessageBs_w_sent[party] = true;
        // run round 2 message Bs sending here for party
        const gamma_i = await db.get(`${nodeKey}:${tag}:gamma_i`);
        const w_i = await db.get(`tag-${tag}:share`);
        const h1h2Ntilde = await db.get(`${nodeKey}:h1h2Ntilde`);
        const i = parties.indexOf(party);
        const endpoint = endpoints[i];
        const ek = eks[i];
        const msgA = await db.get(`tag-${tag}:from-${party}:to-${index}:m_a`);
        let promResolve;
        const prom = new Promise((r) => (promResolve = r));
        this._worker("message_Bs", [gamma_i, w_i, ek, msgA, h1h2Ntilde])
          .then((res) => {
            const [m_b_gamma, beta_gamma, beta_randomness, beta_tag, m_b_w, beta_wi] = res;
            return Promise.all([
              db.set(`tag-${tag}:from-${index}:to-${party}:m_b_gamma`, m_b_gamma),
              db.set(`tag-${tag}:from-${index}:to-${party}:beta_gamma`, beta_gamma),
              db.set(`tag-${tag}:from-${index}:to-${party}:beta_randomness`, beta_randomness),
              db.set(`tag-${tag}:from-${index}:to-${party}:beta_tag`, beta_tag),
              db.set(`tag-${tag}:from-${index}:to-${party}:m_b_w`, m_b_w),
              db.set(`tag-${tag}:from-${index}:to-${party}:beta_wi`, beta_wi),
            ]).then(() => {
              return Promise.all([
                serverSend(index, tag, endpoint, `tag-${tag}:from-${index}:to-${party}:m_b_gamma`, m_b_gamma),
                serverSend(index, tag, endpoint, `tag-${tag}:from-${index}:to-${party}:m_b_w`, m_b_w),
              ]);
            });
          })
          .then(promResolve);
        await prom;
        await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
        release();
        await this.roundRunner({
          nodeKey,
          db,
          tag,
          roundName: "round_2_MessageBs_gamma_sent",
          party: undefined,
          serverSend,
          serverBroadcast,
          wsNotify,
          clientReadyResolve,
        });
        return;
      } else if (
        roundName === "round_2_MessageBs_gamma_received" ||
        roundName === "round_2_MessageBs_w_received" ||
        roundName === "round_2_MessageBs_gamma_sent" ||
        roundName === "round_2_MessageBs_w_sent"
      ) {
        if (roundName === "round_2_MessageBs_gamma_received" || roundName === "round_2_MessageBs_w_received") {
          if (party === undefined) {
            throw new Error("round 2 message B received from unknown");
          }

          roundTracker[roundName][party] = true;
        }
        if (
          this._allTrue(roundTracker.round_2_MessageBs_w_received) &&
          this._allTrue(roundTracker.round_2_MessageBs_gamma_received) &&
          this._allTrue(roundTracker.round_2_MessageBs_gamma_sent) &&
          this._allTrue(roundTracker.round_2_MessageBs_w_sent)
        ) {
          // update roundTracker and release lock
          for (let i = 0; i < parties.length; i++) {
            const p = parties[i].toString();
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
          const w_i = await db.get(`tag-${tag}:share`);
          const k_i = await db.get(`${nodeKey}:${tag}:k_i`);
          const gamma_i = await db.get(`${nodeKey}:${tag}:gamma_i`);
          const keys = await db.get(`${nodeKey}:keys`);

          let m_b_gammas = [];
          let m_b_ws = [];
          let beta_gammas = [];
          let beta_wis = [];
          for (let i = 0; i < parties.length; i++) {
            const p = parties[i].toString();
            if (p === index.toString()) continue;
            m_b_gammas.push(db.get(`tag-${tag}:from-${p}:to-${index}:m_b_gamma`));
            m_b_ws.push(db.get(`tag-${tag}:from-${p}:to-${index}:m_b_w`));
            beta_gammas.push(db.get(`tag-${tag}:from-${index}:to-${p}:beta_gamma`));
            beta_wis.push(db.get(`tag-${tag}:from-${index}:to-${p}:beta_wi`));
          }

          m_b_gammas = await Promise.all(m_b_gammas);
          m_b_ws = await Promise.all(m_b_ws);
          beta_gammas = await Promise.all(beta_gammas);
          beta_wis = await Promise.all(beta_wis);

          const [delta, sigma] = await this._worker("message_Alphas", [
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
          await Promise.all([db.set(`node-${index}:${tag}:delta`, delta), db.set(`${nodeKey}:${tag}:sigma`, sigma)]);
          await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
          release();
          await serverBroadcast(index, parties, tag, endpoints, `node-${index}:${tag}:delta`, delta);
          return;
        }
        await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
        release();
      } else if (roundName === "round_3_Delta_received") {
        if (party === undefined) throw new Error("round 3 delta broadcast received from unknown");
        roundTracker.round_3_Delta_received[party] = true;
        if (this._allTrue(roundTracker.round_3_Delta_received)) {
          if (roundTracker.round_4_Di_broadcast === true) {
            throw new Error("round 4 Di already broadcast");
          }
          roundTracker.round_4_Di_broadcast = true;
          await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
          release();
          // run deltaInv and round 4 Di and blind broadcast
          let deltas = [];
          for (let i = 0; i < parties.length; i++) {
            const p = parties[i].toString();
            deltas.push(db.get(`node-${p}:${tag}:delta`));
          }
          deltas = await Promise.all(deltas);
          const deltaInv = tss.phase_3_deltaInv(deltas);
          await db.set(`${nodeKey}:${tag}:delta_inv`, deltaInv);
          const D_i = await db.get(`${nodeKey}:${tag}:g_gamma_i`);
          const D_i_blind = await db.get(`${nodeKey}:${tag}:blind_factor`);
          await serverBroadcast(index, parties, tag, endpoints, `node-${index}:${tag}:D_i_and_blind`, JSON.stringify({ D_i, D_i_blind }));
          return;
        }
        await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
        release();
      } else if (roundName === "round_4_Di_received") {
        if (party === undefined) throw new Error("round 4 received from unknown");
        roundTracker.round_4_Di_received[party] = true;
        if (this._allTrue(roundTracker.round_4_Di_received)) {
          // run round 4 Di verify
          let b_proofs = [];
          let blind_factors = [];
          let g_gamma_is = [];
          let coms = [];

          for (let i = 0; i < parties.length; i++) {
            const p = parties[i].toString();
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
            const m_b_gamma = db.get(`tag-${tag}:from-${p}:to-${index}:m_b_gamma`).then(tss.get_b_proof);
            b_proofs.push(m_b_gamma);
          }

          g_gamma_is = await Promise.all(g_gamma_is);
          coms = await Promise.all(coms);
          blind_factors = await Promise.all(blind_factors);
          b_proofs = await Promise.all(b_proofs);

          const deltaInv = await db.get(`${nodeKey}:${tag}:delta_inv`);

          const R = tss.phase_4_Di_verify(coms, g_gamma_is, blind_factors, b_proofs, deltaInv, index, parties);
          await db.set(`${nodeKey}:${tag}:R`, R);
          roundTracker.round_4_Di_verified = true;
          roundTracker.round_5_Rki_broadcast = true;
          for (const party in roundTracker.round_5_proof_pdl_sent) {
            roundTracker.round_5_proof_pdl_sent[party] = true;
          }
          await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
          release();

          // run round 5 Rki broadcast
          const k_i = await db.get(`${nodeKey}:${tag}:k_i`);
          const keys = await db.get(`${nodeKey}:keys`);
          const m_as = [];
          const m_a_randoms = [];
          for (let i = 0; i < parties.length; i++) {
            const p = parties[i].toString();
            if (p === index.toString()) continue;
            m_as.push(await db.get(`tag-${tag}:from-${index}:to-${p}:m_a`));
            m_a_randoms.push(await db.get(`tag-${tag}:from-${index}:to-${p}:m_a_randomness`));
          }
          const proofs = tss.phase_5_Rki(R, k_i, m_as, m_a_randoms, h1h2Ntildes, keys, index, parties);
          const Rki = proofs.shift();

          for (let i = 0, passedIndex = false; i < parties.length; i++) {
            const p = parties[i].toString();
            if (p === index.toString()) {
              passedIndex = true;
              continue;
            }
            const ind = !passedIndex ? i : i - 1;
            const endpoint = endpoints[i];
            await db.set(`tag-${tag}:from-${index}:to-${p}:proof_pdl`, proofs[ind]);
            await serverSend(index, tag, endpoint, `tag-${tag}:from-${index}:to-${p}:proof_pdl`, proofs[ind]);
          }
          await serverBroadcast(index, parties, tag, endpoints, `node-${index}:${tag}:R_k_i`, Rki);
          return;
        }
        await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
        release();
      } else if (roundName === "round_5_Rki_received" || roundName === "round_5_proof_pdl_received") {
        if (party === undefined) throw new Error("round 5 received from unknown");
        roundTracker[roundName][party] = true;
        if (this._allTrue(roundTracker.round_5_Rki_received) && this._allTrue(roundTracker.round_5_proof_pdl_received)) {
          // run round 5 Rki verify
          const Rkis = [];
          const msgAs = [];
          const proofs = [];
          const proofs_Rkis = [];
          const h1h2Ntilde = await db.get(`${nodeKey}:h1h2Ntilde`);
          const R = await db.get(`${nodeKey}:${tag}:R`);

          for (let i = 0; i < parties.length; i++) {
            const p = parties[i].toString();
            Rkis.push(await db.get(`node-${p}:${tag}:R_k_i`));
            if (p === index.toString()) continue;
            proofs_Rkis.push(await db.get(`node-${p}:${tag}:R_k_i`));
            msgAs.push(await db.get(`tag-${tag}:from-${p}:to-${index}:m_a`));
            proofs.push(await db.get(`tag-${tag}:from-${p}:to-${index}:proof_pdl`));
          }
          const verify = tss.phase_5_verify(Rkis, eks, msgAs, proofs, proofs_Rkis, h1h2Ntilde, R, index, parties);
          if (!verify) {
            throw new Error("failed verification check for phase 5");
          }
          roundTracker.round_5_Rki_verified = true;
          roundTracker.round_6_Rsigmai_broadcast = true;
          await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
          release();
          // run round 6 Rsigmai broadcast
          const sigma_i = await db.get(`${nodeKey}:${tag}:sigma`);

          const Rsigmai = tss.phase_6_Rsigmai(R, sigma_i);
          await serverBroadcast(index, parties, tag, endpoints, `node-${index}:${tag}:S_i`, Rsigmai);
          return;
        }
        await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
        release();
      } else if (roundName === "round_6_Rsigmai_received") {
        if (party === undefined) throw new Error("round 6 received from unknown");
        roundTracker.round_6_Rsigmai_received[party] = true;
        if (this._allTrue(roundTracker.round_6_Rsigmai_received)) {
          // run round 6 verify
          const S_is = [];
          for (let i = 0; i < parties.length; i++) {
            const p = parties[i].toString();
            S_is.push(await db.get(`node-${p}:${tag}:S_i`));
          }
          const verify = tss.phase_6_verify(S_is, pubkey);
          if (!verify) {
            throw new Error("round 6 Rsigmai verify failed");
          }
          roundTracker.round_6_Rsigmai_verified = true;
          await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
          release();
          if (clientReadyResolve !== null && typeof clientReadyResolve === "function") {
            clientReadyResolve();
          }

          // notify subscriber that online phase is complete
          const subscribeReady = await db.get(`tag-${tag}:ready`);
          if (subscribeReady) {
            await wsNotify(index, tag, subscribeReady, "online_phase", "complete");
          }
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
  };

  getTagInfo = async function (db, tag) {
    const tagInfo = await db.get(`tag-${tag}:info`);
    return JSON.parse(tagInfo);
  };

  getRound = (key) => {
    const segments = key.split(":");
    if (key.indexOf("start") !== -1) {
      return "round_1_commitment_broadcast";
    }
    if (segments[segments.length - 1] === "com") {
      return "round_1_commitment_received";
    }
    if (segments[segments.length - 1] === "m_a") {
      return "round_2_MessageA_received";
    }
    if (segments[segments.length - 1] === "m_b_gamma") {
      return "round_2_MessageBs_gamma_received";
    }
    if (segments[segments.length - 1] === "m_b_w") {
      return "round_2_MessageBs_w_received";
    }
    if (segments[segments.length - 1] === "delta") {
      return "round_3_Delta_received";
    }
    if (segments[segments.length - 1] === "D_i_and_blind") {
      return "round_4_Di_received";
    }
    if (segments[segments.length - 1] === "proof_pdl") {
      return "round_5_proof_pdl_received";
    }
    if (segments[segments.length - 1] === "R_k_i") {
      return "round_5_Rki_received";
    }
    if (segments[segments.length - 1] === "S_i") {
      return "round_6_Rsigmai_received";
    }
    throw new Error(`could not identify round name ${JSON.stringify({ key })}`);
  };

  private _checkKeys(roundTracker, n) {
    for (const key in roundTracker) {
      if (typeof roundTracker[key] === "boolean") continue;
      if (typeof roundTracker[key] === "object") {
        const keys = Object.keys(roundTracker[key]);
        if (keys.length < n - 1 || keys.length > n) {
          return false;
        }
        continue;
      }
      return false;
    }
    return true;
  }

  private _allTrue(obj) {
    if (typeof obj !== "object") return false;
    if (obj === null || obj === undefined) return false;
    for (const key in obj) {
      if (obj[key] !== true) return false;
    }
    return true;
  }
}
