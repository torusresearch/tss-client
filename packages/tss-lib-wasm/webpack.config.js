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



/*
const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'dkls.js',
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "pkg/dkls.d.ts", to: "dkls.d.ts" }
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
  },
  devtool: 'source-map',
  // plugins: [
  //   // new HtmlWebpackPlugin(),
  //   new WasmPackPlugin({
  //     crateDirectory: "/Users/matthias/source/crypto/tsig/dkls/dkls",
  //     outDir: path.join(__dirname, "pkg"),
  //     outName: "dkls",
  //     forceMode: "production",
  //   }),
  //   // Have this example work in Edge which doesn't ship `TextEncoder` or
  //   // `TextDecoder` at this time.
  //   new webpack.ProvidePlugin({
  //     TextDecoder: ['text-encoding', 'TextDecoder'],
  //     TextEncoder: ['text-encoding', 'TextEncoder']
  //   })
  // ],
  mode: 'development',
  // experiments: {
  //   asyncWebAssembly: true
  // }
};
*/