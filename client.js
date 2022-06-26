const { roundRunner, getRound } = require("./rounds");
require("mock-local-storage");
let { tssSign } = require("./methods");
const localStorageDB = {
  get: (key) =>
    new Promise((r) => {
      let value = global.localStorage.getItem(key);
      r(value);
    }),
  set: (key, value) =>
    new Promise((r) => {
      global.localStorage.setItem(key, value);
      r();
    }),
};
const selfReceiveBroadcast = {};
const { serverSend, serverBroadcast } = require("./comm")(
  null,
  null,
  selfReceiveBroadcast
);

class Client {
  constructor(tag, index, parties, sockets) {
    this.tag = tag;
    this.index = index;
    this.parties = parties;
    this.sockets = sockets;
    this.nodeKey = "client";
    let resolve;
    this.ready = new Promise((r) => (resolve = r));
    this.readyResolve = resolve;
    selfReceiveBroadcast[this.tag] = async (sender, tag, key, value) => {
      if (sender.toString() !== this.index.toString())
        throw new Error("self receive broadcast must be from self");
      await localStorageDB.set(key, value);
      const roundName = getRound(key);
      roundRunner({
        nodeKey: this.nodeKey,
        db: localStorageDB,
        tag,
        roundName,
        party: sender,
        serverSend,
        serverBroadcast,
        clientReadyResolve: this.readyResolve,
      });
    };

    sockets.map((socket) => {
      socket.off("send");
      socket.off("broadcast");
      socket.on("send", async (data, cb) => {
        let { sender, tag, key, value } = data;
        await localStorageDB.set(key, value);
        cb();
        const roundName = getRound(key);
        roundRunner({
          nodeKey: this.nodeKey,
          db: localStorageDB,
          tag,
          roundName,
          party: sender,
          serverSend,
          serverBroadcast,
          clientReadyResolve: this.readyResolve,
        });
      });
      socket.on("broadcast", async (data, cb) => {
        let { sender, tag, key, value } = data;
        await localStorageDB.set(key, value);
        cb();
        const roundName = getRound(key);
        roundRunner({
          nodeKey: this.nodeKey,
          db: localStorageDB,
          tag,
          roundName,
          party: sender,
          serverSend,
          serverBroadcast,
          clientReadyResolve: this.readyResolve,
        });
      });
    });
  }
  async start() {
    const roundName = getRound("start");
    roundRunner({
      nodeKey: this.nodeKey,
      db: localStorageDB,
      tag: this.tag,
      roundName,
      party: undefined,
      serverSend,
      serverBroadcast,
      clientReadyResolve: this.readyResolve,
    });
  }
  async sign(msg_hash) {
    let { s_i, local_sig } = await tssSign(
      localStorageDB,
      this.nodeKey,
      this.tag,
      msg_hash
    );
    return { s_i };
  }
}

module.exports = {
  Client,
  localStorageDB,
};
