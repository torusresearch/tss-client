const { parentPort } = require("worker_threads");
const tss = require('tss-lib')
parentPort.on("message", ({ data, ports }) => {
    const {method, args} = data;
    const result = tss[method](...args)
    ports[0].postMessage({ data: result, ports: [] })
})