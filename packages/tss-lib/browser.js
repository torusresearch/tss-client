let wasm;

const heap = new Array(32).fill(undefined);

heap.push(undefined, null, true, false);

function getObject(idx) {
  return heap[idx];
}

let heap_next = heap.length;

function dropObject(idx) {
  if (idx < 36) return;
  heap[idx] = heap_next;
  heap_next = idx;
}

function takeObject(idx) {
  const ret = getObject(idx);
  dropObject(idx);
  return ret;
}

const cachedTextDecoder = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachedUint8Memory0 = new Uint8Array();

function getUint8Memory0() {
  if (cachedUint8Memory0.byteLength === 0) {
    cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachedUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
  return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

function addHeapObject(obj) {
  if (heap_next === heap.length) heap.push(heap.length + 1);
  const idx = heap_next;
  heap_next = heap[idx];

  heap[idx] = obj;
  return idx;
}

let WASM_VECTOR_LEN = 0;

const cachedTextEncoder = new TextEncoder("utf-8");

const encodeString =
  typeof cachedTextEncoder.encodeInto === "function"
    ? function (arg, view) {
        return cachedTextEncoder.encodeInto(arg, view);
      }
    : function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
          read: arg.length,
          written: buf.length,
        };
      };

function passStringToWasm0(arg, malloc, realloc) {
  if (realloc === undefined) {
    const buf = cachedTextEncoder.encode(arg);
    const ptr = malloc(buf.length);
    getUint8Memory0()
      .subarray(ptr, ptr + buf.length)
      .set(buf);
    WASM_VECTOR_LEN = buf.length;
    return ptr;
  }

  let len = arg.length;
  let ptr = malloc(len);

  const mem = getUint8Memory0();

  let offset = 0;

  for (; offset < len; offset++) {
    const code = arg.charCodeAt(offset);
    if (code > 0x7f) break;
    mem[ptr + offset] = code;
  }

  if (offset !== len) {
    if (offset !== 0) {
      arg = arg.slice(offset);
    }
    ptr = realloc(ptr, len, (len = offset + arg.length * 3));
    const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
    const ret = encodeString(arg, view);

    offset += ret.written;
  }

  WASM_VECTOR_LEN = offset;
  return ptr;
}

function isLikeNone(x) {
  return x === undefined || x === null;
}

let cachedInt32Memory0 = new Int32Array();

function getInt32Memory0() {
  if (cachedInt32Memory0.byteLength === 0) {
    cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);
  }
  return cachedInt32Memory0;
}

function makeMutClosure(arg0, arg1, dtor, f) {
  const state = { a: arg0, b: arg1, cnt: 1, dtor };
  const real = (...args) => {
    // First up with a closure we increment the internal reference
    // count. This ensures that the Rust closure environment won't
    // be deallocated while we're invoking it.
    state.cnt++;
    const { a } = state;
    state.a = 0;
    try {
      return f(a, state.b, ...args);
    } finally {
      if (--state.cnt === 0) {
        wasm.__wbindgen_export_2.get(state.dtor)(a, state.b);
      } else {
        state.a = a;
      }
    }
  };
  real.original = state;

  return real;
}
function __wbg_adapter_24(arg0, arg1, arg2) {
  wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h393860affdd597ff(
    arg0,
    arg1,
    addHeapObject(arg2)
  );
}

function handleError(f, args) {
  try {
    return f.apply(this, args);
  } catch (e) {
    wasm.__wbindgen_exn_store(addHeapObject(e));
  }
}
/**
 * @returns {number}
 */
export function batch_size() {
  const ret = wasm.batch_size();
  return ret >>> 0;
}

/**
 * @param {string} state
 * @returns {number}
 */
export function random_generator(state) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passStringToWasm0(state, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.random_generator(retptr, ptr0, len0);
    const r0 = getInt32Memory0()[retptr / 4 + 0];
    const r1 = getInt32Memory0()[retptr / 4 + 1];
    const r2 = getInt32Memory0()[retptr / 4 + 2];
    if (r2) {
      throw takeObject(r1);
    }
    return r0;
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}

/**
 * @param {number} rng
 */
export function random_generator_free(rng) {
  wasm.random_generator_free(rng);
}

/**
 * @param {string} session
 * @param {number} player_index
 * @param {number} player_count
 * @param {number} threshold
 * @param {string} share
 * @param {string} pubkey
 * @returns {number}
 */
