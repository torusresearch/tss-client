import axios from "axios";
import * as BN from "bn.js";
import crypto from "crypto";
import express from "express";
import keccak256 from "keccak256";
import * as tss from "tss-lib";

import msgQueue from "./queue";
import { getEmitterInstance } from "./sockets";

const router = express.Router();
const shares = {};
const signers = {};
const rngs = {};
const addressBook = {};
const precomputes = {};

const wsNotify = async (websocketId: string, player_index: number, session: string) => {
  const io = getEmitterInstance();
  let resolve;
  const p = new Promise((r) => (resolve = r));
  io.to(websocketId).emit(
    "precompute_complete",
    {
      party: player_index,
      session,
    },
    resolve
  );
  return p;
};

const wsSend = async (websocketId: string, session: string, self_index: number, party: number, msg_type: string, msg_data: string) => {
  const io = getEmitterInstance();
  let resolve;
  const p = new Promise((r) => (resolve = r));
  // const socket = connections[websocketId];
  // console.log(`socket sending message ${msg_type}`);
  io.to(websocketId).emit(
    "send",
    {
      session,
      sender: self_index,
      recipient: party,
      msg_type,
      msg_data,
    },
    resolve
  );
  return p;
};

const _lookupEndpoint = (session: string, index: number) => {
  const address = addressBook[`${session}@${index}`];
  if (address === undefined) {
    throw new Error(`could not find address in address book, did you add it? Session: ${session}, index: ${index}`);
  }
  return address;
};

const _getWebSocketID = (websocketEndpoint: string) => {
  return websocketEndpoint.split(":")[1];
};

globalThis.pendingReads = {};

globalThis.js_send_msg = async function (session: string, self_index: number, party: number, msg_type: string, msg_data: string) {
  try {
    const endpoint = _lookupEndpoint(session, party);
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

globalThis.js_read_msg = async function (session: string, self_index: number, party: number, msg_type: string) {
  // console.log("reading message", party, msg_type);
  if (msg_type === "ga1_worker_support") return "not supported";
  try {
    const mm = msgQueue.messages.find((m) => m.session === session && m.sender === party && m.recipient === self_index && m.msg_type === msg_type);
    if (!mm) {
      return await new Promise((resolve) => {
        globalThis.pendingReads[`session-${session}:sender-${party}:recipient-${self_index}:msg_type-${msg_type}`] = resolve;
      });
    }
    return mm.msg_data;
  } catch (e) {
    console.error(e);
    throw new Error(e.toString());
  }
};

router.post("/send", async (req, res) => {
  try {
    const { session, sender, recipient, msg_type, msg_data } = req.body;
    const pendingRead = globalThis.pendingReads[`session-${session}:sender-${sender}:recipient-${recipient}:msg_type-${msg_type}`];
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
    res.statusMessage = `Error during /send: ${e}`;
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
    res.statusMessage = `Error during /send: ${e}`;
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
