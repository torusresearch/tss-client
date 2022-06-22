const tss = require("tss-lib");
const { createRoundTracker, getTagInfo } = require("./rounds");

module.exports = {
  generateNodeInfo: async (db, nodeKey, index) => {
    let [keys, ek, h1h2Ntilde] = tss.generate_keys(parseInt(req.params.index));

    // TODO: let node generate own pubkey for identity?
    // let privkey = tss.random_bigint();
    // let pubkey = tss.scalar_mul(tss.generator(), privkey);

    // TODO: separate private from public data in db?
    await Promise.all([
      // db.set(`${nodeKey}:node_privkey`, privkey),
      // db.set(`${nodeKey}:node_pubkey`, pubkey),
      db.set(`${nodeKey}:index`, parseInt(index)),
      db.set(`${nodeKey}:keys`, keys),
      db.set(`${nodeKey}:ek`, ek),
      db.set(`${nodeKey}:h1h2Ntilde`, h1h2Ntilde),
    ]);
  },
  setShare: async (db, tag, share) => {
    let gwi = tss.scalar_mul(tss.generator(), share);
    await db.set(`tag-${tag}:share`, share);
    await db.set(`tag-${tag}:gwi`, gwi);
  },
  getGwi: async (db, tag) => {
    return db.get(`tag-${tag}:gwi`);
  },
  getPublicParams: async (db, nodeKey) => {
    return {
      h1h2Ntilde: await db.get(`${nodeKey}:h1h2Ntilde`),
      ek: await db.get(`${nodeKey}:ek`),
    };
  },
  setTagInfo: async (
    db,
    nodeKey,
    tag,
    pubkey,
    endpoints,
    parties,
    gwis,
    eks,
    h1h2Ntildes
  ) => {
    let pubkeyCoords = tss.coords_to_pt(pubkey.X, pubkey.Y);
    await db.set(
      `tag-${tag}:info`,
      JSON.stringify({
        pubkey: pubkeyCoords,
        endpoints,
        parties,
        gwis,
        eks,
        h1h2Ntildes,
      })
    );
    let index = await db.get(`${nodeKey}:index`);
    await db.set(
      `tag-${tag}:rounds`,
      JSON.stringify(createRoundTracker(parties, index))
    );
  },
  tssSign: async (db, nodeKey, tag, msg_hash) => {
    let { pubkey } = await getTagInfo(db, tag);
    let k_i = await db.get(`${nodeKey}:${tag}:k_i`);
    let R = await db.get(`${nodeKey}:${tag}:R`);
    let sigma_i = await db.get(`${nodeKey}:${tag}:sigma`);
    let [s_i, local_sig] = tss.phase_7_sign(msg_hash, k_i, R, sigma_i, pubkey);
    return {
      s_i,
      local_sig,
    };
  },
  getSignature: async (db, nodeKey, tag, s_is, msg_hash) => {
    let { pubkey } = await getTagInfo(db, tag);
    let R = await db.get(`${nodeKey}:${tag}:R`);
    return tss.get_signature(pubkey, msg_hash, R, s_is);
  },
};
