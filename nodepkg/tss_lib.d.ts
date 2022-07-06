/* tslint:disable */
/* eslint-disable */
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
