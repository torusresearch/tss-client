const { Server } = require("socket.io");
const connections = {};
const randomId = require("random-id");
const wsPort = process.argv[3];
const io = new Server(wsPort, {
  cors: {
    methods: ["GET", "POST"]
  }
});
console.log(`websocket on port ${wsPort}`);
io.on("connection", (socket) => {
  connections[socket.id] = socket;
});
module.exports = {
  wsNotify: async function (self, tag, webSocketId, key, value) {
    const socket = connections[webSocketId];
    socket.emit("notify", {
      sender: self,
      tag,
      key,
      value,
    });
  },
  wsSend: async function (self, tag, webSocketId, key, value) {
    let resolve;
    let p = new Promise((r) => (resolve = r));
    const socket = connections[webSocketId];
    console.log(`socket sending message ${key}`)
    socket.emit(
      "send",
      {
        sender: self,
        tag,
        key,
        value,
      },
      resolve
    );
    return p;
  },
  wsBroadcast: async function (self, tag, webSocketId, key, value) {
    let resolve;
    let p = new Promise((r) => (resolve = r));
    const socket = connections[webSocketId];
    console.log(`socket broadcasting message ${key}`)
    socket.emit(
      "broadcast",
      {
        sender: self,
        tag,
        key,
        value,
      },
      resolve
    );
    return p;
  },
};
