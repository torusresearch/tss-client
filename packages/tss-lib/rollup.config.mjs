import { wasm } from '@rollup/plugin-wasm';

export default {
  input: "./browser.js",
  plugins: [wasm()],
};
