const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to ensure the custom maven repository for sherpa-onnx AARs
 * (https://xdcobra.github.io/maven) is included in the Android project root build.gradle.
 */
function withSherpaOnnxMaven(config) {
  return withProjectBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language === 'groovy') {
      const mavenRepo = `
        maven {
            url "https://xdcobra.github.io/maven"
            content {
                includeGroup "com.xdcobra.sherpa"
            }
        }
`;
      if (!modConfig.modResults.contents.includes('https://xdcobra.github.io/maven')) {
        modConfig.modResults.contents = modConfig.modResults.contents.replace(
          /allprojects\s*\{\s*repositories\s*\{/,
          `allprojects {\n    repositories {\n${mavenRepo}`
        );
      }
    }
    return modConfig;
  });
}

module.exports = withSherpaOnnxMaven;
