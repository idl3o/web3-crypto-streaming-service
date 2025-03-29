/**
 * This file contains configuration for Android-specific resources
 * such as deeplinks, permissions, and other Android configurations
 */

export const androidPermissions = [
  'android.permission.INTERNET', 
  'android.permission.ACCESS_NETWORK_STATE'
];

// Add deeplink configuration for returning from wallet apps
export const androidDeepLinks = [
  {
    scheme: 'web3cryptostream',
    host: 'app',
    paths: ['*']
  }
];

// Define which external apps can be launched from our app
export const androidIntentFilters = [
  {
    action: 'android.intent.action.VIEW',
    category: ['android.intent.category.DEFAULT', 'android.intent.category.BROWSABLE'],
    data: {
      scheme: 'https',
      host: '*.etherscan.io'
    }
  }
];

// Maps activity lifecycle events to our application events
export function mapAndroidLifecycle() {
  return {
    onResume: () => {
      // Code to run when application resumes
      console.log('Android app resumed');
      document.dispatchEvent(new CustomEvent('appResume'));
    },
    onPause: () => {
      // Code to run when application pauses
      console.log('Android app paused');
      document.dispatchEvent(new CustomEvent('appPause'));
    }
  };
}
