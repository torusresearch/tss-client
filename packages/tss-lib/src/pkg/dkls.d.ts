/* tslint:disable */
/* eslint-disable */
/**
* @returns {number}
*/
export function batch_size(): number;
/**
* @param {string} state
* @returns {number}
*/
export function random_generator(state: string): number;
/**
* @param {number} rng
*/
export function random_generator_free(rng: number): void;
/**
* @param {string} session
* @param {number} player_index
* @param {number} player_count
* @param {number} threshold
* @param {string} share
* @param {string} pubkey
* @returns {number}
*/
export function threshold_signer(session: string, player_index: number, player_count: number, threshold: number, share: string, pubkey: string): number;
/**
* @param {number} signer
*/
export function threshold_signer_free(signer: number): void;
/**
* @param {number} signer
* @param {number} rng
* @returns {Promise<any>}
*/
export function setup(signer: number, rng: number): Promise<any>;
/**
* @param {Uint8Array} parties
* @param {number} signer
* @param {number} rng
* @returns {Promise<any>}
*/
export function precompute(parties: Uint8Array, signer: number, rng: number): Promise<any>;
/**
* @param {string} msg
* @param {boolean} hash_only
* @param {any} precompute
* @returns {any}
*/
export function local_sign(msg: string, hash_only: boolean, precompute: any): any;
/**
* @param {any} precompute
* @returns {any}
*/
export function get_r_from_precompute(precompute: any): any;
/**
* @param {string} msg
* @param {boolean} hash_only
* @param {any} r
* @param {any[]} sig_frags
* @param {string} pubkey
* @returns {any}
*/
export function local_verify(msg: string, hash_only: boolean, r: any, sig_frags: any[], pubkey: string): any;
/**
* @param {Uint8Array} counterparties
* @param {string} msg
* @param {boolean} hash_only
* @param {number} signer
* @param {number} rng
* @returns {Promise<any>}
*/
export function sign(counterparties: Uint8Array, msg: string, hash_only: boolean, signer: number, rng: number): Promise<any>;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly batch_size: () => number;
  readonly random_generator: (a: number, b: number, c: number) => void;
  readonly random_generator_free: (a: number) => void;
  readonly threshold_signer: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => void;
  readonly threshold_signer_free: (a: number) => void;
  readonly setup: (a: number, b: number) => number;
  readonly precompute: (a: number, b: number, c: number) => number;
  readonly local_sign: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly get_r_from_precompute: (a: number, b: number) => void;
  readonly local_verify: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => void;
  readonly sign: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
  readonly __wbindgen_malloc: (a: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number) => number;
  readonly __wbindgen_export_2: WebAssembly.Table;
  readonly _dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h7814fecea8304d3b: (a: number, b: number, c: number) => void;
  readonly __wbindgen_free: (a: number, b: number) => void;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly wasm_bindgen__convert__closures__invoke2_mut__hb9efae8f8498f5b8: (a: number, b: number, c: number, d: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {SyncInitInput} module
*
* @returns {InitOutput}
*/
export function initSync(module: SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function init (module_or_path: InitInput | Promise<InitInput>): Promise<InitOutput>;
