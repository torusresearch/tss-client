

module.exports = {
  umdConfig: {
    module: {
      rules: [
        {
          // Pack Wasm inline.
          test: /\.wasm$/,
          type: "asset/inline",
        },
      ],
    }
  },
  cjsConfig: {
    module: {
      rules: [
        {
          // Pack Wasm inline.
          test: /\.wasm$/,
          type: "asset/inline",
        },
      ],
    }
  }
};

