const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

const dist = path.resolve(__dirname, "dist");

exports.baseConfig = {
  entry: "./dkls.js",
  output: {
    path: dist,
    filename: "[name].js"
  },
  devServer: {
    contentBase: dist,
  },
  plugins: [
    new CopyPlugin({
      patterns: [
      { from: path.resolve(__dirname), to: './assets' },
      ]
    }),
  ]
};
  
  