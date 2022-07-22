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
import tss_lib from "tss-lib";

onmessage = async ({ data }) => {
  await p;
  const { method, args } = data.data;
  const result = tss[method](...args);
  postMessage({ data: result });
};
