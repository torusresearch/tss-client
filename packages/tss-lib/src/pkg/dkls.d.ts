/* tslint:disable */
/* eslint-disable */
export function generate_key(rng_seed: Uint8Array, comm: any, player_index: number, player_count: number, threshold: number): Promise<GenerateKeyResult>;
export function sign(rng_seed: Uint8Array, comm: any, counterparties: Uint16Array, key_share: Uint8Array, pub_key: Uint8Array, player_index: number, player_count: number, threshold: number, msg: Uint8Array): Promise<Uint8Array>;
export function batch_size(): number;
export function random_generator(state: string): number;
export function random_generator_free(rng: number): void;
export function threshold_signer(session: string, player_index: number, player_count: number, threshold: number, share: string, pubkey: string): number;
export function threshold_signer_free(signer: number): void;
export function setup(signer: number, rng: number, comm: any): Promise<any>;
export function precompute(parties: Uint8Array, signer: number, rng: number, comm: any): Promise<any>;
export function local_sign(msg: string, hash_only: boolean, precompute: any): any;
export function get_r_from_precompute(precompute: any): any;
export function local_verify(msg: string, hash_only: boolean, r: any, sig_frags: any[], pubkey: string): any;
export function sign_deprecated(counterparties: Uint8Array, msg: string, hash_only: boolean, signer: number, rng: number, comm: any): Promise<any>;
export class GenerateKeyResult {
  private constructor();
  free(): void;
  readonly key_share: Uint8Array;
  readonly pub_key: Uint8Array;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_generatekeyresult_free: (a: number, b: number) => void;
  readonly generatekeyresult_key_share: (a: number) => [number, number];
  readonly generatekeyresult_pub_key: (a: number) => [number, number];
  readonly generate_key: (a: number, b: number, c: any, d: number, e: number, f: number) => any;
  readonly sign: (a: number, b: number, c: any, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number) => any;
  readonly batch_size: () => number;
  readonly random_generator: (a: number, b: number) => [number, number, number];
  readonly random_generator_free: (a: number) => void;
  readonly threshold_signer: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => [number, number, number];
  readonly threshold_signer_free: (a: number) => void;
  readonly setup: (a: number, b: number, c: any) => any;
  readonly precompute: (a: any, b: number, c: number, d: any) => any;
  readonly local_sign: (a: number, b: number, c: number, d: any) => [number, number, number];
  readonly get_r_from_precompute: (a: any) => [number, number, number];
  readonly local_verify: (a: number, b: number, c: number, d: any, e: number, f: number, g: number, h: number) => [number, number, number];
  readonly sign_deprecated: (a: any, b: number, c: number, d: number, e: number, f: number, g: any) => any;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_export_2: WebAssembly.Table;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_export_6: WebAssembly.Table;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly closure108_externref_shim: (a: number, b: number, c: any) => void;
  readonly closure128_externref_shim: (a: number, b: number, c: any, d: any) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
