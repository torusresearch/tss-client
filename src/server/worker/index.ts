import os from "os";
import { MessageChannel, Worker } from "worker_threads";

import { TssWorker } from "../../interfaces";

export default class TssNodeWorker implements TssWorker {
  private _workers: Worker[] = [];

  private _workerCounter = 0;

  constructor() {
    this._init();
  }

  work = (method: string, args: string[]): Promise<unknown> => {
    const workerIndex = this._workerNum();
    const worker = this._workers[workerIndex];
    const msg = { method, args };
    const mc = new MessageChannel();
    const res = new Promise((resolve) => {
      mc.port1.once("message", ({ data }) => resolve(data));
    });
    const ports = [mc.port2];
    worker.postMessage({ data: msg, ports }, ports);
    return res;
  };

  private _init = () => {
    for (let i = 0; i < os.cpus().length; i++) {
      const worker = new Worker(new URL("./calc.js", import.meta.url));
      this._workers.push(worker);
    }
  };

  private _workerNum = (): number => {
    return this._workerCounter++ % os.cpus().length;
  };
}
