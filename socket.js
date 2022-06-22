const { Server } = require("socket.io");
const connections = {};
const receivedTracker = {};
const randomId = require("random-id");

module.exports = function (wsPort) {
  const io = new Server(wsPort);
  io.on("connection", (socket) => {
    connections[socket.id] = socket;
    socket.on("received", (arg) => {
      if (arg.id && typeof receivedTracker[arg.id] === "function") {
        receivedTracker[arg.id]();
      }
    });
  });
  return {
    wsSend: async function (self, tag, id, key, value) {
      const socket = connections[id];
      const id = randomId();
      socket.emit("send", {
        id,
        sender: self,
        tag,
        key,
        value,
      });
      await new Promise((r) => (receivedTracker[id] = r));
    },
    wsBroadcast: async function (self, tag, id, key, value) {
      const socket = connections[id];
      const id = randomId();
      socket.emit("broadcast", {
        id,
        sender: self,
        tag,
        key,
        value,
      });
      await new Promise((r) => (receivedTracker[id] = r));
    },
  };
};
