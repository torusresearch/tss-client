import axios from "axios";
import * as BN from "bn.js";
import { generatePrivate } from "eccrypto";
import { Socket } from "socket.io-client";
import * as TssLib from "tss-lib";

import { Msg } from "../shared";
import TssWebWorker from "./worker";

// TODO: create namespace for globals
if (global.tss_clients === undefined) {
  global.tss_clients = {};
}

if (global.js_pending_reads === undefined) {
  global.js_pending_reads = {};
}

// global.total_outgoing = 0;
// global.total_outgoing_msg = [];
// global.total_incoming = 0;
// global.total_incoming_msg = [];

if (global.js_read_msg === undefined) {
  global.js_read_msg = async function (session, self_index, party, msg_type) {
    global.consolelog("reading msg", msg_type);
    if (msg_type === "ga1_worker_support") {
      return "supported";
    }
    const tss_client = global.tss_clients[session] as Client;
    const mm = tss_client.msgQueue.find((m) => m.sender === party && m.recipient === self_index && m.msg_type === msg_type);
    if (!mm) {
      return new Promise((resolve) => {
        tss_client.pendingReads[`session-${session}:sender-${party}:recipient-${self_index}:msg_type-${msg_type}`] = resolve;
      });
    }
    // global.total_incoming += mm.msg_data.length;
    // global.total_incoming_msg.push(mm.msg_data);
    return mm.msg_data;
  };
}

global.process_ga1 = async (tssImportUrl: string, msg_data: string): Promise<string> => {
  const worker = new TssWebWorker(tssImportUrl);
  // const res = tss.process_ga1(msg_data);
  const res = worker.work<string>("process_ga1", [msg_data]);
  return res;
};

if (global.js_send_msg === undefined) {
  global.js_send_msg = async function (session, self_index, party, msg_type, msg_data) {
    global.consolelog("sending msg", msg_type);
    const tss_client = global.tss_clients[session] as Client;
    if (msg_type.indexOf("ga1_data_unprocessed") > -1) {
      global.process_ga1(tss_client.tssImportUrl, msg_data).then((processed_data: string) => {
        const pendingRead =
          tss_client.pendingReads[`session-${session}:sender-${party}:recipient-${self_index}:msg_type-${session}~ga1_data_processed`];
        if (pendingRead !== undefined) {
          pendingRead(processed_data);
        } else {
          tss_client.msgQueue.push({
            session,
            sender: party,
            recipient: self_index,
            msg_type: `${session}~ga1_data_processed`,
            msg_data: processed_data,
          });
        }
        return true;
      });
      return true;
    }
    // global.total_outgoing += msg_data.length;
    // global.total_outgoing_msg.push(msg_data);
    if (tss_client.websocketOnly) {
      const socket = tss_client.sockets[party];
      socket.emit("send_msg", {
        session,
        sender: self_index,
        recipient: party,
        msg_type,
        msg_data,
      });
    } else {
      const endpoint = tss_client.lookupEndpoint(session, party);
      axios.post(`${endpoint}/send`, {
        session,
        sender: self_index,
        recipient: party,
        msg_type,
        msg_data,
      });
    }
    return true;
  };
}

export class Client {
  public session: string;

  public index: number;

  public parties: number[];

  public msgQueue: Msg[] = [];

  public pendingReads = {};

  public sockets: Socket[];

  public endpoints: string[];

  public share: string;

  public pubKey: string;

  public precomputes: string[] = [];

  public websocketOnly: boolean;

  public tssImportUrl: string;

  private _readyResolves = [];

  private _readyPromises = [];

  private _readyPromiseAll: Promise<unknown>;

  private _ready: boolean;

