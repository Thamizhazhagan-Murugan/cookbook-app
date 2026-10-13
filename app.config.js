// Extends app.json. Google services files are optional: when they exist next to this file the
// Google Sign-In native plugin is enabled; without them the app still builds (anonymous account only).
const fs = require('fs');
const path = require('path');

const hasAndroid = fs.existsSync(path.join(__dirname, 'google-services.json'));
const hasIos = fs.existsSync(path.join(__dirname, 'GoogleService-Info.plist'));

module.exports = ({ config }) => ({
  ...config,
  android: { ...config.android, ...(hasAndroid ? { googleServicesFile: './google-services.json' } : {}) },
  ios: { ...config.ios, ...(hasIos ? { googleServicesFile: './GoogleService-Info.plist' } : {}) },
  plugins: [...(config.plugins || []), ...(hasAndroid || hasIos ? ['@react-native-google-signin/google-signin'] : [])],
});
