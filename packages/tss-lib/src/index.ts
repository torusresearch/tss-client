import initLib, * as lib from "./pkg/dkls";
import wasmDataURL from "./pkg/dkls_bg.wasm";

function wasm(): Uint8Array {
  const base64Data = (wasmDataURL as unknown as string).split("base64,")[1];
  const wasmBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
  return wasmBuffer;
}

export interface WasmLib {
  threshold_signer: typeof lib.threshold_signer;
  threshold_signer_free: typeof lib.threshold_signer_free;
  random_generator: typeof lib.random_generator;
  random_generator_free: typeof lib.random_generator_free;
  setup: typeof lib.setup;
  precompute: typeof lib.precompute;
  local_sign: typeof lib.local_sign;
  get_r_from_precompute: typeof lib.get_r_from_precompute;
  local_verify: typeof lib.local_verify;
  keyType: string;
  sigType: string;
}

export async function load(): Promise<WasmLib> {
  const wasmBuffer = wasm();
  await initLib(wasmBuffer);
  return {
    threshold_signer: lib.threshold_signer,
    threshold_signer_free: lib.threshold_signer_free,
    random_generator: lib.random_generator,
    random_generator_free: lib.random_generator_free,
    setup: lib.setup,
    precompute: lib.precompute,
    local_sign: lib.local_sign,
    get_r_from_precompute: lib.get_r_from_precompute,
    local_verify: lib.local_verify,
    keyType: "secp256k1",
    sigType: "ecdsa-secp256k1",
  };
}

export function loadSync(): WasmLib {
  const wasmBuffer = wasm();
  lib.initSync({ module: wasmBuffer });
  return {
    threshold_signer: lib.threshold_signer,
    threshold_signer_free: lib.threshold_signer_free,
    random_generator: lib.random_generator,
    random_generator_free: lib.random_generator_free,
    setup: lib.setup,
    precompute: lib.precompute,
    local_sign: lib.local_sign,
    get_r_from_precompute: lib.get_r_from_precompute,
    local_verify: lib.local_verify,
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

export default tssLib;
