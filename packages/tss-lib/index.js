import tsslib from "./browser";
import wasmData from "./wasm/client.wasm";
export * from "./browser";
export const initWasm = async () => {
  await tsslib(wasmData);
};
