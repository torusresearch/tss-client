import BN from "bn.js";
import EC from "elliptic";
import * as tssLib from "tss-lib";

import methods from "../shared/methods";
import Round from "../shared/rounds";
import { Client } from "./client";
import { localStorageDB } from "./db";
import Network from "./network";
import { work } from "./worker";

const round = new Round(work);

const { getGwi, setTagInfo, generateNodeInfo, getPublicParams, tssSign } = methods(round);
// eslint-disable-next-line new-cap
const ec = new EC.ec("secp256k1");

interface ITSSSignOptions {
  endpoints: string[];
  numberOfNodes: number;
  tssImportUrl?: string;
  wsEndpoints: string[];
}

export class TssSign {
  private _nodeInfoGenerated = false;

  private _parties: number[] = [];

  private _network!: Network;

  private _client!: Client;

  private _tag!: string;

  constructor(private _optns: ITSSSignOptions) {
    for (let i = 1; i <= this._optns.numberOfNodes; i++) {
      this._parties.push(i);
    }
    // can be moved to init stage as well
    // need to check for any performance impacts.
    this._network = new Network(this._optns.endpoints, this._optns.wsEndpoints);
  }

  init = async (privKey: string, tag: string) => {
    this._tag = tag;
    this._network.setTimer(this._optns.endpoints[0]);
    await this._loadTSS(this._optns.tssImportUrl);
    const socketIds = await Promise.all(this._network.wsConnecting);
    this._network.websocketIds = socketIds;

    const now = Date.now();

    if (!this._nodeInfoGenerated) {
      await this._generateNodeInfo(this._optns.numberOfNodes + 1);
      this._nodeInfoGenerated = true;
    }

    const partiesAndClient = this._parties.slice();
    partiesAndClient.push(this._parties[this._parties.length - 1] + 1);
    this._client = new Client(this._optns.numberOfNodes + 1, partiesAndClient, this._network.sockets, round);
    this._client.registerTag(tag);

    // get public params
    console.log("getting public params", Date.now() - now);
    const publicParams = await this._getPublicParams();
    const gwis = await this._getGWIS();

    // publish tag info to each node
    console.log("publish tag info", Date.now() - now);
    await Promise.all(this._setTagInfo(privKey, publicParams, gwis));
    await Promise.all(this._network.subscribe(this._tag));
    console.log("setup complete", Date.now() - now);
  };

  sign = async (msgHash: Buffer) => {
    const now = Date.now();
    await this._client.start(this._tag);
    await this._network.start(this._tag);
    await Promise.all([this._network.onlinePhaseCompletionForServer, this._client.ready[this._tag]]);
    const online_phase = Date.now() - now;
    console.log(`Time taken for online phase: ${online_phase / 1e3} seconds`);
    const data = new BN(msgHash).toString("hex");
    const s_is_waiting = this._network.signOnNodes(data, this._tag);
    s_is_waiting.push(this._clientSign(data).then((obj) => obj.s_i));
    const s_is = await Promise.all(s_is_waiting);
    const resp = await this._network.getSignature(s_is, this._tag, data);
    const sig = JSON.parse(resp.data.sig);
    return sig;
  };

  /**
   * Load TSS in the environment.
   */
  private _loadTSS = (endpoint?: string) => {
    // TODO: Add default function to the types.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (tssLib as any).default(endpoint);
  };

  private _generateNodeInfo = (index: number) => {
    return generateNodeInfo(localStorageDB, "client", index);
  };

  private _getPublicParams = async () => {
    const publicParamsAwaiting: Promise<unknown>[] = this._network.getPublicParamsFromNodes();
    publicParamsAwaiting.push(getPublicParams(localStorageDB, "client"));
    const publicParams = await Promise.all(publicParamsAwaiting);
    return publicParams;
  };

  private _getGWIS = async () => {
    const awaiting: Promise<unknown>[] = this._network.getGWIS(this._tag);
    awaiting.push(getGwi(localStorageDB, this._tag));
    const gwis = await Promise.all(awaiting);
    return gwis;
  };

  private _setTagInfo = (privKey, publicParams, gwis) => {
    const pubkey = ec.curve.g.mul(privKey);
    const partiesAndClient = this._parties.slice();
    partiesAndClient.push(this._parties[this._parties.length - 1] + 1);
    const awaiting: Promise<unknown>[] = this._network.setTagInfoOnNodes({
      nodes: this._optns.numberOfNodes,
      parties: this._parties,
      pubkey,
      publicParams,
      gwis,
      tag: this._tag,
    });

    const customEndpoints = this._optns.endpoints.slice();
    customEndpoints.push("websocket:?");
    awaiting.push(
      setTagInfo(
        localStorageDB,
        "client",
        this._tag,
        {
          X: pubkey.x.toString("hex"),
          Y: pubkey.y.toString("hex"),
        },
        customEndpoints,
        partiesAndClient,
        gwis,
        publicParams.map((publicParam) => publicParam.ek),
        publicParams.map((publicParam) => publicParam.h1h2Ntilde)
      )
    );

    return awaiting;
  };

  private _clientSign = async (msg_hash) => {
    const { s_i, local_sig } = await tssSign(localStorageDB, "client", this._tag, msg_hash);
    return { s_i, local_sig };
  };
}
