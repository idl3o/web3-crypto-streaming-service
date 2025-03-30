import { getPathSeparator, normalizePath, getSystemInfo, OSType } from './OSUtils';
import path from 'path';

/**
 * Path utility functions for platform-specific file operations
 */

/**
 * Get the application data directory based on operating system
 */
export function getAppDataDir(appName: string = 'web3-crypto-streaming'): string {
    const systemInfo = getSystemInfo();

    if (!systemInfo.isNode) {
        // In browser environment, we don't have access to file system
        throw new Error('Cannot access file system in browser environment');
    }

    let baseDir: string;

    switch (systemInfo.os) {
        case OSType.WINDOWS:
            baseDir = process.env.APPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming');
            break;

        case OSType.MACOS:
            baseDir = path.join(process.env.HOME || '', 'Library', 'Application Support');
            break;

        case OSType.LINUX:
            baseDir = process.env.XDG_DATA_HOME || path.join(process.env.HOME || '', '.local', 'share');
            break;

        default:
            baseDir = process.env.HOME || '';
    }

    return path.join(baseDir, appName);
}

/**
 * Get the application config directory based on operating system
 */
export function getConfigDir(appName: string = 'web3-crypto-streaming'): string {
    const systemInfo = getSystemInfo();

    if (!systemInfo.isNode) {
        throw new Error('Cannot access file system in browser environment');
    }

    let baseDir: string;

    switch (systemInfo.os) {
        case OSType.WINDOWS:
            baseDir = process.env.APPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming');
            break;

        case OSType.MACOS:
            baseDir = path.join(process.env.HOME || '', 'Library', 'Preferences');
            break;

        case OSType.LINUX:
            baseDir = process.env.XDG_CONFIG_HOME || path.join(process.env.HOME || '', '.config');
            break;

        default:
            baseDir = process.env.HOME || '';
    }

    return path.join(baseDir, appName);
}

/**
 * Get the application cache directory based on operating system
 */
export function getCacheDir(appName: string = 'web3-crypto-streaming'): string {
    const systemInfo = getSystemInfo();

    if (!systemInfo.isNode) {
        throw new Error('Cannot access file system in browser environment');
    }

    let baseDir: string;

    switch (systemInfo.os) {
        case OSType.WINDOWS:
            baseDir = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local');
            break;

        case OSType.MACOS:
            baseDir = path.join(process.env.HOME || '', 'Library', 'Caches');
            break;

        case OSType.LINUX:
            baseDir = process.env.XDG_CACHE_HOME || path.join(process.env.HOME || '', '.cache');
            break;

        default:
            baseDir = path.join(process.env.HOME || '', '.cache');
    }

    return path.join(baseDir, appName);
}

/**
 * Get temporary directory path
 */
export function getTempDir(): string {
    const systemInfo = getSystemInfo();

    if (!systemInfo.isNode) {
        throw new Error('Cannot access file system in browser environment');
    }

    const os = require('os');
    return os.tmpdir();
}

/**
 * Convert a file path between different OS formats
 * @param filePath The file path to convert
 * @param targetOS The target OS format
 */
export function convertPathFormat(filePath: string, targetOS: OSType): string {
    if (!filePath) return filePath;

    // Normalize path to use forward slashes internally
    let normalizedPath = filePath.replace(/\\/g, '/');

    // Handle Windows network paths specially
    const isUncPath = normalizedPath.startsWith('//') || normalizedPath.startsWith('\\\\');

    // Convert to target OS format
    if (targetOS === OSType.WINDOWS) {
        // For Windows paths:
        if (isUncPath) {
            // Keep UNC paths with backslashes
            return '\\\\' + normalizedPath.substring(2).replace(/\//g, '\\');
        }

        // Handle drive letters (e.g., C:/)
        if (/^[a-zA-Z]:\//.test(normalizedPath)) {
            return normalizedPath.charAt(0) + ':\\' + normalizedPath.substring(3).replace(/\//g, '\\');
        }

        // Regular paths
        return normalizedPath.replace(/\//g, '\\');
    } else {
        // For Unix-like paths, use forward slashes
        // Handle Windows drive letters
        if (/^[a-zA-Z]:/.test(normalizedPath)) {
            const driveLetter = normalizedPath.charAt(0).toLowerCase();

            if (targetOS === OSType.MACOS) {
                return `/Volumes/${driveLetter}/${normalizedPath.substring(3)}`;
            } else {
                // For Linux, we can use /mnt/
                return `/mnt/${driveLetter}/${normalizedPath.substring(3)}`;
            }
        }

        // Handle Windows UNC paths
        if (isUncPath) {
            return `/mnt/network/${normalizedPath.substring(2)}`;
        }

        // Regular paths
        return normalizedPath;
    }
}

/**
 * Create a platform-independent relative path from one path to another
 */
export function getRelativePath(from: string, to: string): string {
    // Normalize both paths to use forward slashes
    const normalizedFrom = from.replace(/\\/g, '/');
    const normalizedTo = to.replace(/\\/g, '/');

    // Split paths into segments
    const fromParts = normalizedFrom.split('/').filter(Boolean);
    const toParts = normalizedTo.split('/').filter(Boolean);

    // Find common segments
    let commonLength = 0;
    const maxLength = Math.min(fromParts.length, toParts.length);

    for (let i = 0; i < maxLength; i++) {
        if (fromParts[i] === toParts[i]) {
            commonLength++;
        } else {
            break;
        }
    }

    // Build relative path
    const upSegments = fromParts.length - commonLength;
    const downSegments = toParts.slice(commonLength);

    const relativePath = [...Array(upSegments).fill('..'), ...downSegments].join('/');

    return relativePath || '.';
}
