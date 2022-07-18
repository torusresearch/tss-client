import express from "express";

import comm from "../shared/comm";
import methods from "../shared/methods";
import Round from "../shared/rounds";
import fsDB from "./fs_db";
import { wsBroadcast, wsNotify, wsSend } from "./sockets";
import { work } from "./worker";

const round = new Round(work);

const { generateNodeInfo, setShare, getGwi, getPublicParams, setTagInfo, tssSign, getSignature, getTimer, resetTimer } = methods(round);

const port = process.argv[2];
const router = express.Router();
const nodeKey = port;
const { serverBroadcast, serverSend } = comm(wsSend, wsBroadcast, null);

const db = fsDB(`${port}`);

router.post("/registerWSEndpoint", async (req, res) => {
  const { websocketId, tag, endpointName } = req.body;
  await db.set(`tag-${tag}:name-${endpointName}:ws`, websocketId);
  res.sendStatus(200);
});

router.post("/subscribeReady", async (req, res) => {
  const { websocketId, tag } = req.body;
  await db.set(`tag-${tag}:ready`, websocketId);
  res.sendStatus(200);
});

router.post("/broadcast", async (req, res) => {
  const { tag, key, value, sender } = req.body;
  console.log("broadcast received", key, value, sender);
  await db.set(key, value);
  res.sendStatus(200);
  const roundName = round.getRound(key);
  await round.roundRunner({
    nodeKey,
    db,
    tag,
    roundName,
    party: sender,
    serverSend,
    serverBroadcast,
    wsNotify,
  });
});

router.post("/send", async (req, res) => {
  const { tag, key, value, sender } = req.body;
  console.log("send received", key, value, sender);
  await db.set(key, value);
  res.sendStatus(200);
  const roundName = round.getRound(key);
  round.roundRunner({
    nodeKey,
    db,
    tag,
    roundName,
    party: sender,
    serverSend,
    serverBroadcast,
    wsNotify,
  });
});

router.post("/start", async (req, res) => {
  const { tag } = req.body;
  const roundName = round.getRound("start");
  await round.roundRunner({
    nodeKey,
    db,
    tag,
    roundName,
    party: undefined,
    serverSend,
    serverBroadcast,
    wsNotify,
  });
  res.sendStatus(200);
});

router.get("/generate_node_info/:index", async (req, res) => {
  const { index } = req.params;
  await generateNodeInfo(db, nodeKey, index);
  res.sendStatus(200);
});

router.post("/share", async (req, res) => {
  const { tag, share } = req.body;
  await setShare(db, tag, share);
  res.sendStatus(200);
});

router.get("/gwi/:tag", async (req, res) => {
  const { tag } = req.params;
  const commitment = await getGwi(db, tag);
  res.send({ commitment });
});

router.get("/get_public_params", async (req, res) => {
  const { h1h2Ntilde, ek } = await getPublicParams(db, nodeKey);
  res.send({
    h1h2Ntilde,
    ek,
  });
});

router.post("/set_tag_info/:tag", async (req, res) => {
  const { tag } = req.params;
  const { pubkey, endpoints, parties, gwis, eks, h1h2Ntildes } = req.body;
  await setTagInfo(db, nodeKey, tag, pubkey, endpoints, parties, gwis, eks, h1h2Ntildes);
  res.sendStatus(200);
});

router.post("/sign", async (req, res) => {
  const { tag, msg_hash } = req.body;
  const { s_i } = await tssSign(db, nodeKey, tag, msg_hash);
  res.send({ s_i });
});

router.post("/get_signature", async (req, res) => {
  const { s_is, tag, msg_hash } = req.body;
  console.log("getting signature", { s_is, msg_hash });
  const sig = await getSignature(db, nodeKey, tag, s_is, msg_hash);
  res.send({ sig });
});

router.post("/get_timer", async (req, res) => {
  console.log("getting timer");
  const r = await getTimer();
  console.log(r);
  res.send({ r });
});

router.post("/reset_timer", async (req, res) => {
  console.log("resetting timer");
  const r = await resetTimer();
  res.send({ r });
});

export default router;
