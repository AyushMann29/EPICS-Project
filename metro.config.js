const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// TensorFlow.js models use .bin files, so we need to make sure Metro bundles them.
config.resolver.assetExts.push('bin');

module.exports = config;
