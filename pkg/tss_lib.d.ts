/* tslint:disable */
/* eslint-disable */
/**
*/
export function reset_timing_ms(): void;
/**
* @returns {number}
*/
export function get_timing_ms(): number;
/**
* @param {number} index
* @returns {any[]}
*/
export function generate_keys(index: number): any[];
/**
* @returns {string}
*/
export function random_bigint(): string;
/**
* @returns {string}
*/
export function generator(): string;
/**
* @param {string} pt
* @param {string} k
* @returns {string}
*/
export function scalar_mul(pt: string, k: string): string;
/**
* @param {string} pt_x
* @param {string} pt_y
* @returns {string}
*/
export function coords_to_pt(pt_x: string, pt_y: string): string;
/**
* @param {string} gamma_i
* @returns {any[]}
*/
export function phase_1_broadcast(gamma_i: string): any[];
/**
* @param {string} k_i
* @param {string} ek
* @param {string} dlog_statement
* @returns {any[]}
*/
export function message_A(k_i: string, ek: string, dlog_statement: string): any[];
/**
* @param {string} gamma_i
* @param {string} w_i
* @param {string} ek
* @param {string} msgA
* @param {string} dlog_statement
* @returns {any[]}
*/
export function message_Bs(gamma_i: string, w_i: string, ek: string, msgA: string, dlog_statement: string): any[];
/**
* @param {string} k_i
* @param {string} gamma_i
* @param {string} w_i
* @param {string} keys
* @param {any[]} gwis
* @param {any[]} m_b_gammas
* @param {any[]} m_b_ws
* @param {any[]} beta_gammas
* @param {any[]} beta_wis
* @param {number} index
* @param {Int32Array} parties
* @returns {any[]}
*/
export function message_Alphas(k_i: string, gamma_i: string, w_i: string, keys: string, gwis: any[], m_b_gammas: any[], m_b_ws: any[], beta_gammas: any[], beta_wis: any[], index: number, parties: Int32Array): any[];
/**
* @param {any[]} delta_is
* @returns {string}
*/
export function phase_3_deltaInv(delta_is: any[]): string;
/**
* @param {string} m_b_gamma
* @returns {string}
*/
export function get_b_proof(m_b_gamma: string): string;
/**
* @param {any[]} coms
* @param {any[]} D_is
* @param {any[]} D_i_blinds
* @param {any[]} b_proofs
* @param {string} delta_inv
* @param {number} index
* @param {Int32Array} parties
* @returns {string}
*/
export function phase_4_Di_verify(coms: any[], D_is: any[], D_i_blinds: any[], b_proofs: any[], delta_inv: string, index: number, parties: Int32Array): string;
/**
* Note that the first element in the returned vector is R_k_i, and the rest are proofs
* @param {string} R
* @param {string} k_i
* @param {any[]} m_as
* @param {any[]} m_a_randoms
* @param {any[]} h1h2Ntildes
* @param {string} keys
* @param {number} index
* @param {Int32Array} parties
* @returns {any[]}
*/
export function phase_5_Rki(R: string, k_i: string, m_as: any[], m_a_randoms: any[], h1h2Ntildes: any[], keys: string, index: number, parties: Int32Array): any[];
/**
* @param {any[]} R_k_is
* @param {any[]} eks
* @param {any[]} msgAs
* @param {any[]} proofs
* @param {any[]} proofs_R_k_i
* @param {string} h1h2Ntilde
* @param {string} R
* @param {number} index
* @param {Int32Array} parties
* @returns {boolean}
*/
export function phase_5_verify(R_k_is: any[], eks: any[], msgAs: any[], proofs: any[], proofs_R_k_i: any[], h1h2Ntilde: string, R: string, index: number, parties: Int32Array): boolean;
/**
* @param {string} R
* @param {string} sigma_i
* @returns {string}
*/
export function phase_6_Rsigmai(R: string, sigma_i: string): string;
/**
* @param {any[]} S_is
* @param {string} y
* @returns {boolean}
*/
export function phase_6_verify(S_is: any[], y: string): boolean;
/**
* @param {string} msg_hash
* @param {string} k_i
* @param {string} R
* @param {string} sigma_i
* @param {string} y
* @returns {any[]}
*/
export function phase_7_sign(msg_hash: string, k_i: string, R: string, sigma_i: string, y: string): any[];
/**
* @param {string} y
* @param {string} msg_hash
* @param {string} R
* @param {any[]} local_sig_sis
* @returns {string}
*/
export function get_signature(y: string, msg_hash: string, R: string, local_sig_sis: any[]): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly generate_keys: (a: number, b: number) => void;
  readonly random_bigint: (a: number) => void;
  readonly generator: (a: number) => void;
  readonly scalar_mul: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly coords_to_pt: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly phase_1_broadcast: (a: number, b: number, c: number) => void;
  readonly message_A: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly message_Bs: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => void;
  readonly message_Alphas: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number, p: number, q: number, r: number, s: number, t: number, u: number, v: number) => void;
  readonly phase_3_deltaInv: (a: number, b: number, c: number) => void;
  readonly get_b_proof: (a: number, b: number, c: number) => void;
  readonly phase_4_Di_verify: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number) => void;
  readonly phase_5_Rki: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number, p: number) => void;
  readonly phase_5_verify: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number, p: number, q: number) => number;
  readonly phase_6_Rsigmai: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly phase_6_verify: (a: number, b: number, c: number, d: number) => number;
  readonly phase_7_sign: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => void;
  readonly get_signature: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => void;
  readonly reset_timing_ms: () => void;
  readonly get_timing_ms: () => number;
  readonly rustsecp256k1_v0_4_1_context_create: (a: number) => number;
  readonly rustsecp256k1_v0_4_1_context_destroy: (a: number) => void;
  readonly rustsecp256k1_v0_4_1_default_illegal_callback_fn: (a: number, b: number) => void;
  readonly rustsecp256k1_v0_4_1_default_error_callback_fn: (a: number, b: number) => void;
  readonly __wbindgen_malloc: (a: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number) => number;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_free: (a: number, b: number) => void;
  readonly __wbindgen_exn_store: (a: number) => void;
}

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