  // Note: create sockets externally before passing it in in the constructor to allow socket reuse
  constructor(
    _session: string,
    _index: number,
    _parties: number[],
    _endpoints: string[],
    _sockets: Socket[],
    _share: string,
    _pubKey: string,
    _websocketOnly: boolean,
    _tssImportUrl: string
  ) {
    if (_parties.length !== _sockets.length) {
      throw new Error("parties and sockets length must be equal, fill with nulls if necessary");
    }
    if (_parties.length !== _endpoints.length) {
      throw new Error("parties and endpoints length must be equal, fill with nulls if necessary");
    }

    this.session = _session;
    this.index = _index;
    this.parties = _parties;
    this.endpoints = _endpoints;
    this.sockets = _sockets;
    this.share = _share;
    this.pubKey = _pubKey;
    this.websocketOnly = _websocketOnly;
    this.tssImportUrl = _tssImportUrl;

    _sockets.map((socket) => {
      if (socket === undefined || socket === null) {
        let clientResolve;
        this._readyPromises.push(new Promise((r) => (clientResolve = r)));
        this._readyResolves.push(clientResolve);
        return;
      }
      if (socket.hasListeners("send")) {
        socket.off("send");
      }

      // create pending promises for each server that resolves when precompute for that server is complete
      let resolve;
      this._readyPromises.push(new Promise((r) => (resolve = r)));
      this._readyResolves.push(resolve);

      // Add listener for incoming messages
      socket.on("send", async (data, cb) => {
        const { session, sender, recipient, msg_type, msg_data } = data;
        if (session !== this.session) {
          global.consolelog(`ignoring message for a different session... client session: ${this.session}, message session: ${session}`);
          return;
        }
        const pendingRead = this.pendingReads[`session-${session}:sender-${sender}:recipient-${recipient}:msg_type-${msg_type}`];
        if (pendingRead !== undefined) {
          // global.total_incoming += msg_data.length;
          // global.total_incoming_msg.push(msg_data);
          pendingRead(msg_data);
        } else {
          this.msgQueue.push({ session, sender, recipient, msg_type, msg_data });
        }
        if (cb) cb();
      });
      // Add listener for completion
      socket.on("precompute_complete", async (data, cb) => {
        const { session, party } = data;
        if (session !== this.session) {
          global.consolelog(`ignoring message for a different session... client session: ${this.session}, message session: ${session}`);
          return;
        }
        if (cb) cb();
        const { precompute } = await axios
          .post(`${this.lookupEndpoint(this.session, party)}/retrieve_precompute`, { session })
          .then((res) => res.data);
        this.precomputes[this.parties.indexOf(party)] = precompute;
        resolve();
      });
    });

    this._readyPromiseAll = Promise.all(this._readyPromises).then(() => {
      this._ready = true;
      return null;
    });
    global.tss_clients[this.session] = this;
  }

  async ready() {
    await this._readyPromiseAll;
  }

  precompute(tss: typeof TssLib) {
    const signer = tss.threshold_signer(this.session, this.index, this.parties.length, this.parties.length, this.share, this.pubKey);
    // const rng = tss.random_generator(BigInt(`0x${generatePrivate().toString("hex")}`));
    const rng = tss.random_generator(new BN(generatePrivate()).umod(new BN("18446744073709551615")).toString("hex"));
    // const rng = tss.random_generator("00");

    // check if sockets have connected and have an id;
    this.sockets.map((socket, party) => {
      if (socket !== null) {
        if (socket.id === undefined) {
          throw new Error(`socket not connected yet, session: ${this.session}, party: ${party}`);
        }
      }
    });

    for (let i = 0; i < this.parties.length; i++) {
      const party = this.parties[i];
      if (party !== this.index) {
        axios.post(`${this.lookupEndpoint(this.session, party)}/precompute`, {
          endpoints: this.endpoints.map((endpoint, j) => {
            if (j !== this.index) {
              return endpoint;
            }
            // pass in different id for websocket connection for each server so that the server can communicate back
            return `websocket:${this.sockets[party].id}`;
          }),
          session: this.session,
          parties: this.parties,
          player_index: party,
          threshold: this.parties.length,
          pubkey: this.pubKey,
          notifyWebsocketId: this.sockets[party].id,
          sendWebsocket: this.sockets[party].id,
        });
      }
    }
    tss
      .setup(signer, rng)
      .then(() => {
        return tss.precompute(new Uint8Array(this.parties), signer, rng);
      })
      .then((precompute) => {
        this.precomputes[this.parties.indexOf(this.index)] = precompute;
        this._readyResolves[this.parties.indexOf(this.index)]();
        return null;
      });
  }

  sign(tss: typeof TssLib, msg: string, hash_only: boolean): { r: BN; s: BN; recoveryParam: number } {
    if (!this._ready) {
      throw new Error("client is not ready");
    }
    if (this.precomputes.length !== this.parties.length) {
      throw new Error("insufficient precomputes");
    }
    const sigFragments = [];
    for (let i = 0; i < this.precomputes.length; i++) {
      const precompute = this.precomputes[i];
      sigFragments.push(tss.local_sign(msg, hash_only, precompute));
    }

    const R = tss.get_r_from_precompute(this.precomputes[0]);
    const sig = tss.local_verify(msg, hash_only, R, sigFragments, this.pubKey);
    const sigHex = Buffer.from(sig, "base64").toString("hex");
    const r = new BN(sigHex.slice(0, 64), 16);
    const s = new BN(sigHex.slice(64), 16);
    const recoveryParam = Buffer.from(R, "base64")[63] % 2;
    return { r, s, recoveryParam };
  }

  lookupEndpoint(session: string, party: number): string {
    return this.endpoints[party];
  }
}
