import initLib, * as lib from "./pkg/dkls";
import wasmDataURL from "./pkg/dkls_bg.wasm";

function wasm(): Uint8Array {
  const base64Data = (wasmDataURL as unknown as string).split("base64,")[1];
  const wasmBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
  return wasmBuffer;
}

export type WasmLib = typeof lib;

export async function load(): Promise<WasmLib> {
  const wasmBuffer = wasm();
  await initLib(wasmBuffer);
  return lib;
}

export function loadSync(): WasmLib {
  const wasmBuffer = wasm();
  lib.initSync(wasmBuffer);
  return lib;
}

export const tssLib = {
  keyType: "secp256k1",
  load,
  loadSync,
};

export default tssLib;
