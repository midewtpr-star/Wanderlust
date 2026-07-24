// AppName — Metro config.
// Wraps Expo's default Metro config with NativeWind so Tailwind classes are
// processed from ./global.css for native and web bundles.
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
