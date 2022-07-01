const path = require("path");

async function work( method, args) {
  const worker = new Worker("calc-browser.js");
  const data = { method, args };
  const prom = new Promise((resolve) => {
    worker.onmessage = function({ data }) {
      resolve(data.data)
    }
  });
  worker.postMessage({ data });
  return prom
}

module.exports = {
  work
}

