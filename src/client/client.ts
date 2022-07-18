import { Socket } from "socket.io-client";
import * as tssLib from "tss-lib";

import comm from "../shared/comm";
import Rounds from "../shared/rounds";
import { localStorageDB } from "./db";

export class Client {
  private _nodeKey = "client";

  private _ready: Record<string, Promise<unknown>> = {};

  private _readyResolve = {};

  private _selfReceiveBroadcast = {};

  private _comm;

  constructor(private _index: number, private _parties: number[], private _sockets: Socket[], private _round: Rounds) {
    _sockets.map((socket) => {
      if (socket.hasListeners("send")) {
        socket.off("send");
      }

      if (socket.hasListeners("broadcast")) {
        socket.off("broadcast");
      }

      this._comm = comm(null, null, this._selfReceiveBroadcast);

      // Initialize listeners
      socket.on("send", async (data, cb) => {
        const { sender, tag, key, value } = data;
        console.log(`receiving send ${key}`);
        await localStorageDB.set(key, value);
        cb();
        const roundName = this._round.getRound(key);
        console.log(`round name: ${roundName}`);
        // TODO: add check for tag
        await this._round.roundRunner({
          nodeKey: this._nodeKey,
          db: localStorageDB,
          tag,
          roundName,
          party: sender,
          serverSend: this._comm.serverSend,
          serverBroadcast: this._comm.serverBroadcast,
          clientReadyResolve: this._readyResolve[tag],
          tss: tssLib,
        });
      });

      socket.on("broadcast", async (data, cb) => {
        const { sender, tag, key, value } = data;
        console.log(`receive broadcast ${key}`);
        await localStorageDB.set(key, value);
        cb();
        const roundName = this._round.getRound(key);
        // TODO: add check for tag
        await this._round.roundRunner({
          nodeKey: this._nodeKey,
          db: localStorageDB,
          tag,
          roundName,
          party: sender,
          serverSend: this._comm.serverSend,
          serverBroadcast: this._comm.serverBroadcast,
          clientReadyResolve: this._readyResolve[tag],
          tss: tssLib,
        });
      });
    });
  }

  get ready() {
    return this._ready;
  }

  async registerTag(tag: string) {
    this._ready[tag] = new Promise((r) => (this._readyResolve[tag] = r));
    this._selfReceiveBroadcast[tag] = this._setupSelfReceiveBroadcast;
  }

  async start(tag: string) {
    const roundName = this._round.getRound("start");
    await this._round.roundRunner({
      nodeKey: this._nodeKey,
      db: localStorageDB,
      tag,
      roundName,
      party: undefined,
      serverSend: this._comm.serverSend,
      serverBroadcast: this._comm.serverBroadcast,
      clientReadyResolve: this._readyResolve[tag],
      tss: tssLib,
    });
  }

  private _setupSelfReceiveBroadcast = async (sender: number, identifier: string, key: string, value: string) => {
    if (sender.toString() !== this._index.toString()) throw new Error("self receive broadcast must be from self");
    await localStorageDB.set(key, value);
    const roundName = this._round.getRound(key);
    await this._round.roundRunner({
      nodeKey: this._nodeKey,
      db: localStorageDB,
      tag: identifier,
      roundName,
      party: sender,
      serverSend: this._comm.serverSend,
      serverBroadcast: this._comm.serverBroadcast,
      clientReadyResolve: this._readyResolve[identifier],
      tss: tssLib,
    });
  };
}
