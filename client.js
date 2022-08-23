import "mock-local-storage";
const { roundRunner, getRound } = require("./rounds");

const { tssSign } = require("./methods");
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
  constructor(index, parties, sockets) {
    this.index = index;
    this.parties = parties;
    this.sockets = sockets;
    this.nodeKey = "client";
    this.ready = {};
    this.readyResolve = {};

    sockets.map((socket) => {
      socket.off("send");
      socket.off("broadcast");
      socket.on("send", async (data, cb) => {
        let { sender, tag, key, value } = data;
        await localStorageDB.set(key, value);
        cb();
        const roundName = getRound(key);
        // TODO: add check for tag
        roundRunner({
          nodeKey: this.nodeKey,
          db: localStorageDB,
          tag,
          roundName,
          party: sender,
          serverSend,
          serverBroadcast,
          clientReadyResolve: this.readyResolve[tag],
        });
      });
      socket.on("broadcast", async (data, cb) => {
        let { sender, tag, key, value } = data;
        await localStorageDB.set(key, value);
        cb();
        const roundName = getRound(key);
        // TODO: add check for tag
        roundRunner({
          nodeKey: this.nodeKey,
          db: localStorageDB,
          tag,
          roundName,
          party: sender,
          serverSend,
          serverBroadcast,
          clientReadyResolve: this.readyResolve[tag],
        });
      });
    });
  }
  async registerTag(tag) {
    this.ready[tag] = new Promise((r) => (this.readyResolve[tag] = r));
    selfReceiveBroadcast[tag] = async (sender, tag, key, value) => {
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
        clientReadyResolve: this.readyResolve[tag],
      });
    };
  }
  async start(tag) {
    const roundName = getRound("start");
    roundRunner({
      nodeKey: this.nodeKey,
      db: localStorageDB,
      tag,
      roundName,
      party: undefined,
      serverSend,
      serverBroadcast,
      clientReadyResolve: this.readyResolve[tag],
    });
  }
  async sign(msg_hash, tag) {
    let { s_i, local_sig } = await tssSign(
      localStorageDB,
      this.nodeKey,
      tag,
      msg_hash
    );
    return { s_i };
  }
}

module.exports = {
  Client,
  localStorageDB,
};
