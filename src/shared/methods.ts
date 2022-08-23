import * as tss from "tss-lib";

import { DB, PubKey, PublicParams, TssSignResponse } from "../interfaces";
import Round from "./round";

class Methods {
  constructor(private _rounds: Round) {}

  generateNodeInfo = async (db: DB, nodeKey: string, index: number): Promise<void> => {
    const [keys, ek, h1h2Ntilde] = tss.generate_keys(index);

    // TODO: let node generate own pubkey for identity?
    // let privkey = tss.random_bigint();
    // let pubkey = tss.scalar_mul(tss.generator(), privkey);

    // TODO: separate private from public data in db?
    await Promise.all([
      // db.set(`${nodeKey}:node_privkey`, privkey),
      // db.set(`${nodeKey}:node_pubkey`, pubkey),
      db.set(`${nodeKey}:index`, index.toString()),
      db.set(`${nodeKey}:keys`, keys),
      db.set(`${nodeKey}:ek`, ek),
      db.set(`${nodeKey}:h1h2Ntilde`, h1h2Ntilde),
    ]);
  };

  setShare = async (db: DB, tag: string, share: string): Promise<void> => {
    const gwi = tss.scalar_mul(tss.generator(), share);
    await db.set(`tag-${tag}:share`, share);
    await db.set(`tag-${tag}:gwi`, gwi);
  };

  getGwi = async (db: DB, tag: string): Promise<string> => {
    return db.get(`tag-${tag}:gwi`);
  };

  getPublicParams = async (db: DB, nodeKey: string): Promise<PublicParams> => {
    return {
      h1h2Ntilde: await db.get(`${nodeKey}:h1h2Ntilde`),
      ek: await db.get(`${nodeKey}:ek`),
    };
  };

  setTagInfo = async (
    db: DB,
    nodeKey: string,
    tag: string,
    pubkey: PubKey,
    endpoints: string[],
    parties: number[],
    gwis: string[],
    eks: string[],
    h1h2Ntildes: string[]
  ): Promise<void> => {
    const pubkeyCoords = tss.coords_to_pt(pubkey.X, pubkey.Y);
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
    const index = parseInt(await db.get(`${nodeKey}:index`));
    await db.set(`tag-${tag}:rounds`, JSON.stringify(this._rounds.createRoundTracker(parties, index)));
  };

  tssSign = async (db: DB, nodeKey: string, tag: string, msg_hash: string): Promise<TssSignResponse> => {
    const { pubkey } = await this._rounds.getTagInfo(db, tag);
    const k_i = await db.get(`${nodeKey}:${tag}:k_i`);
    const R = await db.get(`${nodeKey}:${tag}:R`);
    const sigma_i = await db.get(`${nodeKey}:${tag}:sigma`);
    const [s_i, local_sig] = tss.phase_7_sign(msg_hash, k_i, R, sigma_i, pubkey);
    return {
      s_i,
      local_sig,
    };
  };

  getSignature = async (db: DB, nodeKey: string, tag: string, s_is: string[], msg_hash: string): Promise<string> => {
    const { pubkey } = await this._rounds.getTagInfo(db, tag);
    const R = await db.get(`${nodeKey}:${tag}:R`);
    return tss.get_signature(pubkey, msg_hash, R, s_is);
  };

  resetTimer = (): void => {
    tss.reset_timing_ms();
  };

  getTimer = (): number => {
    return tss.get_timing_ms();
  };
}

export default Methods;
