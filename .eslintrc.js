require("@rushstack/eslint-patch/modern-module-resolution");

module.exports = {
  root: true,
  extends: ["@toruslabs/eslint-config-typescript"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module",
    ecmaVersion: 2022,
    project: "./tsconfig.json",
  },
  ignorePatterns: ["*.config.js", "*.d.ts", ".eslintrc.js"],
  rules: {
    camelcase: "off",
  },
  env: {
    browser: true,
    node: true,
    mocha: true,
  },
  globals: {
    chrome: true,
  },
};
