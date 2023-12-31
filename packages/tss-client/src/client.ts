/* eslint-disable no-console */
import { generatePrivate } from "@toruslabs/eccrypto";
import {
  get_r_from_precompute,
  local_sign as generate_client_signature_fragment,
  local_verify as create_signature,
  precompute as dkls_precompute,
  random_generator,
  random_generator_free,
  setup as dkls_setup,
  threshold_signer,
  threshold_signer_free,
} from "@toruslabs/tss-lib";
import BN from "bn.js";
import { keccak256 } from "ethereum-cryptography/keccak";
import { Socket } from "socket.io-client";

import { DELIMITERS, WEB3_SESSION_HEADER_KEY } from "./constants";
import { Msg } from "./interfaces";
import { getEc } from "./utils";

// TODO: create namespace for globals
if (globalThis.tss_clients === undefined) {
  // Cleanup leads to memory leaks with just an object. Should use a map instead.
  // TODO: This should be singular.
  globalThis.tss_clients = new Map();
}

if (globalThis.js_read_msg === undefined) {
  globalThis.js_read_msg = async function (session: string, self_index: number, party: number, msg_type: string) {
    const tss_client = globalThis.tss_clients.get(session) as Client;
    tss_client.log(`reading msg, ${msg_type}`);
    if (msg_type === "ga1_worker_support") {
      return "unsupported";
    }
    const mm = tss_client.msgQueue.find((m) => m.sender === party && m.recipient === self_index && m.msg_type === msg_type);
    if (!mm) {
      // It is very important that this promise can reject, since it is passed through to dkls library and awaited internally. If it cannot reject and a message is lost,
      // it will never resolve and hang indefinitely with no possibility of recovery.
      return new Promise((resolve, reject) => {
        let counter = 0;
        const timer = setInterval(() => {
          const found = tss_client.msgQueue.find((m) => m.sender === party && m.recipient === self_index && m.msg_type === msg_type);
          if (found !== undefined) {
            clearInterval(timer);
            resolve(found.msg_data);
          }
          if (counter >= 500) {
            clearInterval(timer);
            reject(new Error("Message not received in a reasonable time"));
          }
          counter++;
        }, 10);
      });
    }
    return mm.msg_data;
  };
}

if (globalThis.js_send_msg === undefined) {
  globalThis.js_send_msg = async function (session: string, self_index: number, party: number, msg_type: string, msg_data?: string) {
    const tss_client = globalThis.tss_clients.get(session) as Client;
    tss_client.log(`sending msg, ${msg_type}`);
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
      const sid = session.split(DELIMITERS.Delimiter4)[1];
      const endpoint = tss_client.lookupEndpoint(session, party);
      fetch(`${endpoint}/send`, {
        method: "POST",
        headers: {
          [WEB3_SESSION_HEADER_KEY]: sid,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session,
          sender: self_index,
          recipient: party,
          msg_type,
          msg_data,
        }),
      });
    }
    return true;
  };
}

type Log = {
  (msg: string): void;
};

interface PrecomputeResult {
  session: string;
  party: number;
}

export class Client {
  public session: string;

  public index: number;

  public parties: number[];

  public msgQueue: Msg[] = [];

  public sockets: Socket[];

  public endpoints: string[];

  public share: string;

  public pubKey: string;

  public websocketOnly: boolean;

  public _startPrecomputeTime: number;

  public _endPrecomputeTime: number;

  public _startSignTime: number;

  public _endSignTime: number;

  public log: Log;

  public _ready: boolean;

  public _consumed: boolean;

  public _workerSupported: string;

  public _sLessThanHalf: boolean;

  private _precomputeComplete: PrecomputeResult[] = [];

  private _precomputeFailed: PrecomputeResult[] = [];

  private _signer: number;

  private _rng: number;

  private precomputed_value: string = null;

