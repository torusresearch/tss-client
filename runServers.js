var { spawn } = require("child_process");
let base_port = 8000;
let base_ws_port = 18000;
let n = process.argv[2] ? parseInt(process.argv[2]) : 6;
(async () => {
  for (let i = 1; i <= n; i++) {
    let tssServer = spawn("node", [
      "./server.js",
      `${base_port + i}`,
      `${base_ws_port + i}`,
    ]);
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
