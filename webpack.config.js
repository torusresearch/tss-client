/* eslint-disable @typescript-eslint/no-var-requires */
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");

function generateWebpackConfig({ alias }) {
  const baseConfig = {
    resolve: {
      plugins: [new TsconfigPathsPlugin()],
      alias: {
        ...alias,
      },
    },
  };
  return { baseConfig };
}

module.exports = generateWebpackConfig;
