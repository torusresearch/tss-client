// Registering global rust functions.
import "./global";

import cors from "cors";
import express from "express";

import router from "./routes";

const app = express();

app.use(express.json());
app.use(cors());

// Register app routes.
app.use("/", router);

export default app;
