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
/**
* Handler for `console.log` invocations.
*
* If a test is currently running it takes the `args` array and stringifies
* it and appends it to the current output of the test. Otherwise it passes
* the arguments to the original `console.log` function, psased as
* `original`.
* @param {Array<any>} args
*/
export function __wbgtest_console_log(args: Array<any>): void;
/**
* Handler for `console.debug` invocations. See above.
* @param {Array<any>} args
*/
export function __wbgtest_console_debug(args: Array<any>): void;
/**
* Handler for `console.info` invocations. See above.
* @param {Array<any>} args
*/
export function __wbgtest_console_info(args: Array<any>): void;
/**
* Handler for `console.warn` invocations. See above.
* @param {Array<any>} args
*/
export function __wbgtest_console_warn(args: Array<any>): void;
/**
* Handler for `console.error` invocations. See above.
* @param {Array<any>} args
*/
export function __wbgtest_console_error(args: Array<any>): void;
/**
* Runtime test harness support instantiated in JS.
*
* The node.js entry script instantiates a `Context` here which is used to
* drive test execution.
*/
export class WasmBindgenTestContext {
  free(): void;
/**
* Creates a new context ready to run tests.
*
* A `Context` is the main structure through which test execution is
* coordinated, and this will collect output and results for all executed
* tests.
*/
  constructor();
/**
* Inform this context about runtime arguments passed to the test
* harness.
*
* Eventually this will be used to support flags, but for now it's just
* used to support test filters.
* @param {any[]} args
*/
  args(args: any[]): void;
/**
* Executes a list of tests, returning a promise representing their
* eventual completion.
*
* This is the main entry point for executing tests. All the tests passed
* in are the JS `Function` object that was plucked off the
* `WebAssembly.Instance` exports list.
*
* The promise returned resolves to either `true` if all tests passed or
* `false` if at least one test failed.
* @param {any[]} tests
* @returns {Promise<any>}
*/
  run(tests: any[]): Promise<any>;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
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
  readonly batch_size: () => number;
  readonly __wbg_wasmbindgentestcontext_free: (a: number) => void;
  readonly wasmbindgentestcontext_new: () => number;
  readonly wasmbindgentestcontext_args: (a: number, b: number, c: number) => void;
  readonly wasmbindgentestcontext_run: (a: number, b: number, c: number) => number;
  readonly __wbgtest_console_log: (a: number) => void;
  readonly __wbgtest_console_debug: (a: number) => void;
  readonly __wbgtest_console_info: (a: number) => void;
  readonly __wbgtest_console_warn: (a: number) => void;
  readonly __wbgtest_console_error: (a: number) => void;
  readonly __wbindgen_malloc: (a: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number) => number;
  readonly __wbindgen_export_2: WebAssembly.Table;
  readonly _dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__ha824d1a3a4edcca4: (a: number, b: number, c: number) => void;
  readonly __wbindgen_free: (a: number, b: number) => void;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly wasm_bindgen__convert__closures__invoke3_mut__h727822f3f891f041: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly wasm_bindgen__convert__closures__invoke2_mut__h2980f5f1120413d3: (a: number, b: number, c: number, d: number) => void;
}

/**
* Synchronously compiles the given `bytes` and instantiates the WebAssembly module.
*
* @param {BufferSource} bytes
*
* @returns {InitOutput}
*/
export function initSync(bytes: BufferSource): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
