import * as BN from "bn.js";
import crypto from "crypto";
import express from "express";
import keccak256 from "keccak256";
import * as tss from "tss-lib";

import { addressBook, precomputes, rngs, shares, signers } from "./mem_db";
import msgQueue from "./queue";
import { wsNotify } from "./utils";

const router = express.Router();

router.post("/send", async (req, res) => {
  try {
    const { session, sender, recipient, msg_type, msg_data } = req.body;
    const pendingRead = global.pendingReads[`session-${session}:sender-${sender}:recipient-${recipient}:msg_type-${msg_type}`];
    if (pendingRead !== undefined) {
      pendingRead(msg_data);
    } else {
      msgQueue.publish({
        session,
        sender,
        recipient,
        msg_type,
        msg_data,
      });
    }
    res.sendStatus(200);
  } catch (e) {
    res.statusMessage = `Error during /send: ${e}`;
    res.status(400).end();
  }
});

router.post("/retrieve_precompute", async (req, res) => {
  const { session } = req.body;
  res.send({
    precompute: precomputes[session],
  });
});

router.post("/precompute", async (req, res) => {
  try {
    const { session, endpoints, parties, player_index, threshold, pubkey, notifyWebsocketId } = req.body;
    for (let i = 0; i < endpoints.length; i++) {
      addressBook[`${session}@${i}`] = endpoints[i];
    }
    // console.log("what is precompute params", session, parties, player_index, threshold, pubkey);
    const share = shares[session];
    if (share === undefined) {
      res.statusMessage = `Share not found for session ${session}`;
      res.status(400).end();
      return;
    }
    signers[session] = tss.threshold_signer(session, player_index, parties.length, threshold, share, pubkey);
    // const randomNum = BigInt(`0x${crypto.randomBytes(32).toString("hex")}`);
    const randomNum = new BN(crypto.randomBytes(32)).umod(new BN("18446744073709551615")); // TODO: fix, this is only 64 bit entropy
    rngs[session] = tss.random_generator(randomNum.toString("hex"));
    res.sendStatus(200);
    await tss.setup(signers[session], rngs[session]);
    precomputes[session] = await tss.precompute(parties, signers[session], rngs[session]);
    delete rngs[session];
    delete signers[session];
    msgQueue.clear(session);
    await wsNotify(notifyWebsocketId, player_index, session);
  } catch (e) {
    res.statusMessage = `Error during /precompute: ${e}`;
    res.status(400).end();
  }
});

router.post("/sign", async (req, res) => {
  try {
    const { session, msg, hash_only, original_message, hash_algo } = req.body;

    // check message hashing
    if (hash_only) {
      if (hash_algo === "keccak256") {
        if (keccak256(original_message).toString("base64") !== msg) {
          throw new Error("hash of original message does not match msg");
        }
      } else {
        throw new Error(`hash algo ${hash_algo} not supported`);
      }
    }

    // TODO: add additional security policies for message validation

    const sig = tss.local_sign(msg, hash_only, precomputes[session]);
    res.send({ sig });
  } catch (e) {
    res.statusMessage = `Error during /sign: ${e}`;
    res.status(400).end();
  }
});

router.post("/share", async (req, res) => {
  const { session, share } = req.body;
  shares[session] = share;
  res.sendStatus(200);
});

router.post("/cleanup", async (req, res) => {
  const { session } = req.body;
  delete precomputes[session];
  res.sendStatus(200);
});

export default router;
