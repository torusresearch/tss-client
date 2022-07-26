module.exports = {
  presets: ["@babel/env", "@babel/preset-typescript"],
  plugins: ["@babel/plugin-proposal-object-rest-spread", "@babel/plugin-proposal-class-properties", "@babel/transform-runtime"],
  sourceType: "unambiguous",
};