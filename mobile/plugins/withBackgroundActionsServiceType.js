const { withAndroidManifest } = require('expo/config-plugins');

const SERVICE = 'com.asterinet.react.bgactions.RNBackgroundActionsTask';

/**
 * Android 14+ 要求前台服务在 Manifest 里声明 foregroundServiceType,
 * 而 react-native-background-actions 自带的 Manifest 没有声明,这里补上 dataSync。
 */
module.exports = function withBackgroundActionsServiceType(config) {
  return withAndroidManifest(config, (cfg) => {
    const application = cfg.modResults.manifest.application?.[0];
    if (!application) return cfg;

    const services = application.service ?? [];
    const existing = services.find((s) => s.$?.['android:name'] === SERVICE);
    if (existing) {
      existing.$['android:foregroundServiceType'] = 'dataSync';
    } else {
      services.push({
        $: {
          'android:name': SERVICE,
          'android:foregroundServiceType': 'dataSync',
        },
      });
      application.service = services;
    }
    return cfg;
  });
};
