import app from "./app";

const port = process.env.PORT || process.argv[2];
if (!port) {
  throw new Error("port not specified");
}

app.listen(port, () => {
  console.log("app listening on port", port);
});
