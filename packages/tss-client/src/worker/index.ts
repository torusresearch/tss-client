// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line
import createWorker from "workerize-loader?inline!./worker.js";

import { TssWorker } from "../types";

class TssWebWorker implements TssWorker {
  constructor(private _wasmUrl: string) {}

  async work<T>(method: string, args: string[]): Promise<T> {
    try {
      const worker = createWorker();
      await worker.instantiate(this._wasmUrl);
      const mes = await worker.takeAction(method, args);
      return mes as T;
    } catch (e) {
      console.error(e);
    }
  }
}

export default TssWebWorker;
