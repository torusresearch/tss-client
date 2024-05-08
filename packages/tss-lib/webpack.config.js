const CopyPlugin = require("copy-webpack-plugin");

const cfg = {
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "src/pkg/dkls.d.ts", to: "types/dkls.d.ts" }
      ]
    })
  ],
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
