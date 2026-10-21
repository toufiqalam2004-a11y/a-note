const { withProjectBuildGradle, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin to:
 * 1. Inject the custom maven repository for sherpa-onnx AARs (https://xdcobra.github.io/maven)
 *    into root build.gradle.
 * 2. Ensure Android react-native-sherpa-onnx Kotlin files safely handle 'file://' URI prefixes
 *    without throwing "File path does not exist: file:///data/...".
 */
function withSherpaOnnxMaven(config) {
  // 1. Inject maven repo into build.gradle
  config = withProjectBuildGradle(config, (modConfig) => {
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

  // 2. Prebuild hook to patch react-native-sherpa-onnx Kotlin files for file:// URI resilience
  config = withDangerousMod(config, [
    'android',
    async (modConfig) => {
      try {
        const projectRoot = modConfig.modRequest.projectRoot;
        const sherpaDir = path.join(
          projectRoot,
          'node_modules',
          'react-native-sherpa-onnx',
          'android',
          'src',
          'main',
          'java',
          'com',
          'sherpaonnx'
        );

        // Patch SherpaOnnxAssetHelper.kt
        const assetHelperPath = path.join(sherpaDir, 'SherpaOnnxAssetHelper.kt');
        if (fs.existsSync(assetHelperPath)) {
          let content = fs.readFileSync(assetHelperPath, 'utf8');
          if (content.includes('val file = File(filePath)') && !content.includes('cleanFilePath')) {
            content = content.replace(
              'val file = File(filePath)',
              'val cleanFilePath = if (filePath.startsWith("file://")) filePath.substring(7) else filePath\n    Log.i(logTag, "resolveFilePath: filePath=$filePath (clean=$cleanFilePath)")\n    val file = File(cleanFilePath)'
            );
            content = content.replace(
              'throw IllegalArgumentException("File path does not exist: $filePath")',
              'throw IllegalArgumentException("File path does not exist: $cleanFilePath")'
            );
            content = content.replace(
              'throw IllegalArgumentException("Path is not a directory: $filePath")',
              'throw IllegalArgumentException("Path is not a directory: $cleanFilePath")'
            );
            fs.writeFileSync(assetHelperPath, content, 'utf8');
          }
        }

        // Patch SherpaOnnxOnlineSttHelper.kt
        const onlineSttHelperPath = path.join(sherpaDir, 'SherpaOnnxOnlineSttHelper.kt');
        if (fs.existsSync(onlineSttHelperPath)) {
          let content = fs.readFileSync(onlineSttHelperPath, 'utf8');
          if (content.includes('val dir = File(modelDir)') && !content.includes('cleanDir')) {
            content = content.replace(
              'val dir = File(modelDir)',
              'val cleanDir = if (modelDir.startsWith("file://")) modelDir.substring(7) else modelDir\n    val dir = File(cleanDir)'
            );
            content = content.replace(
              'throw IllegalArgumentException("Model directory does not exist or is not a directory: $modelDir")',
              'throw IllegalArgumentException("Model directory does not exist or is not a directory: $cleanDir")'
            );
            fs.writeFileSync(onlineSttHelperPath, content, 'utf8');
          }
        }
      } catch (err) {
        console.warn('[withSherpaOnnxMaven] Note: Kotlin patch hook skipped:', err);
      }
      return modConfig;
    },
  ]);

  return config;
}

module.exports = withSherpaOnnxMaven;
