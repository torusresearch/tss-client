import { wasm } from "@rollup/plugin-wasm";

export default {
  input: "./index.js",
  plugins: [wasm()],
};
