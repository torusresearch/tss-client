const { roundRunner, getRound } = require("./rounds");
require("mock-local-storage");
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
    this.wsIds = wsIds;
    this.nodeKey = "client";
    let resolve;
    this.ready = new Promise((r) => (resolve = r));
    this.readyResolve = resolve;
    selfReceiveBroadcast[this.tag] = async function (sender, tag, key, value) {
      if (sender !== this.index)
        throw new Error("self receive broadcast must be from self");
      await localStorageDB.set(key, value);
      const roundName = getRound(key);
      roundRunner({
        nodeKey: this.nodeKey,
        db: this.db,
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
      socket.on("send", async (data) => {
        let { messageId, sender, tag, key, value } = data;
        await localStorageDB.set(key, value);
        socket.emit("received", { messageId });
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
      socket.on("broadcast", async (data) => {
        let { messageId, sender, tag, key, value } = data;
        await localStorageDB.set(key, value);
        socket.emit("received", { messageId });
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
      clientReadyResolve: this.readyResolve,
    });
  }
}

module.exports = {
  Client,
  localStorageDB,
};
