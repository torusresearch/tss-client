const express = require("express");
const app = express();
app.use(express.json());
app.use(express.static("public"));
const port = process.argv[2];
const nodeKey = port;
if (!port) {
  throw new Error("port not specified");
}
const { roundRunner, getRound } = require("./rounds");
const {
  generateNodeInfo,
  setShare,
  getGwi,
  getPublicParams,
  setTagInfo,
  tssSign,
  getSignature,
} = require("./methods");

const db = require("./mem_db")(`${port}`);
const { wsSend, wsBroadcast } = require("./socket.js");
const { serverBroadcast, serverSend } = require("./comm")(wsSend, wsBroadcast);

app.post("/registerWSEndpoint", async (req, res) => {
  const { websocketId, tag, endpointName } = req.body
  await db.set(`tag-${tag}:name-${endpointName}:ws`, websocketId)
  res.sendStatus(200)
})

app.post("/subscribeReady", async (req, res) => {
  const { websocketId, tag } = req.body;
  await db.set(`tag-${tag}:ready`, websocketId)
  res.sendStatus(200)
})

app.post("/broadcast", async (req, res) => {
  const { tag, key, value, sender } = req.body;
  console.log("broadcast received", key, value, sender);
  await db.set(key, value);
  res.sendStatus(200);
  const roundName = getRound(key);
  roundRunner(nodeKey, db, tag, roundName, sender, serverSend, serverBroadcast);
});

app.post("/send", async (req, res) => {
  const { tag, key, value, sender } = req.body;
  console.log("send received", key, value, sender);
  await db.set(key, value);
  res.sendStatus(200);
  const roundName = getRound(key);
  roundRunner(nodeKey, db, tag, roundName, sender, serverSend, serverBroadcast);
});

app.post("/start", async (req, res) => {
  const { tag } = req.body;
  const roundName = getRound("start");
  await roundRunner(
    nodeKey,
    db,
    tag,
    roundName,
    undefined,
    serverSend,
    serverBroadcast
  );
  res.sendStatus(200);
});

app.get("/generate_node_info/:index", async (req, res) => {
  let index = req.params.index;
  await generateNodeInfo(db, nodeKey, index);
  res.sendStatus(200);
});

app.post("/share", async (req, res) => {
  let { tag, share } = req.body;
  await setShare(db, tag, share);
  res.sendStatus(200);
});

app.get("/gwi/:tag", async (req, res) => {
  let tag = req.params.tag;
  const commitment = await getGwi(db, tag);
  res.send({ commitment });
});

app.get("/get_public_params", async (req, res) => {
  const { h1h2Ntilde, ek } = await getPublicParams(db, nodeKey);
  res.send({
    h1h2Ntilde,
    ek,
  });
});

app.post("/set_tag_info/:tag", async (req, res) => {
  let tag = req.params.tag;
  let { pubkey, endpoints, parties, gwis, eks, h1h2Ntildes } = req.body;
  await setTagInfo(
    db,
    nodeKey,
    tag,
    pubkey,
    endpoints,
    parties,
    gwis,
    eks,
    h1h2Ntildes
  );
  res.sendStatus(200);
});

app.post("/sign", async (req, res) => {
  let { tag, msg_hash } = req.body;
  let { s_i, local_sig } = await tssSign(db, nodeKey, tag, msg_hash);
  res.send({ s_i });
});

app.post("/get_signature", async (req, res) => {
  let { s_is, tag, msg_hash } = req.body;
  let sig = await getSignature(db, nodeKey, tag, s_is, msg_hash);
  res.send({ sig });
});

(async () => {
  console.log("app listening on port", port);
  app.listen(port);
})();
