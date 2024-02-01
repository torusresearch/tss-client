const path = require("path");
const webpack = require("webpack");

const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");
/** @type {import("webpack").Configuration} */
module.exports = {
  entry: "./src/local.ts",
  output: {
    path: path.resolve(__dirname, "./dist"),
    filename: "test.bundle.js",
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.([cm]?ts|tsx)$/,
        loader: 'ts-loader',
      },
      {
        test: /\.(js|mjs|jsx)$/,
        enforce: "pre",
        loader: require.resolve("source-map-loader"),
        resolve: {
          fullySpecified: false,
        },
      }
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
