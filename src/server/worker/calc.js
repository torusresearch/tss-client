/* eslint-disable @typescript-eslint/no-var-requires */
const tssLib = require("tss-lib");
const { parentPort } = require("worker_threads");

const tss = new Proxy(tssLib, {
  get: (target, prop) => {
    if (typeof target[prop] === "function") {
      return function () {
        console.log("tss method", prop, "is being called with args", JSON.stringify(arguments));
        return target[prop](...arguments);
      };
    }
    return target[prop];
  },
});
parentPort.on("message", ({ data, ports }) => {
  const { method, args } = data;
  const result = tss[method](...args);
  ports[0].postMessage({ data: result, ports: [] });
});
