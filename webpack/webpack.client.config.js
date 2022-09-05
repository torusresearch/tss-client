const webpack = require("webpack");
const path = require("path");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
const CopyPlugin = require("copy-webpack-plugin");

const config = require('./webpack.base.config');
const devMode = process.env.NODE_ENV !== "production";

/** @type {import("webpack").Configuration} */
module.exports = {
  ...config,
  target: 'web',
  devtool: devMode ? "source-map" : false,
  entry: './src/client/index.ts',
  output: {
    ...config.output,
    filename: "test.min.js"
  },
  module: {
    ...config.module,
    rules: config.module.rules.concat([])
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
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
    }),
    new webpack.ProvidePlugin({
      process: "process/browser.js",
    }),
    new BundleAnalyzerPlugin({
      analyzerMode: "disabled",
      openAnalyzer: false,
    }),
    new CopyPlugin({
      patterns: [
        {
          from: "node_modules/tss-lib/dist/mpecdsa.min.js",
          to: path.resolve(__dirname, "../dist/")
        },
        {
          from: "node_modules/tss-lib/wasm/client.wasm",
          to: path.resolve(__dirname, "../dist/mpecdsa_bg.wasm")
        }
      ],
    }),
  ]),
  devServer: {
    port: 3000,
    open: true,
    static: [
      {
        directory: path.join(__dirname, '../public'),
        watch: false
      },
      {
        directory: path.join(__dirname, '../dist'),
        watch: false
      },
    ],
    watchFiles: ['src/client/**/*.js', 'src/client/**/*.ts', 'public/**/*'],
    onListening: function (devServer) {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }

      const port = devServer.server.address().port;
      console.log('Listening on port:', port);
    },
  }
}