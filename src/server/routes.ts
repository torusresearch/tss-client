import * as BN from "bn.js";
import crypto from "crypto";
import express from "express";
import * as tss from "tss-lib";

import { addressBook, precomputes, rngs, shares, signers } from "./mem_db";
import msgQueue from "./queue";
import { wsNotify } from "./utils";

const router = express.Router();

router.post("/send", async (req, res) => {
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
});

router.post("/retrieve_precompute", async (req, res) => {
  const { session } = req.body;
  res.send({
    precompute: precomputes[session],
  });
});

router.post("/precompute", async (req, res) => {
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
  await wsNotify(notifyWebsocketId, player_index, session);

  // TODO: cleanup
});

router.post("/share", async (req, res) => {
  const { session, share } = req.body;
  shares[session] = share;
  res.sendStatus(200);
});

router.post("/cleanup", async (req, _) => {
  const { session } = req.body;
  console.log("session", session);
  // TODO: cleanup
});

export default router;
