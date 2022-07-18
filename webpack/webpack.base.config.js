module.exports = {
  mode: process.env.NODE_ENV || "production",
  output: {},
  plugins: [],
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
  module: {
    rules: [
      {
        test: /\.(ts)x?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
};