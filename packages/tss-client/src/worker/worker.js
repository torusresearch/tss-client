import * as tss from "@toruslabs/tss-lib";

onmessage = (e) => {
  console.log('Message received from main script' + e);
  
  const wasmURL = e.data[0];
  const method = e.data[1];
  const args = e.data[2];

  run(wasmURL, method, args).then((result) => {
    postMessage([true, result]);
  }).catch(() => {
    postMessage([false]);
  });
}

async function run(wasmURL, method, args) {
  await tss.default(wasmURL);
  return tss[method](...args);
};
