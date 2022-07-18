import { Server } from "socket.io";

const connections = {};
const wsPort = process.argv[3];

const io = new Server(wsPort, {
  cors: {
    methods: ["GET", "POST"],
  },
});

console.log(`websocket on port ${wsPort}`);

io.on("connection", (socket) => {
  connections[socket.id] = socket;
});

export const wsNotify = async (self, tag, webSocketId, key, value) => {
  const socket = connections[webSocketId];
  socket.emit("notify", {
    sender: self,
    tag,
    key,
    value,
  });
};

export const wsSend = async (self, tag, webSocketId, key, value) => {
  let resolve;
  const p = new Promise((r) => (resolve = r));
  const socket = connections[webSocketId];
  console.log(`socket sending message ${key}`);
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
};

export const wsBroadcast = async (self, tag, webSocketId, key, value) => {
  let resolve;
  const p = new Promise((r) => (resolve = r));
  const socket = connections[webSocketId];
  console.log(`socket broadcasting message ${key}`);
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
};
