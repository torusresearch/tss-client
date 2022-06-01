const { default: axios } = require("axios");
const express = require("express");
const { set } = require("lodash");
const app = express();
app.use(express.json());
const port = process.argv[2];
const nodeKey = port;
if (!port) {
  throw new Error("port not specified");
}
const tss = require("tss-lib");

const db = require("./db")(`${port}`);

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
    db.set("index", req.params.index),
    db.set("keys", keys),
    db.set("ek", ek),
    db.set("h1h2Ntilde", h1h2Ntilde),
  ]);
  res.sendStatus(200);
});

app.post("/share", async (req, res) => {
  let { user, share } = req.body;
  await db.set(`user-${user}:share`, share);
  let gwi = tss.scalar_mul(tss.generator(), share);

  res.send(gwi);
});

app.get("/share/:user", async (req, res) => {
  res.send(await db.get(`share:${req.params.user}`));
});

app.get("/get_h1h2Ntilde", async (req, res) => {
  res.send(await db.get(`h1h2Ntilde`));
});

app.get("/get_paillier_ek", async (req, res) => {
  res.send(await db.get("ek"));
});

app.post("/pubkey/:user", async (req, res) => {
  let { X, Y } = req.body;
  let serialized_coords = tss.coords_to_pt(X, Y);
  await db.set(`user-${req.params.user}:pubkey`, serialized_coords);
  res.sendStatus(200);
});

app.post("/round_1", async (req, res) => {
  let { endpoints, user } = req.body; // TODO: get from db
  let gamma_i = tss.random_bigint();
  let [com, blind_factor, g_gamma_i] = tss.phase_1_broadcast(gamma_i);
  let k_i = tss.random_bigint();
  await Promise.all([
    db.set(`${nodeKey}:${user}:com`, com),
    db.set(`${nodeKey}:${user}:blind_factor`, blind_factor),
    db.set(`${nodeKey}:${user}:g_gamma_i`, g_gamma_i),
    db.set(`${nodeKey}:${user}:k_i`, k_i),
    db.set(`${nodeKey}:${user}:gamma_i`, gamma_i)
  ]);
  await serverBroadcast(endpoints, `${nodeKey}:${user}:com`, com);
  res.sendStatus(200)
});

app.post("/round_2_MessageA", async (req, res) => {
  let { index, parties, endpoints, user } = req.body // TODO: get from db
})

async function serverBroadcast(endpoints, key, value) {
  return Promise.all(
    endpoints.map((endpoint) =>
      axios.post(`${endpoint}/broadcast`, {
        key,
        value,
      })
    )
  );
}

async function serverSend(endpoint, key, value) {
  return axios.post(`${endpoint}/send`, {
    key,
    value,
  });
}

console.log("app listening on port", port);
app.listen(port);
