import app from "./app";

const port = process.argv[2] || process.env.PORT;
if (!port) {
  throw new Error("port not specified");
}

app.listen(port, () => {
  console.log("app listening on port", port);
});
