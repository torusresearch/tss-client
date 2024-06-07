const cfg = {
  module: {
    rules: [
      {
        // Pack Wasm inline.
        test: /\.wasm$/,
        type: "asset/inline",
      },
    ],
  }
};

module.exports = {
  umdConfig: cfg,
  cjsConfig: cfg,
};
