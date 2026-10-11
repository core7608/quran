// Learn more: https://docs.expo.dev/versions/latest/config/metro/
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// The Mushaf renderer loads per-page QCF Madani fonts from assets/mushaf/fonts.
// `woff2` is not a default Metro asset extension, so register it here.
config.resolver.assetExts.push('woff2');

module.exports = config;
