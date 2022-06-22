const { Server } = require("socket.io");
const connections = {};
const receivedTracker = {};
const randomId = require("random-id");
const wsPort = process.argv[3];
const io = new Server(wsPort);
console.log(`websocket on port ${wsPort}`);
io.on("connection", (socket) => {
  connections[socket.id] = socket;
  socket.on("received", (arg) => {
    if (arg.id && typeof receivedTracker[arg.id] === "function") {
      receivedTracker[arg.id]();
    }
  });
});
module.exports = {
  wsNotify: async function (self, tag, webSocketId, key, value) {
    const socket = connections[webSocketId];
    const messageId = randomId();
    console.log("notify message via websocket", {
      socket,
      messageId,
      sender: self,
      tag,
      key,
      value,
    });
    socket.emit("notify", {
      messageId,
      sender: self,
      tag,
      key,
      value,
    });
    await new Promise((r) => (receivedTracker[webSocketId] = r));
    console.log(`messageId ${messageId} received for notify`);
  },
  wsSend: async function (self, tag, webSocketId, key, value) {
    const socket = connections[webSocketId];
    const messageId = randomId();
    console.log("sending message via websocket", {
      socket,
      messageId,
      sender: self,
      tag,
      key,
      value,
    });
    socket.emit("send", {
      messageId,
      sender: self,
      tag,
      key,
      value,
    });
    await new Promise((r) => (receivedTracker[webSocketId] = r));
    console.log(`messageId ${messageId} received for send`);
  },
  wsBroadcast: async function (self, tag, webSocketId, key, value) {
    const socket = connections[webSocketId];
    const messageId = randomId();
    console.log("broadcasting message via websocket", {
      socket,
      messageId,
      sender: self,
      tag,
      key,
      value,
    });
    socket.emit("broadcast", {
      messageId,
      sender: self,
      tag,
      key,
      value,
    });
    await new Promise((r) => (receivedTracker[messageId] = r));
    console.log(`messageId ${messageId} received for broadcast`);
  },
};
