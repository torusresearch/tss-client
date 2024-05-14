const { spawn } = require("child_process");
const path = require("path");
const waitOn = require("wait-on");
const find = require("find-process");

function exitPromise(process) {
  return new Promise((resolve) => {
    process.on("exit", (code) => resolve(code));
  });
}

(async () => {
  const rootDir = path.join(__dirname, "..");

  const appDir = path.join(rootDir, "/packages/web-example");
  console.log("appDir", appDir);
  const appProcess = spawn("npm", ["run", "serve"], { cwd: appDir });
  console.log("Waiting for app to be up and running...");

  const appPort = 8080;
  await waitOn({
    resources: [`http://localhost:${appPort}`],
  });
  console.log("Done.");

  const ciProcess = spawn("node", ["scripts/browser-test.js", 3], { stdio: "inherit" });
  const code = await exitPromise(ciProcess);

  appProcess.kill();
  
  // Fix for webpack dev server not being killed by appProcess.kill().
  const webpack = await find('port', appPort);
  if (webpack.length > 0) {
    console.log(`killing ${webpack[0].name}`);
    process.kill(webpack[0].pid);
  } else {
    console.log(`no process listening on ${appPort}`);
  }

  process.exit(code);
})();
