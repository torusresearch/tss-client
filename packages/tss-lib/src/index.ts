import * as lib from "./pkg";
import wasmDataURL from "./pkg/dkls_bg.wasm";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const base64Data = (wasmDataURL as any).split("base64,")[1];
const wasmBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

lib.initSync(wasmBuffer);

const tssLib = {
  keyType: "secp256k1",
  lib,
};

export { tssLib };
export default lib;
