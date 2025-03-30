import { EventEmitter } from 'events';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';

/**
 * Configuration value types
 */
export type ConfigValue = string | number | boolean | object | null;

/**
 * Configuration scope
 */
export enum ConfigScope {
  SYSTEM = 'system',
  USER = 'user',
  SESSION = 'session',
  FEATURE = 'feature'
}

/**
 * Configuration override level
 */
export enum ConfigLevel {
  DEFAULT = 0,
  ENVIRONMENT = 10,
  REMOTE = 20,
  USER = 30,
  OVERRIDE = 40
}

/**
 * Configuration entry
 */
export interface ConfigEntry {
  key: string;
  value: ConfigValue;
  scope: ConfigScope;
  level: ConfigLevel;
  updatedAt: number;
}

/**
 * Configuration service for centralized app configuration
 * Solves the scattered configuration management across services
 */
export class ConfigurationService extends EventEmitter {
  private static instance: ConfigurationService;
  private configs: Map<string, ConfigEntry> = new Map();
  private remoteConfigUrl?: string;
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly defaultSyncInterval = 5 * 60 * 1000; // 5 minutes
  
  private constructor() {
    super();
  }
  
  public static getInstance(): ConfigurationService {
    if (!ConfigurationService.instance) {
      ConfigurationService.instance = new ConfigurationService();
    }
    return ConfigurationService.instance;
  }
  
