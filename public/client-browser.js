const { roundRunner, getRound } = require("./rounds-browser");
// require("mock-local-storage");
const memoryDB = {}
const localStorageDB = {
  get: (key) => {
    return new Promise((r) => {
      r(memoryDB[key])
      // let value = global.localStorage.getItem(key);
      // r(value);
    });
  },
  set: (key, value) => {
    return new Promise((r) => {
      // global.localStorage.setItem(key, value);
      memoryDB[key] = value
      r();
    })
  }
};
const selfReceiveBroadcast = {};
const { serverSend, serverBroadcast } = require("./comm-browser")(
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
        console.log(`receiving send ${key}`)
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
          tss: window.tss_lib
        });
      });
      socket.on("broadcast", async (data, cb) => {
        let { sender, tag, key, value } = data;
        console.log(`receive broadcast ${key}`)
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
          tss: window.tss_lib
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
        tss: window.tss_lib
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
      tss: window.tss_lib
    });
  }
  async sign(msg_hash, tag) {
    let { tssSign } = require("./methods-browser")(window.tss_lib);
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
