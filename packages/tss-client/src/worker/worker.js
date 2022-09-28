import * as tss from "tss-lib";

export const instantiate = async (wasmFileUrl) => {
  await tss.default(wasmFileUrl);
};

export const takeAction = async (method, args) => {
  return tss[method](...args);
};