  /**
   * Initialize the configuration service
   */
  public async initialize(options?: { remoteConfigUrl?: string }): Promise<void> {
    try {
      // Set remote config URL if provided
      if (options?.remoteConfigUrl) {
        this.remoteConfigUrl = options.remoteConfigUrl;
      }
      
      // Load default configs
      this.loadDefaultConfigs();
      
      // Load environment configs
      this.loadEnvironmentConfigs();
      
      // Load stored user configs
      this.loadUserConfigs();
      
      // Sync with remote if URL provided
      if (this.remoteConfigUrl) {
        await this.syncWithRemote();
        this.startAutoSync();
      }
      
      console.log('Configuration service initialized');
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.UNKNOWN,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to initialize configuration service',
        details: error instanceof Error ? error.message : String(error),
        source: 'ConfigurationService',
        retryable: false,
        error: error instanceof Error ? error : new Error(String(error))
      });
    }
  }
  
  /**
   * Get a configuration value
   */
  public get<T extends ConfigValue>(key: string, defaultValue?: T): T {
    const entry = this.configs.get(key);
    
    if (!entry) {
      return defaultValue as T;
    }
    
    return entry.value as T;
  }
  
  /**
   * Set a configuration value
   */
  public set(key: string, value: ConfigValue, scope: ConfigScope = ConfigScope.USER): boolean {
    try {
      const existingEntry = this.configs.get(key);
      const level = this.getLevelForScope(scope);
      
      // Don't override higher level configs with lower level ones
      if (existingEntry && existingEntry.level > level) {
        return false;
      }
      
      const entry: ConfigEntry = {
        key,
        value,
        scope,
        level,
        updatedAt: Date.now()
      };
      
      // Store the config
      this.configs.set(key, entry);
      
      // Persist user configs
      if (scope === ConfigScope.USER) {
        this.saveUserConfigs();
      }
      
      // Emit change event
      this.emit('config-changed', { key, value, oldValue: existingEntry?.value });
      
      return true;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.UNKNOWN,
        severity: IOErrorSeverity.ERROR,
        message: `Failed to set configuration: ${key}`,
        details: error instanceof Error ? error.message : String(error),
        source: 'ConfigurationService',
        retryable: false,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return false;
    }
  }
  
  /**
   * Reset a configuration to its default value
   */
  public reset(key: string): void {
    const existingEntry = this.configs.get(key);
    
    if (!existingEntry) {
      return;
    }
    
    // Find lower-level entries for this key
    const entries = Array.from(this.configs.entries())
      .filter(([k, e]) => k === key)
      .sort((a, b) => a[1].level - b[1].level);
    
    if (entries.length <= 1) {
      // No lower level entries, remove completely
      this.configs.delete(key);
      this.emit('config-removed', { key });
    } else {
      // Use the next highest priority entry
      const nextEntry = entries[entries.length - 2][1];
      this.configs.set(key, nextEntry);
      this.emit('config-changed', { key, value: nextEntry.value, oldValue: existingEntry.value });
    }
    
    // If user config was reset, update storage
    if (existingEntry.scope === ConfigScope.USER) {
      this.saveUserConfigs();
    }
  }
  
  /**
   * Watch for configuration changes
   */
  public watch(key: string, callback: (value: ConfigValue) => void): () => void {
    const handler = (data: { key: string, value: ConfigValue }) => {
      if (data.key === key) {
        callback(data.value);
      }
    };
    
    this.on('config-changed', handler);
    
    // Return unsubscribe function
    return () => {
      this.off('config-changed', handler);
    };
  }
  
  /**
   * Start automatic sync with remote config
   */
  private startAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(() => {
      this.syncWithRemote().catch(error => {
        console.error('Failed to sync with remote config:', error);
      });
    }, this.defaultSyncInterval);
  }
  
  /**
   * Sync with remote configuration server
   */
  public async syncWithRemote(): Promise<void> {
    if (!this.remoteConfigUrl) {
      return;
    }
    
    try {
      const response = await fetch(this.remoteConfigUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch remote config: ${response.status} ${response.statusText}`);
      }
      
      const remoteConfigs = await response.json();
      
      // Apply remote configs
      for (const [key, value] of Object.entries(remoteConfigs)) {
        this.set(key, value as ConfigValue, ConfigScope.REMOTE);
      }
      
      this.emit('remote-sync-complete');
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.NETWORK_REQUEST,
        severity: IOErrorSeverity.WARNING,
        message: 'Failed to sync with remote configuration',
        details: error instanceof Error ? error.message : String(error),
        source: 'ConfigurationService',
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      throw error;
    }
  }
  
  /**
   * Load default configurations
   */
  private loadDefaultConfigs(): void {
    // Default configurations for the application
    const defaults: Record<string, ConfigValue> = {
      'app.name': 'Web3 Crypto Streaming Service',
      'app.version': '1.0.0',
      'theme.mode': 'light',
      'network.retryAttempts': 3,
      'cache.ttl': 1800,
      'streaming.chunkSize': 1048576,
      'auth.sessionDuration': 86400,
      'ipfs.gateway': 'https://ipfs.io/ipfs/',
      'api.timeout': 30000,
      'features.advancedAnalytics': false
    };
    
    // Set all defaults
    for (const [key, value] of Object.entries(defaults)) {
      this.set(key, value, ConfigScope.SYSTEM);
    }
  }
  
  /**
   * Load configurations from environment variables
   */
  private loadEnvironmentConfigs(): void {
    // In a browser environment, this would use a different approach
    if (typeof process === 'undefined' || !process.env) {
      return;
    }
    
    // Map environment variables to config keys
    const envMap: Record<string, string> = {
      'API_URL': 'api.url',
      'AUTH_SERVER_URL': 'auth.serverUrl',
      'IPFS_GATEWAY': 'ipfs.gateway',
      'API_TIMEOUT': 'api.timeout',
      'ENABLE_CLAUDE_3_7': 'features.claude37'
    };
    
    // Set configs from environment variables
    for (const [envVar, configKey] of Object.entries(envMap)) {
      if (process.env[envVar] !== undefined) {
        let value: ConfigValue = process.env[envVar] as string;
        
        // Try to parse numbers and booleans
        if (value === 'true' || value === 'false') {
          value = value === 'true';
        } else if (!isNaN(Number(value))) {
          value = Number(value);
        }
        
        this.set(configKey, value, ConfigScope.ENVIRONMENT);
      }
    }
  }
  
  /**
   * Load user configurations from storage
   */
  private loadUserConfigs(): void {
    try {
      // Skip if localStorage not available
      if (typeof localStorage === 'undefined') {
        return;
      }
      
      const storedConfigs = localStorage.getItem('user_configs');
      
      if (!storedConfigs) {
        return;
      }
      
      const userConfigs = JSON.parse(storedConfigs);
      
      // Set all user configs
      for (const [key, value] of Object.entries(userConfigs)) {
        this.set(key, value as ConfigValue, ConfigScope.USER);
      }
    } catch (error) {
      console.error('Failed to load user configs:', error);
    }
  }
  
  /**
   * Save user configurations to storage
   */
  private saveUserConfigs(): void {
    try {
      // Skip if localStorage not available
      if (typeof localStorage === 'undefined') {
        return;
      }
      
      // Collect all user configs
      const userConfigs: Record<string, ConfigValue> = {};
      
      for (const [key, entry] of this.configs.entries()) {
        if (entry.scope === ConfigScope.USER) {
          userConfigs[key] = entry.value;
        }
      }
      
      // Save to local storage
      localStorage.setItem('user_configs', JSON.stringify(userConfigs));
    } catch (error) {
      console.error('Failed to save user configs:', error);
    }
  }
  
  /**
   * Get the level for a scope
   */
  private getLevelForScope(scope: ConfigScope): ConfigLevel {
    switch (scope) {
      case ConfigScope.SYSTEM:
        return ConfigLevel.DEFAULT;
      case ConfigScope.FEATURE:
        return ConfigLevel.REMOTE;
      case ConfigScope.USER:
        return ConfigLevel.USER;
      case ConfigScope.SESSION:
        return ConfigLevel.OVERRIDE;
      default:
        return ConfigLevel.DEFAULT;
    }
  }
  
  /**
   * Get all configurations
   */
  public getAllConfigs(): Record<string, ConfigValue> {
    const result: Record<string, ConfigValue> = {};
    
    for (const [key, entry] of this.configs.entries()) {
      result[key] = entry.value;
    }
    
    return result;
  }
}

export const configurationService = ConfigurationService.getInstance();
export default configurationService;