export function threshold_signer(session, player_index, player_count, threshold, share, pubkey) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passStringToWasm0(session, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(share, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passStringToWasm0(pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len2 = WASM_VECTOR_LEN;
    wasm.threshold_signer(retptr, ptr0, len0, player_index, player_count, threshold, ptr1, len1, ptr2, len2);
    const r0 = getInt32Memory0()[retptr / 4 + 0];
    const r1 = getInt32Memory0()[retptr / 4 + 1];
    const r2 = getInt32Memory0()[retptr / 4 + 2];
    if (r2) {
      throw takeObject(r1);
    }
    return r0;
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}

/**
 * @param {number} signer
 */
export function threshold_signer_free(signer) {
  wasm.threshold_signer_free(signer);
}

/**
 * @param {number} signer
 * @param {number} rng
 * @returns {Promise<any>}
 */
export function setup(signer, rng) {
  const ret = wasm.setup(signer, rng);
  return takeObject(ret);
}

/**
 * @param {Uint8Array} parties
 * @param {number} signer
 * @param {number} rng
 * @returns {Promise<any>}
 */
export function precompute(parties, signer, rng) {
  const ret = wasm.precompute(addHeapObject(parties), signer, rng);
  return takeObject(ret);
}

/**
 * @param {string} msg
 * @param {boolean} hash_only
 * @param {any} precompute
 * @returns {any}
 */
export function local_sign(msg, hash_only, precompute) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passStringToWasm0(msg, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.local_sign(retptr, ptr0, len0, hash_only, addHeapObject(precompute));
    const r0 = getInt32Memory0()[retptr / 4 + 0];
    const r1 = getInt32Memory0()[retptr / 4 + 1];
    const r2 = getInt32Memory0()[retptr / 4 + 2];
    if (r2) {
      throw takeObject(r1);
    }
    return takeObject(r0);
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}

/**
 * @param {any} precompute
 * @returns {any}
 */
export function get_r_from_precompute(precompute) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    wasm.get_r_from_precompute(retptr, addHeapObject(precompute));
    const r0 = getInt32Memory0()[retptr / 4 + 0];
    const r1 = getInt32Memory0()[retptr / 4 + 1];
    const r2 = getInt32Memory0()[retptr / 4 + 2];
    if (r2) {
      throw takeObject(r1);
    }
    return takeObject(r0);
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}

let cachedUint32Memory0 = new Uint32Array();

function getUint32Memory0() {
  if (cachedUint32Memory0.byteLength === 0) {
    cachedUint32Memory0 = new Uint32Array(wasm.memory.buffer);
  }
  return cachedUint32Memory0;
}

function passArrayJsValueToWasm0(array, malloc) {
  const ptr = malloc(array.length * 4);
  const mem = getUint32Memory0();
  for (let i = 0; i < array.length; i++) {
    mem[ptr / 4 + i] = addHeapObject(array[i]);
  }
  WASM_VECTOR_LEN = array.length;
  return ptr;
}
/**
 * @param {string} msg
 * @param {boolean} hash_only
 * @param {any} r
 * @param {any[]} sig_frags
 * @param {string} pubkey
 * @returns {any}
 */
export function local_verify(msg, hash_only, r, sig_frags, pubkey) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passStringToWasm0(msg, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayJsValueToWasm0(sig_frags, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passStringToWasm0(pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len2 = WASM_VECTOR_LEN;
    wasm.local_verify(retptr, ptr0, len0, hash_only, addHeapObject(r), ptr1, len1, ptr2, len2);
    const r0 = getInt32Memory0()[retptr / 4 + 0];
    const r1 = getInt32Memory0()[retptr / 4 + 1];
    const r2 = getInt32Memory0()[retptr / 4 + 2];
    if (r2) {
      throw takeObject(r1);
    }
    return takeObject(r0);
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}

/**
 * @param {Uint8Array} counterparties
 * @param {string} msg
 * @param {boolean} hash_only
 * @param {number} signer
 * @param {number} rng
 * @returns {Promise<any>}
 */
export function sign(counterparties, msg, hash_only, signer, rng) {
  const ptr0 = passStringToWasm0(msg, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.sign(addHeapObject(counterparties), ptr0, len0, hash_only, signer, rng);
  return takeObject(ret);
}

function __wbg_adapter_40(arg0, arg1, arg2, arg3, arg4) {
  wasm.wasm_bindgen__convert__closures__invoke3_mut__h1fa7dc56d2cd12f8(arg0, arg1, addHeapObject(arg2), arg3, addHeapObject(arg4));
}

function __wbg_adapter_53(arg0, arg1, arg2, arg3) {
  wasm.wasm_bindgen__convert__closures__invoke2_mut__h09aaa711cefcd1d9(arg0, arg1, addHeapObject(arg2), addHeapObject(arg3));
}

let stack_pointer = 32;

function addBorrowedObject(obj) {
  if (stack_pointer == 1) throw new Error("out of js stack");
  heap[--stack_pointer] = obj;
  return stack_pointer;
}
/**
 * Handler for `console.log` invocations.
 *
 * If a test is currently running it takes the `args` array and stringifies
 * it and appends it to the current output of the test. Otherwise it passes
 * the arguments to the original `console.log` function, psased as
 * `original`.
 * @param {Array<any>} args
 */
export function __wbgtest_console_log(args) {
  try {
    wasm.__wbgtest_console_log(addBorrowedObject(args));
  } finally {
    heap[stack_pointer++] = undefined;
  }
}

/**
 * Handler for `console.debug` invocations. See above.
 * @param {Array<any>} args
 */
export function __wbgtest_console_debug(args) {
  try {
    wasm.__wbgtest_console_debug(addBorrowedObject(args));
  } finally {
    heap[stack_pointer++] = undefined;
  }
}

/**
 * Handler for `console.info` invocations. See above.
 * @param {Array<any>} args
 */
export function __wbgtest_console_info(args) {
  try {
    wasm.__wbgtest_console_info(addBorrowedObject(args));
  } finally {
    heap[stack_pointer++] = undefined;
  }
}

/**
 * Handler for `console.warn` invocations. See above.
 * @param {Array<any>} args
 */
export function __wbgtest_console_warn(args) {
  try {
    wasm.__wbgtest_console_warn(addBorrowedObject(args));
  } finally {
    heap[stack_pointer++] = undefined;
  }
}

/**
 * Handler for `console.error` invocations. See above.
 * @param {Array<any>} args
 */
export function __wbgtest_console_error(args) {
  try {
    wasm.__wbgtest_console_error(addBorrowedObject(args));
  } finally {
    heap[stack_pointer++] = undefined;
  }
}

/**
 * Runtime test harness support instantiated in JS.
 *
 * The node.js entry script instantiates a `Context` here which is used to
 * drive test execution.
 */
export class WasmBindgenTestContext {
  static __wrap(ptr) {
    const obj = Object.create(WasmBindgenTestContext.prototype);
    obj.ptr = ptr;

    return obj;
  }

  __destroy_into_raw() {
    const { ptr } = this;
    this.ptr = 0;

    return ptr;
  }

  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_wasmbindgentestcontext_free(ptr);
  }

  /**
   * Creates a new context ready to run tests.
   *
   * A `Context` is the main structure through which test execution is
   * coordinated, and this will collect output and results for all executed
   * tests.
   */
  constructor() {
    const ret = wasm.wasmbindgentestcontext_new();
    return WasmBindgenTestContext.__wrap(ret);
  }

  /**
   * Inform this context about runtime arguments passed to the test
   * harness.
   *
   * Eventually this will be used to support flags, but for now it's just
   * used to support test filters.
   * @param {any[]} args
   */
  args(args) {
    const ptr0 = passArrayJsValueToWasm0(args, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.wasmbindgentestcontext_args(this.ptr, ptr0, len0);
  }

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
  run(tests) {
    const ptr0 = passArrayJsValueToWasm0(tests, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.wasmbindgentestcontext_run(this.ptr, ptr0, len0);
    return takeObject(ret);
  }
}

async function load(module, imports) {
  if (typeof Response === "function" && module instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming === "function") {
      try {
        return await WebAssembly.instantiateStreaming(module, imports);
      } catch (e) {
        if (module.headers.get("Content-Type") != "application/wasm") {
          console.warn(
            "`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n",
            e
          );
        } else {
          throw e;
        }
      }
    }

    const bytes = await module.arrayBuffer();
    return WebAssembly.instantiate(bytes, imports);
  }
  const instance = await WebAssembly.instantiate(module, imports);

  if (instance instanceof WebAssembly.Instance) {
    return { instance, module };
  }
  return instance;
}

function getImports() {
  const imports = {};
  imports.wbg = {};
  imports.wbg.__wbindgen_object_drop_ref = function (arg0) {
    takeObject(arg0);
  };
  imports.wbg.__wbindgen_cb_drop = function (arg0) {
    const obj = takeObject(arg0).original;
    if (obj.cnt-- == 1) {
      obj.a = 0;
      return true;
    }
    const ret = false;
    return ret;
  };
  imports.wbg.__wbindgen_string_new = function (arg0, arg1) {
    const ret = getStringFromWasm0(arg0, arg1);
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_jssendmsg_9558e1e6ccbf0bf6 = function () {
    return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
      try {
        const ret = js_send_msg(
          getStringFromWasm0(arg0, arg1),
          arg2 >>> 0,
          arg3 >>> 0,
          getStringFromWasm0(arg4, arg5),
          getStringFromWasm0(arg6, arg7)
        );
        return addHeapObject(ret);
      } finally {
        wasm.__wbindgen_free(arg0, arg1);
        wasm.__wbindgen_free(arg4, arg5);
        wasm.__wbindgen_free(arg6, arg7);
      }
    }, arguments);
  };
  imports.wbg.__wbindgen_string_get = function (arg0, arg1) {
    const obj = getObject(arg1);
    const ret = typeof obj === "string" ? obj : undefined;
    const ptr0 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
  };
  imports.wbg.__wbg_jsreadmsg_3e2fec56a08697d4 = function () {
    return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
      try {
        const ret = js_read_msg(getStringFromWasm0(arg0, arg1), arg2 >>> 0, arg3 >>> 0, getStringFromWasm0(arg4, arg5));
        return addHeapObject(ret);
      } finally {
        wasm.__wbindgen_free(arg0, arg1);
        wasm.__wbindgen_free(arg4, arg5);
      }
    }, arguments);
  };
  imports.wbg.__wbindgen_bigint_from_u64 = function (arg0) {
    const ret = BigInt.asUintN(64, arg0);
    return addHeapObject(ret);
  };
  imports.wbg.__wbindgen_number_new = function (arg0) {
    const ret = arg0;
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_newnoargs_b5b063fc6c2f0376 = function (arg0, arg1) {
    const ret = new Function(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_call_97ae9d8645dc388b = function () {
    return handleError(function (arg0, arg1) {
      const ret = getObject(arg0).call(getObject(arg1));
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbindgen_object_clone_ref = function (arg0) {
    const ret = getObject(arg0);
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_self_6d479506f72c6a71 = function () {
    return handleError(function () {
      const ret = self.self;
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_window_f2557cc78490aceb = function () {
    return handleError(function () {
      const ret = window.window;
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_globalThis_7f206bda628d5286 = function () {
    return handleError(function () {
      const ret = globalThis.globalThis;
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_global_ba75c50d1cf384f4 = function () {
    return handleError(function () {
      const ret = global.global;
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbindgen_is_undefined = function (arg0) {
    const ret = getObject(arg0) === undefined;
    return ret;
  };
  imports.wbg.__wbg_forEach_ce1177df15902e0c = function (arg0, arg1, arg2) {
    try {
      var state0 = { a: arg1, b: arg2 };
      const cb0 = (arg0, arg1, arg2) => {
        const { a } = state0;
        state0.a = 0;
        try {
          return __wbg_adapter_40(a, state0.b, arg0, arg1, arg2);
        } finally {
          state0.a = a;
        }
      };
      getObject(arg0).forEach(cb0);
    } finally {
      state0.a = state0.b = 0;
    }
  };
  imports.wbg.__wbg_message_fe2af63ccc8985bc = function (arg0) {
    const ret = getObject(arg0).message;
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_name_48eda3ae6aa697ca = function (arg0) {
    const ret = getObject(arg0).name;
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_call_168da88779e35f61 = function () {
    return handleError(function (arg0, arg1, arg2) {
      const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_new_9962f939219f1820 = function (arg0, arg1) {
    try {
      var state0 = { a: arg0, b: arg1 };
      const cb0 = (arg0, arg1) => {
        const { a } = state0;
        state0.a = 0;
        try {
          return __wbg_adapter_53(a, state0.b, arg0, arg1);
        } finally {
          state0.a = a;
        }
      };
      const ret = new Promise(cb0);
      return addHeapObject(ret);
    } finally {
      state0.a = state0.b = 0;
    }
  };
  imports.wbg.__wbg_resolve_99fe17964f31ffc0 = function (arg0) {
    const ret = Promise.resolve(getObject(arg0));
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_then_11f7a54d67b4bfad = function (arg0, arg1) {
    const ret = getObject(arg0).then(getObject(arg1));
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_then_cedad20fbbd9418a = function (arg0, arg1, arg2) {
    const ret = getObject(arg0).then(getObject(arg1), getObject(arg2));
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_buffer_3f3d764d4747d564 = function (arg0) {
    const ret = getObject(arg0).buffer;
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_new_8c3f0052272a457a = function (arg0) {
    const ret = new Uint8Array(getObject(arg0));
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_set_83db9690f9353e79 = function (arg0, arg1, arg2) {
    getObject(arg0).set(getObject(arg1), arg2 >>> 0);
  };
  imports.wbg.__wbg_length_9e1ae1900cb0fbd5 = function (arg0) {
    const ret = getObject(arg0).length;
    return ret;
  };
  imports.wbg.__wbindgen_throw = function (arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
  };
  imports.wbg.__wbindgen_memory = function () {
    const ret = wasm.memory;
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_new_abda76e883ba8a5f = function () {
    const ret = new Error();
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_stack_658279fe44541cf6 = function (arg0, arg1) {
    const ret = getObject(arg1).stack;
    const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
  };
  imports.wbg.__wbg_error_f851667af71bcfc6 = function (arg0, arg1) {
    try {
      console.error(getStringFromWasm0(arg0, arg1));
    } finally {
      wasm.__wbindgen_free(arg0, arg1);
    }
  };
  imports.wbg.__wbg_log_d59c74802fa44fe2 = function (arg0, arg1) {
    console.log(getStringFromWasm0(arg0, arg1));
  };
  imports.wbg.__wbg_static_accessor_document_0187e21f53c04a48 = function () {
    const ret = document;
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_String_0713d2a3d2b5f6b1 = function (arg0, arg1) {
    const ret = String(getObject(arg1));
    const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
  };
  imports.wbg.__wbg_self_74338d9cb12c5d75 = function (arg0) {
    const ret = getObject(arg0).self;
    return addHeapObject(ret);
  };
  imports.wbg.__wbindgen_jsval_eq = function (arg0, arg1) {
    const ret = getObject(arg0) === getObject(arg1);
    return ret;
  };
  imports.wbg.__wbg_getElementById_4c39186cc7ced742 = function (arg0, arg1, arg2) {
    const ret = getObject(arg0).getElementById(getStringFromWasm0(arg1, arg2));
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_settextcontent_344de5dc2a8e15ca = function (arg0, arg1, arg2) {
    getObject(arg0).textContent = getStringFromWasm0(arg1, arg2);
  };
  imports.wbg.__wbg_textcontent_46a9e23ba5cbd900 = function (arg0, arg1) {
    const ret = getObject(arg1).textContent;
    const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
  };
  imports.wbg.__wbg_stack_2ac21c4ea9c454f4 = function (arg0) {
    const ret = getObject(arg0).stack;
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_stack_475ccfd121fab8c9 = function (arg0, arg1) {
    const ret = getObject(arg1).stack;
    const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
  };
  imports.wbg.__wbindgen_closure_wrapper551 = function (arg0, arg1, arg2) {
    const ret = makeMutClosure(arg0, arg1, 117, __wbg_adapter_24);
    return addHeapObject(ret);
  };

  return imports;
}

function initMemory(imports, maybe_memory) {}

function finalizeInit(instance, module) {
  wasm = instance.exports;
  init.__wbindgen_wasm_module = module;
  cachedInt32Memory0 = new Int32Array();
  cachedUint32Memory0 = new Uint32Array();
  cachedUint8Memory0 = new Uint8Array();

  return wasm;
}

function initSync(module) {
  const imports = getImports();

  initMemory(imports);

  if (!(module instanceof WebAssembly.Module)) {
    module = new WebAssembly.Module(module);
  }

  const instance = new WebAssembly.Instance(module, imports);

  return finalizeInit(instance, module);
}

async function init(input) {
  if (typeof input === "undefined") {
    // input = new URL('dkls_bg.wasm', import.meta.url);
    throw new Error("no");
  }
  const imports = getImports();

  if (
    typeof input === "string" ||
    (typeof Request === "function" && input instanceof Request) ||
    (typeof URL === "function" && input instanceof URL)
  ) {
    input = fetch(input);
  }

  initMemory(imports);

  const { instance, module } = await load(await input, imports);

  return finalizeInit(instance, module);
}

export { finalizeInit, getImports, initSync };
export default init;
