import { TssWorker } from "../../interfaces";

class TssWebWorker implements TssWorker {
  constructor(private _tssWasmFileurl: string) {}

  async work<T>(method: string, args: string[]): Promise<T> {
    try {
      const worker = new Worker(new URL("./worker.js", import.meta.url));
      const msg = { method, args, wasmFileUrl: this._tssWasmFileurl };
      const prom = new Promise((resolve) => {
        worker.onmessage = function ({ data }) {
          resolve(data.data);
        };
      });
      worker.postMessage({ data: msg });
      const mes = await prom;
      return mes as T;
    } catch (e) {
      console.log("error", e);
    }
  }
}

export default TssWebWorker;
