const path = require("path");
const os = require("os");
const { Worker, MessageChannel, parentPort } = require("bthreads");

const workers = [];
let workerCounter = 0;
async function work(workerIndex, method, args) {
  let worker = workers[workerIndex];
  const data = { method, args };
  const mc = new MessageChannel();
  const res = new Promise((resolve) => {
    mc.port1.once("message", ({ data }) => resolve(data));
  });
  const ports = [mc.port2];
  worker.postMessage({ data, ports }, ports);
  const finalRes = await res;
  return finalRes;
}

for (let i = 0; i < os.cpus().length; i++) {
  const worker = new Worker(path.resolve(__dirname, "./calc.js"));
  workers.push(worker);
}

const workerNum = () => {
  return (workerCounter++) % os.cpus().length
}

module.exports = {
  work,
  workerNum
};

