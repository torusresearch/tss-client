exports.baseConfig = {
  entry: "./browser.js",
  module: {
    rules: [
      {
        // Pack Wasm inline.
        test: /\.wasm$/,
        type: "asset/inline",
      },
    ],
  },
};
