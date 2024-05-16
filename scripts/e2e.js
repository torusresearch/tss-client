const { spawn } = require("child_process");
const path = require("path");
const waitOn = require("wait-on");
const find = require("find-process");

function exitPromise(process) {
  return new Promise((resolve) => {
    process.on("exit", (code) => resolve(code));
  });
}

function parseBool(v) {
  if (v === "true" || v === "1") {
    return true;
  } else if (v === "false" || v === "0") {
    return false;
  } else {
    return v;
  }
}

(async () => {
  const rootDir = path.join(__dirname, "..");
  const count = process.argv[2] || "1";
  const package = process.argv[3] || "dkls/web-example";
  const serveCommand = process.argv[4] || "serve:local";
  const waitForServers = process.argv[5] === undefined || parseBool(process.argv[5]);


  if (waitForServers) {
    // Wait for servers and app to be up and running.
    console.log("Waiting for servers to be up and running...");
    await waitOn({
      resources: ["http://localhost:8000", "http://localhost:8001", "http://localhost:8002", "http://localhost:8003", "http://localhost:8004"],
    });
  }

  if ( serveCommand.indexOf("local") !== -1 ) {
    if ( package.indexOf("dkls") !== -1 ) {
    console.log("Waiting for worker pools to be online...");
    // wait for worker pool to come online
    await new Promise((resolve, reject) => {
      let counter = 0;

      const timer = setInterval(async () => {

        // TODO: refactor this block into a cleaner function
        let s1 = await fetch('http://localhost:8000/online_workers')
        s1 = await s1.json();
        let s2 = await fetch('http://localhost:8001/online_workers');
        s2 = await s2.json();
        let s3 = await fetch('http://localhost:8002/online_workers');
        s3 = await s3.json();
        let s4 = await fetch('http://localhost:8003/online_workers');
        s4 = await s4.json();
        let s5 = await fetch('http://localhost:8004/online_workers');
        s5 = await s5.json();

        if (s1.online === true && s2.online === true && s3.online === true && s4.online === true && s5.online) {
          clearInterval(timer);
          resolve();
          return;
        }
        if (counter >= 5) {
          clearInterval(timer);
          reject(new Error("Server pools are not online"));
          return;
        }
      }, 5000);
    });
    } 
  }

  const appDir = path.join(rootDir, `/packages/${package}`);
  console.log("appDir", appDir);
  const appProcess = spawn("npm", ["run", serveCommand], { cwd: appDir });
  console.log("Waiting for app to be up and running...");

  const appPort = 8080;
  await waitOn({
    resources: [`http://localhost:${appPort}`],
  });
  console.log("Done.");

  const ciProcess = spawn("node", ["scripts/browser-test.js", `${count}`], { stdio: "inherit" });
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
