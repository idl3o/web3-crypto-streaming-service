import { EventEmitter } from 'events';
import { ioErrorService, IOErrorType, IOErrorSeverity } from '../IOErrorService';

export interface SonosDevice {
  id: string;
  name: string;
  ipAddress: string;
  model: string;
  zone: string;
  isConnected: boolean;
}

export interface SonosStreamOptions {
  deviceId: string;
  contentUrl: string;
  contentType: string;
  title?: string;
  artist?: string;
  albumArt?: string;
  volume?: number;
  crossfade?: boolean;
}

/**
 * SonosTarget streaming service
 * Provides functionality to discover and stream content to Sonos devices
 */
export class SonosTarget extends EventEmitter {
  private static instance: SonosTarget;
  private availableDevices: Map<string, SonosDevice> = new Map();
  private activeStreams: Map<string, SonosStreamOptions> = new Map();
  private isInitialized = false;
  private scanInProgress = false;
  private deviceListeners: Map<string, Function> = new Map();

  private constructor() {
    super();
    
    // Set maximum listeners to avoid memory leak warnings with many devices
    this.setMaxListeners(50);
  }

  /**
   * Get singleton instance of SonosTarget
   */
  public static getInstance(): SonosTarget {
    if (!SonosTarget.instance) {
      SonosTarget.instance = new SonosTarget();
    }
    return SonosTarget.instance;
  }

  /**
   * Initialize the Sonos target system
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      console.log('Initializing Sonos target system');
      
      // Run device discovery
      await this.discoverDevices();
      
      // Set up event listeners for device status changes
      this.setupDeviceListeners();
      
      this.isInitialized = true;
      this.emit('initialized');
      return true;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SONA_STREAMING,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to initialize Sonos target system',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      return false;
    }
  }

  /**
   * Discover available Sonos devices on the network
   */
  public async discoverDevices(): Promise<SonosDevice[]> {
    if (this.scanInProgress) {
      return Array.from(this.availableDevices.values());
    }
    
    this.scanInProgress = true;
    this.emit('discovery-started');
    
    try {
      // In a real implementation, we would use the Sonos API or a library like 'sonos'
      // For now, we'll simulate device discovery
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate finding devices
      const mockDevices: SonosDevice[] = [
        {
          id: 'sonos-living-room',
          name: 'Living Room',
          ipAddress: '192.168.1.101',
          model: 'Sonos One',
          zone: 'Living Room',
          isConnected: true
        },
        {
          id: 'sonos-kitchen',
          name: 'Kitchen',
          ipAddress: '192.168.1.102',
          model: 'Sonos Move',
          zone: 'Kitchen',
          isConnected: true
        },
        {
          id: 'sonos-bedroom',
          name: 'Bedroom',
          ipAddress: '192.168.1.103',
          model: 'Sonos Beam',
          zone: 'Bedroom',
          isConnected: true
        }
      ];
      
      // Store the discovered devices
      mockDevices.forEach(device => {
        this.availableDevices.set(device.id, device);
      });
      
      this.emit('discovery-complete', mockDevices);
      return mockDevices;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SONA_STREAMING,
        severity: IOErrorSeverity.WARNING,
        message: 'Error discovering Sonos devices',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      this.emit('discovery-error', error);
      return [];
    } finally {
      this.scanInProgress = false;
    }
  }

  /**
   * Get all available Sonos devices
   */
  public getAvailableDevices(): SonosDevice[] {
    return Array.from(this.availableDevices.values());
  }

  /**
   * Get a specific Sonos device by ID
   * @param deviceId Device ID
   */
  public getDevice(deviceId: string): SonosDevice | undefined {
    return this.availableDevices.get(deviceId);
  }

  /**
   * Start streaming to a Sonos device
   * @param options Stream options
   */
  public async startStream(options: SonosStreamOptions): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const device = this.availableDevices.get(options.deviceId);
    if (!device) {
      throw new Error(`Sonos device with ID ${options.deviceId} not found`);
    }
    
    if (!device.isConnected) {
      throw new Error(`Sonos device ${device.name} is not connected`);
    }
    
    try {
      console.log(`Starting stream to Sonos device: ${device.name}`);
      
      // Generate a unique stream ID
      const streamId = `sonos-stream-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // In a real implementation, we would use the Sonos API to start playing content
      // For now, we'll simulate the streaming process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Store the active stream
      this.activeStreams.set(streamId, options);
      
      // Emit events
      this.emit('stream-started', { streamId, deviceId: device.id, deviceName: device.name });
      
      return streamId;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SONA_STREAMING,
        severity: IOErrorSeverity.ERROR,
        message: `Failed to start stream to Sonos device ${device.name}`,
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      throw error;
    }
  }

  /**
   * Stop an active stream
   * @param streamId Stream ID
   */
  public async stopStream(streamId: string): Promise<boolean> {
    const streamOptions = this.activeStreams.get(streamId);
    if (!streamOptions) {
      return false;
    }
    
    const device = this.availableDevices.get(streamOptions.deviceId);
    if (!device) {
      return false;
    }
    
    try {
      console.log(`Stopping stream to Sonos device: ${device.name}`);
      
      // In a real implementation, we would use the Sonos API to stop playing
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Remove the active stream
      this.activeStreams.delete(streamId);
      
      // Emit events
      this.emit('stream-stopped', { streamId, deviceId: device.id, deviceName: device.name });
      
      return true;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SONA_STREAMING,
        severity: IOErrorSeverity.WARNING,
        message: `Error stopping stream to Sonos device ${device.name}`,
        details: error instanceof Error ? error.message : String(error),
        retryable: false,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return false;
    }
  }

  /**
   * Adjust the volume of a Sonos device
   * @param deviceId Device ID
   * @param volume Volume level (0-100)
   */
  public async setVolume(deviceId: string, volume: number): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const device = this.availableDevices.get(deviceId);
    if (!device) {
      throw new Error(`Sonos device with ID ${deviceId} not found`);
    }
    
    try {
      console.log(`Setting volume on Sonos device ${device.name} to ${volume}%`);
      
      // In a real implementation, we would use the Sonos API to set the volume
      
      // Emit events
      this.emit('volume-changed', { deviceId: device.id, deviceName: device.name, volume });
      
      return true;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SONA_STREAMING,
        severity: IOErrorSeverity.WARNING,
        message: `Failed to set volume on Sonos device ${device.name}`,
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return false;
    }
  }

  /**
   * Group Sonos speakers for synchronized playback
   * @param masterDeviceId The master device ID
   * @param slaveDeviceIds Array of slave device IDs to join to the group
   */
  public async groupSpeakers(masterDeviceId: string, slaveDeviceIds: string[]): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const masterDevice = this.availableDevices.get(masterDeviceId);
    if (!masterDevice) {
      throw new Error(`Sonos device with ID ${masterDeviceId} not found`);
    }
    
    try {
      console.log(`Grouping Sonos speakers with master: ${masterDevice.name}`);
      
      // In a real implementation, we would use the Sonos API to group speakers
      
      // Emit events
      this.emit('speakers-grouped', { 
        masterId: masterDeviceId,
        masterName: masterDevice.name,
        slaveIds: slaveDeviceIds
      });
      
      return true;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SONA_STREAMING,
        severity: IOErrorSeverity.WARNING,
        message: `Failed to group Sonos speakers with master ${masterDevice.name}`,
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return false;
    }
  }

  /**
   * Setup device listeners
   */
  private setupDeviceListeners(): void {
    // In a real implementation, we would set up listeners for device status changes
  }
}

// Export singleton instance
export const sonosTarget = SonosTarget.getInstance();
export default sonosTarget;
