// ==============================================================================
// Ardab Market - Android Build Optimization Config Plugin
// ==============================================================================
// Enables:
// 1. Android R8 release code minification (android.enableMinifyInReleaseBuilds=true)
// 2. Android release resource shrinking (android.enableShrinkResourcesInReleaseBuilds=true)
// 3. ProGuard keep rules for Hermes, JNI, and Expo modules in proguard-rules.pro
// 4. ABI filtering for real mobile devices (reactNativeArchitectures=armeabi-v7a,arm64-v8a)
// 5. R8 fullMode in gradle.properties for maximum DEX compression
// ==============================================================================

const fs = require('fs');
const path = require('path');
const {
  withGradleProperties,
  withDangerousMod,
  createRunOncePlugin,
} = require('@expo/config-plugins');

function withAndroidOptimizations(config) {
  // 1. Configure gradle.properties for R8, shrinking, architecture filtering, and memory
  config = withGradleProperties(config, (gradlePropsConfig) => {
    const props = gradlePropsConfig.modResults;

    const propertyMap = {
      'android.enableMinifyInReleaseBuilds': 'true',
      'android.enableShrinkResourcesInReleaseBuilds': 'true',
      'android.enableR8.fullMode': 'true',
      'reactNativeArchitectures': 'armeabi-v7a,arm64-v8a',
      'org.gradle.jvmargs': '-Xmx3072m -XX:MaxMetaspaceSize=768m',
    };

    // Filter out existing properties that we are managing
    const filtered = props.filter((p) => !propertyMap.hasOwnProperty(p.key));

    // Append our optimized properties
    for (const [key, value] of Object.entries(propertyMap)) {
      filtered.push({
        type: 'property',
        key,
        value,
      });
    }

    gradlePropsConfig.modResults = filtered;
    return gradlePropsConfig;
  });

  // 2. Append ProGuard / R8 keep rules to proguard-rules.pro
  config = withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const proguardPath = path.join(
        modConfig.modRequest.platformProjectRoot,
        'app',
        'proguard-rules.pro'
      );

      const customProguardRules = `
# ==============================================================================
# Ardab Market - Production ProGuard & R8 Optimization Keep Rules
# ==============================================================================
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class expo.modules.** { *; }
-dontwarn com.facebook.hermes.**
-dontwarn expo.modules.**
`;

      if (fs.existsSync(proguardPath)) {
        let content = fs.readFileSync(proguardPath, 'utf8');
        if (!content.includes('Ardab Market - Production ProGuard')) {
          content += '\n' + customProguardRules;
          fs.writeFileSync(proguardPath, content, 'utf8');
        }
      }

      return modConfig;
    },
  ]);

  return config;
}

module.exports = createRunOncePlugin(
  withAndroidOptimizations,
  'with-android-optimizations',
  '1.0.0'
);
