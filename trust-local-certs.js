// Source - https://stackoverflow.com/a/70775576
// Posted by silentsurfer
// Retrieved 2026-04-30, License - CC BY-SA 4.0
//
// Converted to CommonJS (require/module.exports) because Expo's config-plugin
// resolver loads external plugin files via require(), not ESM import.
// ES module import syntax in this file caused:
//   "The requested module '@expo/config-plugins' does not provide an export named 'AndroidConfig'"

const { withAndroidManifest } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withTrustLocalCerts = (config) => {
  return withAndroidManifest(config, async (config) => {
    config.modResults = await setCustomConfigAsync(config, config.modResults);
    return config;
  });
};

async function setCustomConfigAsync(config, androidManifest) {
  const srcFile = path.join(__dirname, 'network_security_config.xml');
  const destDir = path.join(
    config.modRequest.platformProjectRoot,
    'app/src/main/res/xml',
  );
  const destFile = path.join(destDir, 'network_security_config.xml');

  await fs.promises.mkdir(destDir, { recursive: true });
  await fs.promises.copyFile(srcFile, destFile);

  const application = androidManifest.manifest.application?.[0];
  if (application) {
    application.$['android:networkSecurityConfig'] = '@xml/network_security_config';
  }

  return androidManifest;
}

module.exports = withTrustLocalCerts;
