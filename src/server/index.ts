import { createServer } from "http";

import app from "./app";
import { registerWebSockets } from "./sockets";

const port = process.env.PORT || process.argv[2];
if (!port) {
  throw new Error("port not specified");
}

const server = createServer(app);

// Register Websockets.
registerWebSockets(server);

server.listen(port, () => {
  console.log("app listening on port", port);
});
