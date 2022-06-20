const getTagInfo = async function (db, tag) {
  let tagInfo = await db.get(`tag-${tag}:info`);
  return JSON.parse(tagInfo);
};

const { work, workerNum } = require("./work");

function createRoundTracker(parties) {
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
    roundTracker.round_2_MessageA_sent[party.toString()] = false;
  });

  // round 2 message A received
  roundTracker.round_2_MessageA_received = {};
  parties.map((party) => {
    roundTracker.round_2_MessageA_received[party.toString()] = false;
  });

  // round 2 message Bs gamma sent
  roundTracker.round_2_MessageBs_gamma_sent = {};
  parties.map((party) => {
    roundTracker.round_2_MessageBs_gamma_sent[party.toString()] = false;
  });

  // round 2 message Bs gamma received
  roundTracker.round_2_MessageBs_gamma_received = {};
  parties.map((party) => {
    roundTracker.round_2_MessageBs_gamma_received[party.toString()] = false;
  });

  // round 2 message Bs w sent
  roundTracker.round_2_MessageBs_w_sent = {};
  parties.map((party) => {
    roundTracker.round_2_MessageBs_w_sent[party.toString()] = false;
  });

  // round 2 message Bs w received
  roundTracker.round_2_MessageBs_w_received = {};
  parties.map((party) => {
    roundTracker.round_2_MessageBs_w_received[party.toString()] = false;
  });

  // round 2 message Alphas generated
  roundTracker.round_2_Alphas = {};
  parties.map((party) => {
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
  roundTrack.round_6_Rsigmai_verified = false;

  // round 7
  roundTracker.round_7 = false;

  return roundTracker;
}

const roundTrackerLocks = {};

// the purpose of roundRunner is to prevent duplicate messages from being sent
// it does not prevent duplicate messages from being received
async function roundRunner(
  db,
  tag,
  roundName,
  party,
  serverSend,
  serverBroadcast
) {
  let resolve, reject;
  if (db === undefined || tag === undefined || roundName === undefined) {
    throw new Error(
      `undefined arguments for roundRunner: ${db}, ${tag}, ${roundName}`
    );
  }
  // acquire lock on tag
  if (roundTrackerLocks[tag] === undefined) {
    roundTrackerLocks[tag] = new Promise((res, rej) => {
      resolve = () => {
        delete roundTrackerLocks[tag]; // release lock
        res();
      };
      reject = () => {
        delete roundTrackerLocks[tag]; // release lock
        rej();
      };
    });
  } else {
    // wait to acquire lock
    await roundTrackerLocks[tag];
    return roundRunner(db, tag, roundName, party, serverSend, serverBroadcast);
  }

  let roundTracker = JSON.parse(await db.get(`tag-${tag}:rounds`));
  let { parties, endpoints, eks, h1h2Ntildes } = await getTagInfo(db, tag);

  if (!checkKeys(roundTracker, parties.length)) {
    throw new Error("roundTracker is invalid");
  }

  if (roundName === "round_1_commitment_broadcast") {
    if (roundTracker.round_1_commitment_broadcast === false) {
      roundTracker.round_1_commitment_broadcast = true;
      await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
      resolve();
      // run round 1 here
      let index = await db.get(`${nodeKey}:index`);
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
      await serverBroadcast(tag, endpoints, `node-${index}:${tag}:com`, com);
      return;
    }
    return reject(
      new Error("round 1 commitment broadcast has already been sent")
    );
  } else if (roundName === "round_1_commitment_received") {
    if (party === undefined)
      return reject(new Error("round 1 commitment received from unknown"));
    roundTracker.round_1_commitment_received[party] = true;
    // check if all commitments have been received
    if (allTrue(roundTracker.round_1_commitment_received)) {
      for (let p in parties) {
        if (roundTracker.round_2_MessageA_sent[p] === true) {
          return reject(
            `round 2 message A has already been sent for party ${p}`
          );
        }
        roundTracker.round_2_MessageA_sent[p] = true;
      }
      await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
      resolve();
      // run round 2 message A sending here
      let awaiting = [];
      for (let i = 0; i < parties.length; i++) {
        let party = parties[i];
        if (party === index) continue;
        awaiting.push(
          work(workerNum(), "message_A", [k_i, ek, h1h2Ntildes[i]]).then(
            (res) => {
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
                ),
              ]);
            }
          )
        );
      }
      await Promise.all(awaiting);
      return;
    }
    await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
    resolve();
  } else if (roundName === "round_2_MessageA_received") {
    // TODO: handle case where this arrives earlier than round 1 commitment
    if (party === undefined)
      return reject(new Error("round 2 message A received from unknown"));
    roundTracker.round_2_MessageA_received[party] = true;
    if (
      roundTracker.round_2_MessageBs_gamma_sent[party] === true ||
      roundTracker.round_2_MessageBs_w_sent === true
    ) {
      return reject(
        `round 2 message B gamma/w has already been sent for party ${party}, ${roundName}`
      );
    }
    roundTracker.round_2_MessageBs_gamma_sent[party] = true;
    roundTracker.round_2_MessageBs_w_sent[party] = true;
    await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
    resolve();
    // run round 2 message Bs sending here for party

    return;
  } else if (
    roundName === "round_2_MessageBs_gamma_received" ||
    roundName === "round_2_MessageBs_w_received"
  ) {
    if (party === undefined)
      return reject(new Error("round 2 message B received from unknown"));
    roundTracker[roundName][party] = true;
    if (
      allTrue(roundTracker.round_2_MessageBs_w_received) &&
      allTrue(roundTracker.round_2_MessageBs_gamma_received)
    ) {
      for (let p in parties) {
        if (roundTracker.round_2_Alphas[p] === true) {
          return reject(`round 2 alphas already generated for party ${p}`);
        }
        roundTracker.round_2_Alphas[p] = true;
        // TODO: can we resolve first to release the lock?
        // run round 2 alpha generation here
      }
      if (roundTracker.round_3_Delta_broadcast === true) {
        return reject(new Error("round 3 delta already broadcast"));
      }
      roundTracker.round_3_Delta_broadcast = true;
      await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
      resolve();
      // run round 3 delta broadcast
    }
    await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
    resolve();
  } else if (roundName === "round_3_Delta_received") {
    if (party === undefined)
      return reject(new Error("round 3 delta broadcast received from unknown"));
    roundTracker.round_3_Delta_broadcast[party] = true;
    if (allTrue(roundTracker.round_3_Delta_broadcast)) {
      if (roundTracker.round_4_Di_broadcast === true) {
        return reject(new Error("round 4 Di already broadcast"));
      }
      await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
      resolve();
      // run round 4 Di and blind broadcast
    }
    await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
    resolve();
  } else if (roundName === "round_4_Di_received") {
    if (party === undefined)
      return reject(new Error("round 4 received from unknown"));
    roundTracker.round_4_Di_received[party] = true;
    if (allTrue(roundTracker.round_4_Di_received)) {
      // run round 4 Di verify
      let verified = false;
      if (!verified) {
        return reject(new Error("round 4 Di verify failed"));
      }
      roundTracker.round_4_Di_verified = true;
      roundTracker.round_5_Rki_broadcast = true;
      await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
      resolve();
      // run round 5 Rki broadcast
    }
    await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
    resolve();
  } else if (roundName === "round_5_Rki_received") {
    if (party === undefined)
      return reject(new Error("round 5 received from unknown"));
    roundTracker.round_5_Rki_received[party] = true;
    if (allTrue(roundTracker.round_5_Rki_received)) {
      // run round 5 Rki verify
      let verified = false;
      if (!verified) {
        return reject(new Error("round 5 Rki verify failed"));
      }
      roundTracker.round_5_Rki_verified = true;
      roundTracker.round_6_Rsigmai_broadcast = true;
      await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
      resolve();
      // run round 6 Rsigmai broadcast
    }
    await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
    resolve();
  } else if (roundName === "round_6_Rsigmai_received") {
    if (party === undefined)
      return reject(new Error("round 6 received from unknown"));
    roundTracker.round_6_Rsigmai_received[party] = true;
    if (allTrue(roundTrack.round_6_Rsigmai_received)) {
      // run round 6 verify
      let verified = false;
      if (!verified) {
        return reject(new Error("round 6 Rsigmai verify failed"));
      }
      roundTracker.round_6_Rsigmai_verified = true;
      await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
      resolve();
    }
    await db.set(`tag-${tag}:rounds`, JSON.stringify(roundTracker));
    resolve();
  } else {
    return reject(`roundName ${roundName} not found`);
  }
}

function checkKeys(roundTracker, n) {
  for (let key in roundTracker) {
    if (typeof roundTracker[key] === "boolean") continue;
    if (typeof roundTracker[key] === "object") {
      if (Object.keys(roundTrack[key]).length !== n) return false;
      continue;
    }
    return false;
  }
  return true;
}

function allTrue(obj) {
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
