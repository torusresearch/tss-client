const { spawn } = require("child_process");
const base_port = 8000;
const base_ws_port = 8000;
const n = process.argv[2] ? parseInt(process.argv[2]) : 5;
(async () => {
  for (let i = 1; i <= n; i++) {
    const tssServer = spawn("node", ["./dist/server.js", `${base_port + i}`, `${base_ws_port + i}`]);
    tssServer.on(
      "exit",
      (function (index) {
        return (code) => {
          console.log(`server ${index} exited with code ${code}`);
        };
      })(i)
    );
    tssServer.stderr.on(
      "data",
      (function (index) {
        return (data) => {
          console.log(`server ${index} stderr:`, data.toString());
        };
      })(i)
    );
    tssServer.stdout.on(
      "data",
      (function (index) {
        return (data) => {
          console.log(`server ${index} stdout:`, data.toString());
        };
      })(i)
    );
  }
})();
