const webpack = require("webpack");
const path = require("path");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
const CopyPlugin = require("copy-webpack-plugin");

const devMode = process.env.NODE_ENV !== "production";

module.exports = {
  mode: process.env.NODE_ENV || "production",
  devtool: devMode ? "source-map" : false,
  target: 'web',
  entry: './main.ts',
  output: {
    filename: "test.min.js"
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
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
  plugins: [
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
          from: "node_modules/tss-lib/wasm/client.wasm",
          to: path.resolve(__dirname, "./dist/mpecdsa_bg.wasm")
        }
      ],
    }),
  ],
  module: {
    rules: [
      {
        test: /\.(ts|js)x?$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: "babel-loader",
          options: {
            cacheDirectory: true,
            cacheCompression: false,
          },
        },
      },
    ],
  },
  devServer: {
    port: 4000,
    open: true,
    allowedHosts: "all",
    static: [
      {
        directory: path.join(__dirname, './public'),
        watch: false
      },
      {
        directory: path.join(__dirname, './dist'),
        watch: false
      },
    ],
    watchFiles: ['main.ts', 'public/**/*'],
    onListening: function (devServer) {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }

      const port = devServer.server.address().port;
      console.log('Listening on port:', port);
    },
  }
};