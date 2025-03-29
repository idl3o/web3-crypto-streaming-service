/**
 * Utilities for mobile device detection and handling
 */

// Check if we're running in a Capacitor native app
export function isNativeApp(): boolean {
  return typeof (window as any).Capacitor !== 'undefined' &&
    (window as any).Capacitor.isNative === true;
}

// Check if we're running on an Android device
export function isAndroid(): boolean {
  return isNativeApp() && (window as any).Capacitor.getPlatform() === 'android';
}

// Check if we're running on iOS
export function isIOS(): boolean {
  return isNativeApp() && (window as any).Capacitor.getPlatform() === 'ios';
}

// Check if we're in a mobile browser
export function isMobileBrowser(): boolean {
  const userAgent = window.navigator.userAgent;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
}

// Check if device is mobile (either native app or mobile browser)
export function isMobileDevice(): boolean {
  return isNativeApp() || isMobileBrowser();
}

// Adjust UI elements for mobile view
export function applyMobileOptimizations(): void {
  if (isMobileDevice()) {
    // Add a viewport meta tag with proper settings if not present
    if (!document.querySelector('meta[name="viewport"]')) {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.getElementsByTagName('head')[0].appendChild(meta);
    }
    
    // Add mobile-specific class to body
    document.body.classList.add('mobile-device');
    
    // Disable pull-to-refresh on mobile browsers
    document.body.style.overscrollBehavior = 'none';
    
    // Prevent text selection
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    
    // Prevent iOS double tap zoom
    const style = document.createElement('style');
    style.innerHTML = `
      * {
        touch-action: manipulation;
      }
    `;
    document.head.appendChild(style);
  }
}
