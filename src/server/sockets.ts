import { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";

import msgQueue from "./queue";

// We can also use some kind of an emitter (like redis emitter)
// which supports handling of multiple nodes plus sending message from
// outside the socket manager context.
let io: SocketServer | null = null;

export const registerWebSockets = (server: HttpServer) => {
  io = new SocketServer(server, {
    cors: {
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    socket.on("send_msg", (payload, cb) => {
      const { session, sender, recipient, msg_type, msg_data } = payload;
      const pendingRead = globalThis.pendingReads[`session-${session}:sender-${sender}:recipient-${recipient}:msg_type-${msg_type}`];
      if (pendingRead !== undefined) {
        pendingRead(msg_data);
      } else {
        msgQueue.publishMessage({
          session,
          sender,
          recipient,
          msg_type,
          msg_data,
        });
      }
      if (cb) cb();
    });
  });
};

export const getEmitterInstance = (): SocketServer | null => {
  return io;
};
