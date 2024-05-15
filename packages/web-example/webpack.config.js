const path = require("path");
const webpack = require("webpack");

const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");
/** @type {import("webpack").Configuration} */
module.exports = (env) => {
  return {
    entry: env.prod ? "./src/prod.ts" : "./src/local.ts",
    output: {
      path: path.resolve(__dirname, "./dist"),
      filename: "test.bundle.js",
    },
    module: {
      rules: [
        {
          test: /\.([cm]?ts|tsx)$/,
          loader: 'ts-loader',
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js'],
      extensionAlias: {
        '.ts': ['.js', '.ts'],
        '.cts': ['.cjs', '.cts'],
        '.mts': ['.mjs', '.mts']
      },
      fallback: {
        crypto: require.resolve("crypto-browserify"),
        stream: require.resolve("stream-browserify"),
        assert: require.resolve("assert"),
        http: require.resolve("stream-http"),
        https: require.resolve("https-browserify"),
        os: require.resolve("os-browserify"),
        url: require.resolve("url"),
        zlib: require.resolve("browserify-zlib"),
        "vm": require.resolve("vm-browserify"),
      }
    },
    plugins: [
      new webpack.ProvidePlugin({
        process: "process/browser",
        Buffer: ["buffer", "Buffer"],
      }),
      new HtmlWebpackPlugin(),
    ],
    mode: "development",
  };
};
