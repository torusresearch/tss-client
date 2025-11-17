import initLib, * as lib from "./pkg/dkls";
import wasmDataURL from "./pkg/dkls_bg.wasm";

function wasm(): Uint8Array {
  const base64Data = (wasmDataURL as unknown as string).split("base64,")[1];
  const wasmBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
  return wasmBuffer;
}

export interface WasmLib {
  generateKey: typeof lib.generate_key;
  sign: typeof lib.sign;
  keyType: string;
  sigType: string;
}

export async function load(): Promise<WasmLib> {
  const wasmBuffer = wasm();
  await initLib(wasmBuffer);
  return {
    generateKey: lib.generate_key,
    sign: lib.sign,
    keyType: "secp256k1",
    sigType: "ecdsa-secp256k1",
  };
}

export function loadSync(): WasmLib {
  const wasmBuffer = wasm();
  lib.initSync({ module: wasmBuffer });
  return {
    generateKey: lib.generate_key,
    sign: lib.sign,
    keyType: "secp256k1",
    sigType: "ecdsa-secp256k1",
  };
}

export const tssLib = {
  keyType: "secp256k1",
  sigType: "ecdsa-secp256k1",
  load,
  loadSync,
};

export type * from "./msg";

export default tssLib;
