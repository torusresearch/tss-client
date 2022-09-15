import * as tss from "tss-lib";

// export const onmessage = async ({ data }) => {
//   const { method, args, wasmFileUrl } = data.data;
//   await tss.default(wasmFileUrl);
//   const result = tss[method](...args);
//   postMessage({ data: result });
// };
export const instantiate = async (wasmFileUrl) => {
  await tss.default(wasmFileUrl);
};

export const takeAction = async (method, args) => {
  return tss[method](...args);
};
