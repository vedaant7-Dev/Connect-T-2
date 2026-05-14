const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;

config.transformer = {
  ...config.transformer,
  minifierConfig: {
    compress: {
      drop_console: true,
      reduce_funcs: false,
    },
    mangle: true,
  },
};

module.exports = config;
