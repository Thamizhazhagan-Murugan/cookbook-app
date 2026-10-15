// Samsung DeX / freeform-window fix.
//
// React Native initialises its global DisplayMetricsHolder once, from the phone's main display,
// and never refreshes it. When the app runs on a display with a different density (DeX, an external
// monitor, a freeform window) text is measured with the wrong density and renders oversized and
// clipped. Re-syncing the metrics from the Activity — whose context belongs to the display the app
// is actually on — fixes it. See https://github.com/expo/expo/issues/46844 and
// https://github.com/facebook/react-native/issues/57183.
//
// On a single-display phone this is a no-op (the metrics are the same either way).
const { withMainActivity } = require('expo/config-plugins');

const IMPORTS = ['import android.content.res.Configuration', 'import com.facebook.react.uimanager.DisplayMetricsHolder'];

const BLOCK = `
  /** Keep React Native's display metrics in step with the display this Activity is on (DeX, external monitors). */
  private fun syncDisplayMetrics() {
    try {
      DisplayMetricsHolder.initDisplayMetrics(this)
    } catch (_: Throwable) {
      // never let a metrics refresh crash the app
    }
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    syncDisplayMetrics()
  }
`;

function patchKotlin(src) {
  if (src.includes('DisplayMetricsHolder')) return src; // already applied

  // imports: add ours right after the ReactActivity import (always present in Expo's template)
  src = src.replace(/^import com\.facebook\.react\.ReactActivity$/m, (line) => [...IMPORTS, line].join('\n'));

  // call it as soon as the activity exists, right after super.onCreate(...)
  const onCreate = /(^\s*super\.onCreate\([^)]*\)\s*$)/m;
  if (!onCreate.test(src)) throw new Error('withDisplayMetricsSync: could not find super.onCreate(...) in MainActivity.kt');
  src = src.replace(onCreate, (line) => `${line}\n    syncDisplayMetrics()`);

  // the helper + onConfigurationChanged go at the end of the class body
  const lastBrace = src.lastIndexOf('}');
  return `${src.slice(0, lastBrace)}${BLOCK}${src.slice(lastBrace)}`;
}

module.exports = function withDisplayMetricsSync(config) {
  return withMainActivity(config, (cfg) => {
    if (cfg.modResults.language !== 'kt') throw new Error('withDisplayMetricsSync: expected a Kotlin MainActivity');
    cfg.modResults.contents = patchKotlin(cfg.modResults.contents);
    return cfg;
  });
};
module.exports.patchKotlin = patchKotlin;
