import { Server, Socket } from "socket.io";

const connections: Record<string, Socket> = {};
const wsPort = process.argv[3];

const io = new Server(parseInt(wsPort), {
  cors: {
    methods: ["GET", "POST"],
  },
});

console.log(`websocket on port ${wsPort}`);

io.on("connection", (socket) => {
  connections[socket.id] = socket;
});

export const wsNotify = async (websocketId, player_index, session) => {
  let resolve;
  const p = new Promise((r) => (resolve = r));
  const socket = connections[websocketId];
  socket.emit(
    "precompute_complete",
    {
      party: player_index,
      session,
    },
    resolve
  );
  return p;
};

export const wsSend = async (websocketId, session, self_index, party, msg_type, msg_data) => {
  let resolve;
  const p = new Promise((r) => (resolve = r));
  const socket = connections[websocketId];
  console.log(`socket sending message ${msg_type}`);
  socket.emit(
    "send",
    {
      session,
      sender: self_index,
      recipient: party,
      msg_type,
      msg_data,
    },
    resolve
  );
  return p;
};
