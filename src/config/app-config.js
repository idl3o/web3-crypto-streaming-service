/**
 * Application configuration
 * Contains global settings and feature flags
 */

const config = {
  version: '1.0.0',
  apiBaseUrl: process.env.VUE_APP_API_URL || 'https://api.web3cryptostreaming.com',
  features: {
    offlineMode: true,
    pushNotifications: process.env.VUE_APP_PLATFORM === 'mobile',
    debugLogging: process.env.NODE_ENV === 'development',
    analyticsEnabled: process.env.NODE_ENV === 'production'
  },
  platforms: {
    isMobile: process.env.VUE_APP_PLATFORM === 'mobile',
    isAndroid: process.env.VUE_APP_PLATFORM === 'mobile' && /android/i.test(navigator.userAgent),
    isIOS: process.env.VUE_APP_PLATFORM === 'mobile' && /iphone|ipad|ipod/i.test(navigator.userAgent),
    isWeb: process.env.VUE_APP_PLATFORM !== 'mobile'
  }
};

export default config;
