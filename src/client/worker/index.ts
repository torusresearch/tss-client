import { TssWorker } from "../../interfaces";

class TssWebWorker implements TssWorker {
  constructor(private _tssWasmFileurl: string) {}

  work = async (method: string, args: string[]): Promise<unknown> => {
    try {
      const worker = new Worker(new URL("./calc.js", import.meta.url));
      const msg = { method, args, wasmFileUrl: this._tssWasmFileurl };
      const prom = new Promise((resolve) => {
        worker.onmessage = function ({ data }) {
          resolve(data.data);
        };
      });
      worker.postMessage({ data: msg });
      return await prom;
    } catch (e) {
      console.log("error", e);
    }
  };
}

export default TssWebWorker;
