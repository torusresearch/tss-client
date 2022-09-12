import cors from "cors";
import express from "express";

import router from "./routes";

// Catch all errors, including exceptions in wasm
process.on("uncaughtException", function (err) {
  console.log(`Caught exception: ${err}`);
});

const app = express();

app.use(express.json());
app.use(cors());

// Register app routes.
app.use("/", router);

export default app;
