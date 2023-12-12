exports.baseConfig = {
  entry: "./index.js",
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
