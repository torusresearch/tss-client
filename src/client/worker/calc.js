// document = {}
// let resolve;
// const p = new Promise(r => resolve = r);
// import tss from "tss-lib";
// tss.default().then(resolve);
// onmessage = async ({ data }) => {
//     await p;
//     const {method, args} = data.data;
//     const result = tss[method](...args)
//     postMessage({ data: result })
// }
// document = {};
// importScripts("tss_lib.min.js");
import * as tss from "tss-lib";

onmessage = async ({ data }) => {
  const { method, args, wasmFileUrl } = data.data;
  await tss.default(wasmFileUrl);
  const result = tss[method](...args);
  postMessage({ data: result });
};