  // Note: create sockets externally before passing it in in the constructor to allow socket reuse
  constructor(
    _session: string,
    _index: number,
    _parties: number[],
    _endpoints: (string | null | undefined)[],
    _sockets: (Socket | null | undefined)[],
    _share: string,
    _pubKey: string,
    _websocketOnly: boolean
  ) {
    if (_parties.length !== _sockets.length) {
      throw new Error("parties and sockets length must be equal, add null for client if necessary");
    }
    if (_parties.length !== _endpoints.length) {
      throw new Error("parties and endpoints length must be equal, add null for client if necessary");
    }

    this.session = _session;
    this.index = _index;
    this.parties = _parties;
    this.endpoints = _endpoints;
    this.sockets = _sockets;
    this.share = _share;
    this.pubKey = _pubKey;
    this.websocketOnly = _websocketOnly;
    this.log = console.log;
    this._consumed = false;
    this._sLessThanHalf = true;

    _sockets.forEach((socket) => {
      if (socket !== null) {
        if (socket.hasListeners("send")) {
          socket.off("send");
        }

        // Add listener for incoming messages
        socket.on("send", async (data, cb) => {
          const { session, sender, recipient, msg_type, msg_data } = data;
          if (session !== this.session) {
            this.log(`ignoring message for a different session... client session: ${this.session}, message session: ${session}`);
            return;
          }
          this.msgQueue.push({ session, sender, recipient, msg_type, msg_data });
          if (cb) cb();
        });
        // Add listener for completion
        socket.on("precompute_complete", async (data, cb) => {
          const { session, party } = data;
          if (session !== this.session) {
            this.log(`ignoring message for a different session... client session: ${this.session}, message session: ${session}`);
            return;
          }
          if (cb) cb();
          this._precomputeComplete.push({ session, party });
        });

        socket.on("precompute_failed", async (data, cb) => {
          const { session, party } = data;
          if (session !== this.session) {
            this.log(`ignoring message for a different session... client session: ${this.session}, message session: ${session}`);
            return;
          }
          if (cb) cb();
          this._precomputeFailed.push({ session, party });
        });
      }
    });
    globalThis.tss_clients.set(this.session, this);
  }

  get sid(): string {
    return this.session.split(DELIMITERS.Delimiter4)[1];
  }

  ready() {
    // ensure that there were no failures and all peers are finished
    if (this._precomputeFailed.length === 0 && this._precomputeComplete.length === this.parties.length - 1) {
      return true;
    }

    return false;
  }

