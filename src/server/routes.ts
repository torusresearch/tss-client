import axios from "axios";
import * as BN from "bn.js";
import crypto from "crypto";
import express from "express";
import * as tss from "tss-lib";

import { wsNotify, wsSend } from "./sockets";

const router = express.Router();

const shares = {};
const signers = {};
const rngs = {};
const msgQueue = [];
const addressBook = {};
const precomputes = {};

const _lookupEndpoint = (session, index) => {
  const address = addressBook[`${session}@${index}`];
  if (address === undefined) {
    throw new Error(`could not find address in address book, did you add it? Session: ${session}, index: ${index}`);
  }
  return address;
};

const _getWebSocketID = (websocketEndpoint) => {
  return websocketEndpoint.split(":")[1];
};

console.log("server starting");

globalThis.js_send_msg = async function (session, self_index, party, msg_type, msg_data) {
  try {
    console.log("sending message", party, msg_type, msg_data);
    const endpoint = _lookupEndpoint(session, party);
    console.log("endpoint is ", endpoint);
    if (endpoint.indexOf("websocket") !== -1) {
      await wsSend(_getWebSocketID(endpoint), session, self_index, party, msg_type, msg_data);
      return true;
    }
    await axios.post(`${endpoint}/send`, {
      session,
      sender: self_index,
      recipient: party,
      msg_type,
      msg_data,
    });
    return true;
  } catch (e) {
    console.error(e);
    throw new Error(e.toString());
  }
};

globalThis.js_read_msg = async function (session, self_index, party, msg_type) {
  console.log("reading message", party, msg_type);
  try {
    const mm = msgQueue.find((m) => m.session === session && m.sender === party && m.recipient === self_index && m.msg_type === msg_type);
    if (!mm) {
      return await new Promise((resolve) => {
        const timer = setInterval(() => {
          const found = msgQueue.find((m) => m.session === session && m.sender === party && m.recipient === self_index && m.msg_type === msg_type);
          if (found !== undefined) {
            clearInterval(timer);
            resolve(found.msg_data);
          }
        }, 100);
      });
    }
    return mm.msg_data;
  } catch (e) {
    console.error(e);
    throw new Error(e.toString());
  }
};
// router.post("/subscribeReady", async (req, res) => {
//   const { websocketId, session } = req.body;
//   readySubscriptions[session] = websocketId;
//   res.sendStatus(200);
// });

router.post("/send", async (req, res) => {
  const { session, sender, recipient, msg_type, msg_data } = req.body;
  msgQueue.push({
    session,
    sender,
    recipient,
    msg_type,
    msg_data,
  });
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
  console.log("what is precompute params", session, parties, player_index, threshold, pubkey);
  const share = shares[session];
  if (share === undefined) {
    res.statusMessage = `Share not found for session ${session}`;
    res.status(400).end();
    return;
  }
  signers[session] = tss.threshold_signer(session, player_index, parties.length, threshold, share, pubkey);
  // const randomNum = BigInt(`0x${crypto.randomBytes(32).toString("hex")}`);
  const randomNum = new BN(crypto.randomBytes(32)).umod(new BN("18446744073709551615"));
  rngs[session] = tss.random_generator(randomNum.toString("hex"));
  res.sendStatus(200); // TODO: end request before processing..?
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

router.post("/sign", async (req, res) => {
  const { session, msg, hash_only } = req.body;
  const precompute = precomputes[session];
  if (precompute === undefined) {
    res.statusMessage = `Precompute not found for session ${session}`;
    res.status(400).end();
    return;
  }
  res.send({
    sig_frag: tss.local_sign(msg, hash_only, precompute),
  });
});

router.post("/cleanup", async (req, _) => {
  const { session } = req.body;
  console.log("session", session);
  // TODO: cleanup
});

export default router;
