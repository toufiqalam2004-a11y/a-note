/**
 * React Native CLI Configuration
 * 
 * Excludes react-native-sherpa-onnx from iOS autolinking to:
 * 1. Prevent CocoaPods from downloading sherpa_onnx.xcframework (~300MB) during iOS builds.
 * 2. Ensure iOS builds use Apple Speech Recognition (SFSpeechRecognizer) exclusively.
 * 3. Keep Android Sherpa offline voice recognition fully intact and linked.
 */
module.exports = {
  dependencies: {
    'react-native-sherpa-onnx': {
      platforms: {
        ios: null, // Disables iOS pod autolinking completely
      },
    },
  },
};
