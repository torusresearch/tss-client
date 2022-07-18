import cors from "cors";
import express from "express";

import routes from "./routes";

const app = express();

app.use(express.json());
app.use(cors());

// app.use(express.static("public"));
// app.use(express.static("dist"));

app.use("/", routes);

export default app;
