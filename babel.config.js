// AppName — Babel config.
// NativeWind requires the `jsxImportSource` option + the nativewind/babel preset.
// The react-native-worklets (Reanimated 4) Babel plugin is added automatically by
// babel-preset-expo when the package is installed, so it is NOT listed here.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
