/**
 * Operating System Utilities
 * Provides cross-platform functionality and OS detection for both browser and Node environments
 */

export enum OSType {
  WINDOWS = 'windows',
  MACOS = 'macos',
  LINUX = 'linux',
  ANDROID = 'android',
  IOS = 'ios',
  UNKNOWN = 'unknown'
}

export interface SystemInfo {
  os: OSType;
  version: string;
  isDesktop: boolean;
  isMobile: boolean;
  isWeb: boolean;
  isNode: boolean;
  isBrowser: boolean;
  isMacOS: boolean;
  isWindows: boolean;
  isLinux: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  cpuCores?: number;
  memoryGB?: number;
  platform?: string;
}

/**
 * Get information about the operating system and environment
 * Works in both browser and Node.js environments
 */
export function getSystemInfo(): SystemInfo {
  // Determine if running in Node.js
  const isNode = typeof process !== 'undefined' && 
    process.versions != null && 
    process.versions.node != null;
  
  // Determine if running in browser
  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
  
  let os = OSType.UNKNOWN;
  let version = '';
  let platform = '';
  let cpuCores;
  let memoryGB;

  if (isNode) {
    // Node.js environment
    const nodeOs = require('os');
    platform = nodeOs.platform();
    
    // Determine OS type
    if (platform === 'win32') os = OSType.WINDOWS;
    else if (platform === 'darwin') os = OSType.MACOS;
    else if (platform === 'linux') os = OSType.LINUX;
    else if (platform === 'android') os = OSType.ANDROID;
    else if (platform === 'ios') os = OSType.IOS;
    
    // Get OS version
    version = nodeOs.release();
    
    // Get system resources
    cpuCores = nodeOs.cpus().length;
    memoryGB = Math.round(nodeOs.totalmem() / (1024 * 1024 * 1024) * 10) / 10; // GB with 1 decimal
  } else if (isBrowser) {
    // Browser environment
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Determine OS type
    if (userAgent.indexOf('win') !== -1) os = OSType.WINDOWS;
    else if (userAgent.indexOf('mac') !== -1) os = OSType.MACOS;
    else if (userAgent.indexOf('linux') !== -1) os = OSType.LINUX;
    else if (userAgent.indexOf('android') !== -1) os = OSType.ANDROID;
    else if (/iphone|ipad|ipod/.test(userAgent)) os = OSType.IOS;
    
    // Get OS version - simplistic extraction, could be improved
    if (os === OSType.WINDOWS) {
      const winMatch = userAgent.match(/windows nt (\d+\.\d+)/);
      version = winMatch ? winMatch[1] : '';
    } else if (os === OSType.MACOS) {
      const macMatch = userAgent.match(/mac os x (\d+[._]\d+[._]\d+)/);
      version = macMatch ? macMatch[1].replace(/_/g, '.') : '';
    } else if (os === OSType.ANDROID) {
      const androidMatch = userAgent.match(/android (\d+\.\d+)/);
      version = androidMatch ? androidMatch[1] : '';
    } else if (os === OSType.IOS) {
      const iosMatch = userAgent.match(/os (\d+[._]\d+)/);
      version = iosMatch ? iosMatch[1].replace(/_/g, '.') : '';
    }
    
    // Try to get CPU cores if available in browser
    if (navigator.hardwareConcurrency) {
      cpuCores = navigator.hardwareConcurrency;
    }
  }

  const isDesktop = os === OSType.WINDOWS || os === OSType.MACOS || os === OSType.LINUX;
  const isMobile = os === OSType.ANDROID || os === OSType.IOS;
  const isWeb = isBrowser;
  
  return {
    os,
    version,
    isDesktop,
    isMobile,
    isWeb,
    isNode,
    isBrowser,
    isMacOS: os === OSType.MACOS,
    isWindows: os === OSType.WINDOWS, 
    isLinux: os === OSType.LINUX,
    isAndroid: os === OSType.ANDROID,
    isIOS: os === OSType.IOS,
    cpuCores,
    memoryGB,
    platform
  };
}

/**
 * Get OS-specific path separator
 */
export function getPathSeparator(): string {
  const systemInfo = getSystemInfo();
  return systemInfo.isWindows ? '\\' : '/';
}

/**
 * Normalize a file path for the current OS
 * @param path The path to normalize
 */
