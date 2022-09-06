import * as tss from "tss-lib";

onmessage = async ({ data }) => {
  const { method, args, wasmFileUrl } = data.data;
  await tss.default(wasmFileUrl);
  const result = tss[method](...args);
  postMessage({ data: result });
};
