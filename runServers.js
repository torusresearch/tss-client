var { spawn } = require("child_process");
let base_port = 8000;

(async () => {
  for (let i = 1; i <= 6; i++) {
    let tssServer = spawn("node", [
      "./index.js",
      `${base_port + i}`
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
