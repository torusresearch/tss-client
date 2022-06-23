const { roundRunner, getRound } = require("./rounds");
const socket = require("./socket");
require("mock-local-storage");
const localStorageDB = {
  get: async (key) => global.localStorage.getItem(key),
  set: async (key, value) => {
    global.localStorage.setItem(key, value);
  },
};
const selfReceiveBroadcast = {};
const { serverSend, serverBroadcast } = require("./comm")(
  null,
  null,
  selfReceiveBroadcast
);

class Client {
  constructor(tag, index, parties, endpoints, sockets) {
    this.tag = tag;
    this.index = index;
    this.parties = parties;
    this.endpoints = endpoints;
    this.sockets = sockets;
    this.wsIds = wsIds;
    this.nodeKey = "client";
    this.endpoint = endpoints[index];
    selfReceiveBroadcast[this.tag] = function(sender, tag, key, value) {
      if (sender !== this.index) throw new Error("self receive broadcast must be from self")
      await localStorageDB.set(key, value)
      const roundName = getRound(key);
      roundRunner(this.nodeKey, this.db, tag, roundName, sender, serverSend, serverBroadcast)
    }

    sockets.map((socket) => {
      socket.off("send");
      socket.off("broadcast");
      socket.on("send", (data) => {
        let { messageId, sender, tag, key, value } = data;
        await localStorageDB.set(key, value)
        socket.emit("received", { messageId })
        const roundName = getRound(key);
        roundRunner(
          this.nodeKey,
          localStorageDB,
          tag,
          roundName,
          sender,
          serverSend,
          serverBroadcast
        );
      });
      socket.on("broadcast", (data) => {
        let { messageId, sender, tag, key, value } = data;
        await localStorageDB.set(key, value)
        socket.emit("received", { messageId })
        const roundName = getRound(key);
        roundRunner(
          this.nodeKey,
          localStorageDB,
          tag,
          roundName,
          sender,
          serverSend,
          serverBroadcast
        );
      });
    });
  }
}

module.exports = Client;
