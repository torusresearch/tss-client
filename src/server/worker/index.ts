import os from "os";
import { MessageChannel, Worker } from "worker_threads";

const workers = [];
let workerCounter = 0;

for (let i = 0; i < os.cpus().length; i++) {
  const worker = new Worker("./src/server/worker/calc.js");
  workers.push(worker);
}

const workerNum = () => {
  return workerCounter++ % os.cpus().length;
};

export async function work(method, args) {
  const workerIndex = workerNum();
  const worker = workers[workerIndex];
  const msg = { method, args };
  const mc = new MessageChannel();
  const res = new Promise((resolve) => {
    mc.port1.once("message", ({ data }) => resolve(data));
  });
  const ports = [mc.port2];
  worker.postMessage({ data: msg, ports }, ports);
  const finalRes = await res;
  return finalRes;
}
