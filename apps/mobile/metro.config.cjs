const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs', 'mjs', 'svg'];
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
config.resolver.blockList = [
  /.*\/@testing-library\/.*/,
  /.*\/jest-.*/,
  /.*\/ts-jest\/.*/,
];

module.exports = config;