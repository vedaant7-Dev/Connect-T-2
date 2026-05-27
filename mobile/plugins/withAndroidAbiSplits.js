const { withAppBuildGradle } = require("@expo/config-plugins");

const ABI_SPLITS_BLOCK = `
    splits {
        abi {
            enable true
            reset()
            include "arm64-v8a", "armeabi-v7a"
            universalApk false
        }
    }
`;

module.exports = function withAndroidAbiSplits(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (contents.includes("universalApk false")) {
      return config;
    }

    const androidBlock = "android {";
    const index = contents.indexOf(androidBlock);

    if (index === -1) {
      throw new Error("Could not find android block in android/app/build.gradle");
    }

    const insertAt = index + androidBlock.length;
    contents =
      contents.slice(0, insertAt) +
      ABI_SPLITS_BLOCK +
      contents.slice(insertAt);

    config.modResults.contents = contents;
    return config;
  });
};
