/**
 * Platform Configuration Service
 * Manages platform-specific settings and configurations
 */

import { EventEmitter } from 'events';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

import { getPlatformInfo, Platform, Architecture, formatBytes } from '../utils/os-utils';
import { healthMonitoringService, ComponentType, HealthStatus } from './HealthMonitoringService';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';

/**
 * Platform-specific feature flags
 */
export interface PlatformFeatureFlags {
  useNativeModules: boolean;
  enableHardwareAcceleration: boolean;
  enableQuantumResistantAlgorithms: boolean;
  multiThreadingEnabled: boolean;
  useWebGPU: boolean;
  useSystemProxies: boolean;
  enableExperimentalFeatures: boolean;
}

/**
 * Platform optimization profile
 */
export enum OptimizationProfile {
  PERFORMANCE = 'performance',
  BALANCED = 'balanced',
  POWER_SAVING = 'power-saving',
  CUSTOM = 'custom'
}

/**
 * Hardware capabilities
 */
export interface HardwareCapabilities {
  cpuCores: number;
  totalMemory: number;
  freeMemory: number;
  gpuAcceleration: boolean;
  arm64Architecture: boolean;
  avx2Support: boolean;
  hasQuantumFeatures: boolean;
}

/**
 * Platform Configuration Service
 */