  async precompute(additionalParams?: Record<string, unknown>) {
    // check if sockets have connected and have an id;
    this.sockets.forEach((socket, party) => {
      if (socket !== null) {
        if (socket.id === undefined) {
          throw new Error(`socket not connected yet, session: ${this.session}, party: ${party}`);
        }
      }
    });

    const precomputePromises: Promise<boolean>[] = [];

    for (let i = 0; i < this.parties.length; i++) {
      const party = this.parties[i];
      if (party !== this.index) {
        precomputePromises.push(
          new Promise((resolve, reject) => {
            fetch(`${this.lookupEndpoint(this.session, party)}/precompute`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                [WEB3_SESSION_HEADER_KEY]: this.sid,
              },
              body: JSON.stringify({
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
                ...additionalParams,
              }),
            })
              .then(async (resp) => {
                const json = await resp.json();
                if (resp.status !== 200) {
                  throw new Error(
                    `precompute route failed on ${this.lookupEndpoint(this.session, party)} with status ${resp.status} \n ${JSON.stringify(json)} `
                  );
                }
                return resp;
              })
              .catch((err) => {
                reject(err);
              });
            resolve(true);
          })
        );
      }
    }

    this._startPrecomputeTime = Date.now();
    await Promise.all(precomputePromises);
    this._signer = threshold_signer(this.session, this.index, this.parties.length, this.parties.length, this.share, this.pubKey);
    this._rng = random_generator(Buffer.from(generatePrivate()).toString("base64"));
    await dkls_setup(this._signer, this._rng);
    this.precomputed_value = await dkls_precompute(new Uint8Array(this.parties), this._signer, this._rng);
    this._endPrecomputeTime = Date.now();
  }

  async sign(
    msg: string,
    hash_only: boolean,
    original_message: string,
    hash_algo: string,
    additionalParams?: Record<string, unknown>
  ): Promise<{ r: BN; s: BN; recoveryParam: number }> {
    if (!this._ready) {
      throw new Error("client is not ready");
    }

    if (this._consumed) {
      throw new Error("This instance has already signed a message and cannot be reused");
    }

    // check message hashing
    if (!hash_only) {
      if (hash_algo === "keccak256") {
        if (Buffer.from(keccak256(Buffer.from(original_message))).toString("base64") !== msg) {
          throw new Error("hash of original message does not match msg");
        }
      } else {
        throw new Error(`hash algo ${hash_algo} not supported`);
      }
    }

    this._startSignTime = Date.now();
    const sigFragments: string[] = [];
    const fragmentPromises: Promise<string>[] = [];

    for (let i = 0; i < this.parties.length; i++) {
      const party = i;
      if (party === this.index) {
        // create signature fragment for this client
        sigFragments.push(await generate_client_signature_fragment(msg, hash_only, this.precomputed_value));
      } else {
        // collect signature fragment from all peers
        fragmentPromises.push(
          new Promise((resolve, reject) => {
            const endpoint = this.lookupEndpoint(this.session, party);
            fetch(`${endpoint}/sign`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                [WEB3_SESSION_HEADER_KEY]: this.sid,
              },
              body: JSON.stringify({
                session: this.session,
                sender: this.index,
                recipient: party,
                msg,
                hash_only,
                original_message,
                hash_algo,
                ...additionalParams,
              }),
            })
              .then((res) => res.json())
              .then((res) => resolve(res.sig))
              .catch((err) => {
                reject(err);
              });
          })
        );
      }
    }

    sigFragments.concat(await Promise.all(fragmentPromises));

    const R = await get_r_from_precompute(this.precomputed_value);
    const sig = await create_signature(msg, hash_only, R, sigFragments, this.pubKey);
    this._endSignTime = Date.now();

    const sigHex = Buffer.from(sig, "base64").toString("hex");
    const r = new BN(sigHex.slice(0, 64), 16);
    let s = new BN(sigHex.slice(64), 16);
    let recoveryParam = Buffer.from(R, "base64")[63] % 2;
    if (this._sLessThanHalf) {
      const ec = getEc();
      const halfOfSecp256k1n = ec.n.div(new BN(2));
      if (s.gt(halfOfSecp256k1n)) {
        s = ec.n.sub(s);
        recoveryParam = (recoveryParam + 1) % 2;
      }
    }
    this._consumed = true;
    return { r, s, recoveryParam };
  }

  lookupEndpoint(session: string, party: number): string {
    if (session !== this.session) throw new Error("incorrect session when looking up endpoint");
    return this.endpoints[party];
  }

  async cleanup(additionalParams?: Record<string, unknown>) {
    // remove references
    globalThis.tss_clients.delete(this.session);

    // free native objects
    random_generator_free(this._rng);
    threshold_signer_free(this._signer);

    // clear data for this client
    this._precomputeComplete = [];
    this._precomputeFailed = [];
    this.precompute = null;
    this._endPrecomputeTime = null;
    this._startPrecomputeTime = null;
    this._endSignTime = null;
    this._startSignTime = null;

    this.sockets.forEach((soc) => {
      if (soc && soc.connected) {
        soc.close();
      }
    });

    // notify peers
    await Promise.all(
      this.parties.map(async (party) => {
        if (party !== this.index) {
          await fetch(`${this.lookupEndpoint(this.session, party)}/cleanup`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              [WEB3_SESSION_HEADER_KEY]: this.sid,
            },
            body: JSON.stringify({ session: this.session, ...additionalParams }),
          });
        }
        return Promise.resolve(true);
      })
    );
  }
}
