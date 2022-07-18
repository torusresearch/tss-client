export async function work(method, args) {
  try {
    const worker = new Worker(new URL("./calc.js", import.meta.url));
    const msg = { method, args };
    const prom = new Promise((resolve) => {
      worker.onmessage = function ({ data }) {
        resolve(data.data);
      };
    });
    worker.postMessage({ data: msg });
    return await prom;
  } catch (e) {
    console.log("error", e);
  }
}
