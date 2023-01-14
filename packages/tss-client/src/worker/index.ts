// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line

import { TssWorker } from "../types";

class TssWebWorker implements TssWorker {
  constructor(private _wasmUrl: string) {}

  async work<T>(method: string, args: string[]): Promise<T> {
    try {
      const worker = new Worker(new URL('./worker.js', import.meta.url));
      worker.postMessage([this._wasmUrl, method, args]);
      
      const result = await new Promise((resolve, reject) => {
        worker.onmessage = (e) => {
          console.log('Message received from worker: ' + e);
          const ok = e.data[0];
          if (!ok) {
            reject();
            return;
          }
          const result = e.data[1];
          resolve(result);
        };
      });
      worker.terminate();
      return result as T;
    } catch (e) {
      console.error(e);
    }
  }
}

export default TssWebWorker;
