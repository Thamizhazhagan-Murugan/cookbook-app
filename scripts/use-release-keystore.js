// Switches the generated android/app/build.gradle to sign release builds with
// android/app/release.keystore, using the ANDROID_* environment variables. Run by CI only.
const fs = require('fs');
const path = require('path');
const gradle = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
let s = fs.readFileSync(gradle, 'utf8');
const { ANDROID_KEYSTORE_PASSWORD: ksPass, ANDROID_KEY_ALIAS: alias, ANDROID_KEY_PASSWORD: keyPass } = process.env;
if (!ksPass || !alias || !keyPass) throw new Error('ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS and ANDROID_KEY_PASSWORD are required');
const esc = (v) => v.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
s = s.replace(
  /signingConfigs \{\n\s*debug \{/,
  `signingConfigs {\n        release {\n            storeFile file('release.keystore')\n            storePassword '${esc(ksPass)}'\n            keyAlias '${esc(alias)}'\n            keyPassword '${esc(keyPass)}'\n        }\n        debug {`
);
s = s.replace(/release \{\n(\s*\/\/[^\n]*\n)*\s*signingConfig signingConfigs\.debug/, (m) => m.replace('signingConfigs.debug', 'signingConfigs.release'));
if (!s.includes("signingConfig signingConfigs.release")) throw new Error('Could not patch build.gradle');
fs.writeFileSync(gradle, s);
console.log('build.gradle now signs release builds with release.keystore');
