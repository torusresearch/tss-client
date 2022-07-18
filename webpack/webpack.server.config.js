const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

const config = require("./webpack.base.config");

module.exports = {
  ...config,
  target: "node",
  entry: "./src/server/index.ts",
  devtool: "source-map",
  externals: {
    "tss-lib": "commonjs2 tss-lib",
  },
  output: {
    path: path.resolve(__dirname, "../dist"),
    filename: "server.js",
  },
  resolve: {
    ...config.resolve,
    alias: {
      "bn.js": path.resolve("./node_modules", "bn.js"),
    },
    fallback: {
      http: require.resolve("stream-http"),
      https: require.resolve("https-browserify"),
      os: require.resolve("os-browserify/browser"),
      crypto: require.resolve("crypto-browserify"),
      assert: require.resolve("assert/"),
      stream: require.resolve("stream-browserify"),
      url: require.resolve("url/"),
      buffer: require.resolve("buffer/"),
      fs: false,
      path: false,
    },
  },
  plugins: config.plugins.concat([
    new CopyPlugin({
      patterns: [
        {
          from: "node_modules/tss-lib/wasm/server.wasm",
          to: path.resolve(__dirname, "../dist/wasm/"),
        },
      ],
    }),
  ]),
  // watch: true,
  // watchOptions: {
  //   ignored: ["node_modules"],
  // },
};