export function normalizePath(path: string): string {
  const systemInfo = getSystemInfo();
  const separator = getPathSeparator();
  
  // Replace all forward/backward slashes with OS-specific separator
  return path.replace(/[\\\/]/g, separator);
}

/**
 * Get system performance metrics
 * Includes CPU load, available memory, etc.
 */
export async function getPerformanceMetrics(): Promise<{
  cpuUsage?: number; // percentage
  memoryUsage?: number; // percentage
  availableMemoryGB?: number;
  temperatureC?: number; // CPU temperature in Celsius
}> {
  const systemInfo = getSystemInfo();
  
  if (systemInfo.isNode) {
    // Node.js environment - can get actual metrics
    const os = require('os');
    
    // Calculate CPU usage - a very simple approximation
    const cpus = os.cpus();
    const cpuCount = cpus.length;
    
    // Memory usage
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = Math.round((usedMemory / totalMemory) * 100);
    const availableMemoryGB = Math.round(freeMemory / (1024 * 1024 * 1024) * 10) / 10;
    
    return {
      memoryUsage,
      availableMemoryGB
    };
  } else if (systemInfo.isBrowser) {
    // Browser environment - limited metrics
    // Most browsers don't provide CPU/memory metrics for security reasons
    if ('memory' in window.performance) {
      const memory = (window.performance as any).memory;
      if (memory) {
        const usedHeapRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        return {
          memoryUsage: Math.round(usedHeapRatio * 100)
        };
      }
    }
  }
  
  return {}; // No metrics available
}

/**
 * Determine if the system meets minimum requirements for streaming
 */
export function meetsMinimumRequirements(): { 
  meets: boolean; 
  issues: string[];
} {
  const systemInfo = getSystemInfo();
  const issues: string[] = [];
  
  // Check CPU cores
  if (systemInfo.cpuCores && systemInfo.cpuCores < 2) {
    issues.push('CPU: Minimum 2 cores recommended (found: ' + systemInfo.cpuCores + ')');
  }
  
  // Check memory
  if (systemInfo.memoryGB && systemInfo.memoryGB < 4) {
    issues.push('Memory: Minimum 4GB recommended (found: ' + systemInfo.memoryGB + 'GB)');
  }
  
  // Mobile-specific checks
  if (systemInfo.isMobile) {
    // Check if OS version is sufficient for mobile streaming
    if (systemInfo.isAndroid && systemInfo.version && parseFloat(systemInfo.version) < 8.0) {
      issues.push('Android: Version 8.0+ recommended (found: ' + systemInfo.version + ')');
    }
    
    if (systemInfo.isIOS && systemInfo.version && parseFloat(systemInfo.version) < 13.0) {
      issues.push('iOS: Version 13.0+ recommended (found: ' + systemInfo.version + ')');
    }
  }
  
  return {
    meets: issues.length === 0,
    issues
  };
}

/**
 * Get OS-specific configuration defaults
 */
export function getOSDefaults(): Record<string, any> {
  const systemInfo = getSystemInfo();
  
  // Base defaults
  const defaults: Record<string, any> = {
    maxConcurrentDownloads: 3,
    maxCacheSize: 1024 * 1024 * 500, // 500MB
    autoPlayback: true,
    bufferSize: 30, // 30 seconds
    prefetchCount: 2 // prefetch 2 segments ahead
  };
  
  // OS-specific tweaks
  if (systemInfo.isMobile) {
    // Mobile optimizations
    defaults.maxConcurrentDownloads = 2;
    defaults.maxCacheSize = 1024 * 1024 * 200; // 200MB
    defaults.bufferSize = 15; // 15 seconds
    defaults.prefetchCount = 1;
    defaults.autoHDToggle = true; // Auto toggle HD based on connection
  }
  
  // Platform-specific tweaks
  if (systemInfo.isAndroid) {
    defaults.androidCustomTweaks = true;
  } else if (systemInfo.isIOS) {
    defaults.iosCustomTweaks = true;
    defaults.useNativePlayer = true;
  }
  
  if (systemInfo.isDesktop) {
    // Desktop optimizations
    if (systemInfo.cpuCores && systemInfo.cpuCores >= 8) {
      defaults.maxConcurrentDownloads = 5;
    }
    
    if (systemInfo.memoryGB && systemInfo.memoryGB >= 16) {
      defaults.maxCacheSize = 1024 * 1024 * 1000; // 1GB
    }
  }
  
  return defaults;
}

// Export a singleton with the system info
export const SystemInfo = getSystemInfo();
