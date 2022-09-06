import cors from "cors";
import express from "express";

import registerRoutes from "./routes";
// import router from "./routes";

const app = express();

app.use(express.json());
app.use(cors());

// app.use(express.static("public"));
// app.use(express.static("dist"));

// export default registerRoutes(app);
// app.use("/", router);

export default registerRoutes(app);

// export default app;
