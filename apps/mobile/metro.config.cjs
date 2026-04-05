const { withNxMetro } = require('@nx/expo');
const { getDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const customConfig = {
  projectRoot: __dirname,
  watchFolders: [path.resolve(__dirname, '../../')], // Workspace Root
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../../node_modules'),
    ],
    assetExts: config.resolver.assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...config.resolver.sourceExts, 'cjs', 'mjs', 'svg'],
  },
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
};

module.exports = withNxMetro(mergeConfig(config, customConfig), {
  debug: false,
  // This is the crucial part for Nx Monorepos:
  watchFolders: [path.resolve(__dirname, '../../')], 
});