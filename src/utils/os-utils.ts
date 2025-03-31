/**
 * OS Utilities
 * Helper functions for cross-platform path resolution and OS-specific operations
 */

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Platform type
 */
export enum Platform {
  WINDOWS = 'win32',
  MACOS = 'darwin',
  LINUX = 'linux',
  UNKNOWN = 'unknown'
}

/**
 * Architecture type
 */
export enum Architecture {
  X64 = 'x64',
  ARM64 = 'arm64',
  IA32 = 'ia32',
  UNKNOWN = 'unknown'
}

/**
 * Platform-specific file extension
 */
export enum FileExtension {
  EXECUTABLE = '',
  SHARED_LIBRARY = '',
  SCRIPT = ''
}

/**
 * Current platform information
 */
export interface PlatformInfo {
  platform: Platform;
  architecture: Architecture;
  isWindows: boolean;
  isMacOS: boolean;
  isLinux: boolean;
  homeDir: string;
  tempDir: string;
}

/**
 * Get current platform information
 */
export function getPlatformInfo(): PlatformInfo {
  const currentPlatform = os.platform() as Platform;
  const currentArch = os.arch() as Architecture;
  
  const isWindows = currentPlatform === Platform.WINDOWS;
  const isMacOS = currentPlatform === Platform.MACOS;
  const isLinux = currentPlatform === Platform.LINUX;
  
  return {
    platform: currentPlatform,
    architecture: currentArch,
    isWindows,
    isMacOS,
    isLinux,
    homeDir: os.homedir(),
    tempDir: os.tmpdir()
  };
}

/**
 * Get platform-specific file extensions
 */
export function getPlatformExtensions(): {
  executable: string;
  sharedLibrary: string;
  script: string;
} {
  const { isWindows, isLinux } = getPlatformInfo();
  
  return {
    executable: isWindows ? '.exe' : '',
    sharedLibrary: isWindows ? '.dll' : isLinux ? '.so' : '.dylib',
    script: isWindows ? '.bat' : '.sh'
  };
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV !== 'production';
}

/**
 * Resolve the platform-specific path to a native module
 * @param moduleName The module name
 */
export function resolveNativeModulePath(moduleName: string): string {
  const { platform, architecture } = getPlatformInfo();
  const extensions = getPlatformExtensions();
  
  // Build path to native module
  const modulePath = path.join(
    __dirname, '..', '..', 'lib', 'binding',
    `${platform}-${architecture}`, 
    `${moduleName}${extensions.sharedLibrary}`
  );
  
  return modulePath;
}

/**
 * Check if a native module is available
 * @param moduleName The module name
 */
export function hasNativeModule(moduleName: string): boolean {
  const modulePath = resolveNativeModulePath(moduleName);
  return fs.existsSync(modulePath);
}

/**
 * Execute a platform-specific command
 * @param command Command to execute
 */
export async function executePlatformCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process');
    
    exec(command, (error: Error | null, stdout: string, stderr: string) => {
      if (error) {
        reject(new Error(`Command execution failed: ${error.message}`));
        return;
      }
      
      resolve(stdout.trim());
    });
  });
}

/**
 * Get memory statistics
 */
export function getMemoryStats(): {
  total: number;
  free: number;
  used: number;
  percentUsed: number;
} {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  const percentUsed = (used / total) * 100;
  
  return {
    total,
    free,
    used,
    percentUsed
  };
}

/**
 * Format bytes to human-readable string
 * @param bytes Bytes to format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Check if file permissions allow execution
 * @param filePath Path to file
 */
export function isExecutable(filePath: string): boolean {
  try {
    if (getPlatformInfo().isWindows) {
      // Windows doesn't have the same executable bit concept
      return fs.existsSync(filePath);
    } else {
      // Check if file is executable on Unix-like systems
      try {
        fs.accessSync(filePath, fs.constants.X_OK);
        return true;
      } catch (error) {
        return false;
      }
    }
  } catch (error) {
    return false;
  }
}