export class PlatformConfigService extends EventEmitter {
  private static instance: PlatformConfigService;
  private initialized = false;
  private platformInfo = getPlatformInfo();
  private featureFlags: PlatformFeatureFlags = {
    useNativeModules: true,
    enableHardwareAcceleration: true,
    enableQuantumResistantAlgorithms: false,
    multiThreadingEnabled: true,
    useWebGPU: false,
    useSystemProxies: true,
    enableExperimentalFeatures: false
  };
  private optimizationProfile: OptimizationProfile = OptimizationProfile.BALANCED;
  private hardwareCapabilities: HardwareCapabilities = {
    cpuCores: os.cpus().length,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    gpuAcceleration: false,
    arm64Architecture: this.platformInfo.architecture === Architecture.ARM64,
    avx2Support: false,
    hasQuantumFeatures: false
  };
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    super();
    this.setMaxListeners(20);
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): PlatformConfigService {
    if (!PlatformConfigService.instance) {
      PlatformConfigService.instance = new PlatformConfigService();
    }
    return PlatformConfigService.instance;
  }
  
  /**
   * Initialize the service
   * @param options Initialization options
   */
  public async initialize(options?: {
    configPath?: string;
    forceDetection?: boolean;
    optimizationProfile?: OptimizationProfile;
  }): Promise<boolean> {
    if (this.initialized && !options?.forceDetection) {
      return true;
    }
    
    try {
      // Detect hardware capabilities
      await this.detectHardwareCapabilities();
      
      // Load configuration from file if specified
      if (options?.configPath && fs.existsSync(options.configPath)) {
        const configData = fs.readFileSync(options.configPath, 'utf8');
        const config = JSON.parse(configData);
        
        if (config.featureFlags) {
          this.featureFlags = {
            ...this.featureFlags,
            ...config.featureFlags
          };
        }
        
        if (config.optimizationProfile) {
          this.optimizationProfile = config.optimizationProfile;
        }
      }
      
      // Override optimization profile if specified
      if (options?.optimizationProfile) {
        this.optimizationProfile = options.optimizationProfile;
        this.applyOptimizationProfile();
      }
      
      // Register with health monitoring
      await this.registerWithHealthMonitoring();
      
      // Apply platform-specific adjustments
      this.applyPlatformSpecificSettings();
      
      this.initialized = true;
      this.emit('initialized', this.platformInfo);
      return true;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SYSTEM,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to initialize PlatformConfigService',
        details: error instanceof Error ? error.message : String(error),
        retryable: false,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return false;
    }
  }
  
  /**
   * Register with health monitoring service
   */
  private async registerWithHealthMonitoring(): Promise<void> {
    if (!healthMonitoringService['initialized']) {
      await healthMonitoringService.initialize();
    }
    
    healthMonitoringService.registerComponent(
      'platform-config',
      ComponentType.SYSTEM,
      {
        status: HealthStatus.HEALTHY,
        message: 'Platform configuration initialized',
        metrics: {
          platform: this.platformInfo.platform,
          arch: this.platformInfo.architecture,
          cpuCores: this.hardwareCapabilities.cpuCores,
          totalMemory: formatBytes(this.hardwareCapabilities.totalMemory)
        }
      }
    );
    
    healthMonitoringService.registerHealthCheck(
      'platform-config',
      async () => {
        // Update free memory value
        this.hardwareCapabilities.freeMemory = os.freemem();
        
        return {
          status: HealthStatus.HEALTHY,
          message: 'Platform configuration operational',
          metrics: {
            freeMemory: formatBytes(this.hardwareCapabilities.freeMemory),
            memoryUsage: `${Math.round((1 - this.hardwareCapabilities.freeMemory / this.hardwareCapabilities.totalMemory) * 100)}%`,
            optimizationProfile: this.optimizationProfile
          }
        };
      },
      15 * 60 * 1000 // Check every 15 minutes
    );
  }
  
  /**
   * Detect hardware capabilities
   */
  private async detectHardwareCapabilities(): Promise<void> {
    // Basic capabilities
    const cpus = os.cpus();
    this.hardwareCapabilities.cpuCores = cpus.length;
    this.hardwareCapabilities.totalMemory = os.totalmem();
    this.hardwareCapabilities.freeMemory = os.freemem();
    
    // ARM64 detection
    this.hardwareCapabilities.arm64Architecture = this.platformInfo.architecture === Architecture.ARM64;
    
    // Detect advanced CPU features by examining CPU info
    const cpuModel = cpus.length > 0 ? cpus[0].model.toLowerCase() : '';
    this.hardwareCapabilities.avx2Support = cpuModel.includes('avx2');
    
    // GPU acceleration detection - platform specific
    this.detectGpuAcceleration();
    
    // Check for quantum resistance capabilities
    // This is a placeholder, in reality you would check for specific hardware or
    // software capabilities that support quantum-resistant algorithms
    this.hardwareCapabilities.hasQuantumFeatures = 
      this.hardwareCapabilities.cpuCores >= 8 && 
      this.hardwareCapabilities.totalMemory >= 16 * 1024 * 1024 * 1024; // 16GB RAM
    
    this.emit('hardware-detected', this.hardwareCapabilities);
  }
  
  /**
   * Detect GPU acceleration capabilities
   * This is platform-specific and would need a more sophisticated implementation
   * in a real-world scenario
   */
  private detectGpuAcceleration(): void {
    try {
      // Basic detection strategy - in a real app you would use proper GPU detection
      if (this.platformInfo.isWindows) {
        // For Windows, we'd use something like DXGI enumeration
        // This is a placeholder implementation
        this.hardwareCapabilities.gpuAcceleration = true;
      } else if (this.platformInfo.isMacOS) {
        // For macOS, we'd use Metal API or IOKit
        // This is a placeholder implementation
        this.hardwareCapabilities.gpuAcceleration = true;
      } else if (this.platformInfo.isLinux) {
        // For Linux, we'd check for OpenGL/Vulkan support
        // This is a placeholder implementation
        try {
          // Check if we could potentially have GPU support
          const gpuEnv = process.env.DISPLAY || process.env.WAYLAND_DISPLAY;
          this.hardwareCapabilities.gpuAcceleration = !!gpuEnv;
        } catch (e) {
          this.hardwareCapabilities.gpuAcceleration = false;
        }
      }
    } catch (error) {
      this.hardwareCapabilities.gpuAcceleration = false;
    }
  }
  
  /**
   * Apply platform-specific settings
   */
  private applyPlatformSpecificSettings(): void {
    // Windows-specific settings
    if (this.platformInfo.isWindows) {
      // Example: Windows may need different network settings
      this.featureFlags.useSystemProxies = true;
      
      // On Windows, we'd prefer to use native modules when available
      this.featureFlags.useNativeModules = true;
    }
    
    // macOS-specific settings
    else if (this.platformInfo.isMacOS) {
      // macOS has good GPU acceleration for many tasks
      this.featureFlags.enableHardwareAcceleration = true;
      
      // Check if running on Apple Silicon
      if (this.platformInfo.architecture === Architecture.ARM64) {
        // Optimize for Apple Silicon
        this.featureFlags.multiThreadingEnabled = true;
      }
    }
    
    // Linux-specific settings
    else if (this.platformInfo.isLinux) {
      // Linux systems might need more careful native module handling
      this.featureFlags.useNativeModules = fs.existsSync(
        path.join(__dirname, '..', '..', 'lib', 'binding', 
                  `linux-${this.platformInfo.architecture}`)
      );
      
      // Check for headless environment
      const isHeadless = !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY;
      if (isHeadless) {
        this.featureFlags.enableHardwareAcceleration = false;
        this.featureFlags.useWebGPU = false;
      }
    }
    
    // Apply settings based on hardware capabilities
    if (this.hardwareCapabilities.cpuCores <= 2) {
      // Low-end system, reduce parallel processing
      this.featureFlags.multiThreadingEnabled = false;
    }
    
    if (this.hardwareCapabilities.totalMemory < 4 * 1024 * 1024 * 1024) { // < 4GB RAM
      // Low memory system
      this.featureFlags.enableQuantumResistantAlgorithms = false;
    }
    
    // Set quantum resistant algorithms based on capabilities
    if (this.hardwareCapabilities.hasQuantumFeatures) {
      this.featureFlags.enableQuantumResistantAlgorithms = true;
    }
    
    this.emit('settings-applied', this.featureFlags);
  }
  
  /**
   * Apply settings based on optimization profile
   */
  private applyOptimizationProfile(): void {
    switch (this.optimizationProfile) {
      case OptimizationProfile.PERFORMANCE:
        this.featureFlags.enableHardwareAcceleration = true;
        this.featureFlags.multiThreadingEnabled = true;
        this.featureFlags.useWebGPU = this.hardwareCapabilities.gpuAcceleration;
        break;
        
      case OptimizationProfile.POWER_SAVING:
        this.featureFlags.enableHardwareAcceleration = false;
        this.featureFlags.multiThreadingEnabled = false;
        this.featureFlags.useWebGPU = false;
        break;
        
      case OptimizationProfile.BALANCED:
        // Default settings - already set in constructor
        this.featureFlags.enableHardwareAcceleration = true;
        this.featureFlags.multiThreadingEnabled = this.hardwareCapabilities.cpuCores > 2;
        this.featureFlags.useWebGPU = false;
        break;
        
      case OptimizationProfile.CUSTOM:
        // Custom settings are set externally
        break;
    }
    
    this.emit('profile-applied', this.optimizationProfile);
  }
  
  /**
   * Get current platform information
   */
  public getPlatformInfo(): PlatformInfo {
    return this.platformInfo;
  }
  
  /**
   * Get current feature flags
   */
  public getFeatureFlags(): PlatformFeatureFlags {
    return { ...this.featureFlags };
  }
  
  /**
   * Update feature flags
   * @param flags Feature flags to update
   */
  public updateFeatureFlags(flags: Partial<PlatformFeatureFlags>): void {
    this.featureFlags = {
      ...this.featureFlags,
      ...flags
    };
    
    this.emit('feature-flags-updated', this.featureFlags);
  }
  
  /**
   * Get current optimization profile
   */
  public getOptimizationProfile(): OptimizationProfile {
    return this.optimizationProfile;
  }
  
  /**
   * Set optimization profile
   * @param profile Optimization profile to set
   */
  public setOptimizationProfile(profile: OptimizationProfile): void {
    this.optimizationProfile = profile;
    this.applyOptimizationProfile();
  }
  
  /**
   * Get hardware capabilities
   */
  public getHardwareCapabilities(): HardwareCapabilities {
    // Refresh the free memory value
    this.hardwareCapabilities.freeMemory = os.freemem();
    return { ...this.hardwareCapabilities };
  }
  
  /**
   * Check if feature is enabled
   * @param feature Feature to check
   */
  public isFeatureEnabled(feature: keyof PlatformFeatureFlags): boolean {
    return this.featureFlags[feature];
  }
  
  /**
   * Save current configuration to file
   * @param configPath Path to save configuration to
   */
  public saveConfig(configPath: string): boolean {
    try {
      const configData = {
        featureFlags: this.featureFlags,
        optimizationProfile: this.optimizationProfile,
        savedAt: new Date().toISOString()
      };
      
      const configDir = path.dirname(configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
      return true;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.FILE_SYSTEM,
        severity: IOErrorSeverity.WARNING,
        message: 'Failed to save platform configuration',
        details: error instanceof Error ? error.message : String(error),
        retryable: false,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return false;
    }
  }
  
  /**
   * Check if running on Apple Silicon
   */
  public isAppleSilicon(): boolean {
    return this.platformInfo.isMacOS && this.platformInfo.architecture === Architecture.ARM64;
  }
  
  /**
   * Check if the system has enough resources for quantum-resistant algorithms
   */
  public hasQuantumCapabilities(): boolean {
    return this.hardwareCapabilities.hasQuantumFeatures;
  }
}

// Export singleton instance
export const platformConfigService = PlatformConfigService.getInstance();
export default platformConfigService;
