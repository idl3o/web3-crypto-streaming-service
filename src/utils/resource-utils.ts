import { ResourceType, ResourcePriority, resourceController } from '../services/ResourceControllerService';

/**
 * Calculate bandwidth required for a video stream
 * @param resolution Video resolution (e.g., "1080p", "720p", "480p")
 * @param fps Frames per second
 * @param bitDepth Bit depth (default: 8)
 * @param compression Compression factor (lower is better compression)
 */
export function calculateVideoBandwidth(
  resolution: string,
  fps: number,
  bitDepth: number = 8,
  compression: number = 0.1
): number {
  const resolutionMap: Record<string, { width: number; height: number }> = {
    '2160p': { width: 3840, height: 2160 },
    '1440p': { width: 2560, height: 1440 },
    '1080p': { width: 1920, height: 1080 },
    '720p': { width: 1280, height: 720 },
    '480p': { width: 854, height: 480 },
    '360p': { width: 640, height: 360 },
    '240p': { width: 426, height: 240 }
  };
  
  const resData = resolutionMap[resolution] || { width: 1280, height: 720 };
  
  // Calculate raw bit rate (width × height × bit depth × fps)
  const rawBitRate = resData.width * resData.height * bitDepth * fps;
  
  // Apply compression
  const compressedBitRate = rawBitRate * compression;
  
  // Convert to Mbps (divide by 1,000,000)
  return compressedBitRate / 1000000;
}

/**
 * Calculate storage required for a video
 * @param durationMinutes Duration in minutes
 * @param bitrateKbps Bitrate in Kbps
 */
export function calculateVideoStorage(durationMinutes: number, bitrateKbps: number): number {
  // Convert to bytes: bitrate (kbps) * duration (minutes) * 60 (seconds) / 8 (bits to bytes) / 1024^2 (to MB)
  const storageMB = (bitrateKbps * durationMinutes * 60) / 8 / 1024;
  return storageMB;
}

/**
 * Format a bandwidth value for display
 * @param bandwidthMbps Bandwidth in Mbps
 */
export function formatBandwidth(bandwidthMbps: number): string {
  if (bandwidthMbps < 1) {
    return `${(bandwidthMbps * 1000).toFixed(1)} Kbps`;
  } else if (bandwidthMbps > 1000) {
    return `${(bandwidthMbps / 1000).toFixed(2)} Gbps`;
  } else {
    return `${bandwidthMbps.toFixed(2)} Mbps`;
  }
}

/**
 * Format a storage size for display
 * @param storageMB Storage size in MB
 */
export function formatStorage(storageMB: number): string {
  if (storageMB < 1) {
    return `${(storageMB * 1024).toFixed(2)} KB`;
  } else if (storageMB >= 1024) {
    return `${(storageMB / 1024).toFixed(2)} GB`;
  } else {
    return `${storageMB.toFixed(2)} MB`;
  }
}

/**
 * Request resources for a streaming session
 * @param streamId Stream identifier
 * @param quality Stream quality (e.g., "high", "medium", "low")
 * @param durationMinutes Expected duration in minutes
 */
export async function requestStreamingResources(
  streamId: string,
  quality: 'high' | 'medium' | 'low',
  durationMinutes: number = 60
): Promise<{ success: boolean; allocations: string[] }> {
  try {
    // Calculate needed resources based on quality
    let bandwidthMbps = 0;
    let computeUnits = 0;
    let priority = ResourcePriority.MEDIUM;
    
    switch (quality) {
      case 'high':
        bandwidthMbps = 8;
        computeUnits = 10;
        priority = ResourcePriority.HIGH;
        break;
      case 'medium':
        bandwidthMbps = 4;
        computeUnits = 5;
        priority = ResourcePriority.MEDIUM;
        break;
      case 'low':
        bandwidthMbps = 2;
        computeUnits = 2;
        priority = ResourcePriority.LOW;
        break;
    }
    
    // Calculate expiration time
    const expiresAt = Date.now() + (durationMinutes * 60 * 1000);
    
    // Request bandwidth resources
    const bandwidthAllocation = await resourceController.requestResource({
      resourceType: ResourceType.BANDWIDTH,
      amount: bandwidthMbps,
      priority,
      allocatedTo: streamId,
      expiresAt
    });
    
    // Request compute resources
    const computeAllocation = await resourceController.requestResource({
      resourceType: ResourceType.COMPUTE,
      amount: computeUnits,
      priority,
      allocatedTo: streamId,
      expiresAt
    });
    
    // Check if both allocations were successful
    const success = 
      bandwidthAllocation.status === 'granted' && 
      computeAllocation.status === 'granted';
    
    return {
      success,
      allocations: [bandwidthAllocation.requestId, computeAllocation.requestId]
    };
  } catch (error) {
    console.error('Error requesting streaming resources:', error);
    return { success: false, allocations: [] };
  }
}

/**
 * Release all resources for a stream
 * @param streamId Stream identifier
 */
export function releaseStreamResources(streamId: string): boolean {
  try {
    const allocations = resourceController
      .getAllAllocations()
      .filter(allocation => allocation.allocatedTo === streamId);
    
    if (allocations.length === 0) {
      return false;
    }
    
    // Release all allocations for this stream
    for (const allocation of allocations) {
      resourceController.releaseResource(allocation.requestId);
    }
    
    return true;
  } catch (error) {
    console.error('Error releasing stream resources:', error);
    return false;
  }
}

/**
 * Get resource usage statistics
 */
export function getResourceUsageStats(): Record<string, { 
  used: number; 
  available: number; 
  percentage: number; 
  unit: string;
}> {
  const stats: Record<string, { 
    used: number; 
    available: number; 
    percentage: number; 
    unit: string;
  }> = {};
  
  // Get all resource types
  const resourceTypes = Object.values(ResourceType);
  
  for (const type of resourceTypes) {
    const pool = resourceController['resourcePools'].get(type);
    
    if (pool) {
      const usedCapacity = resourceController['calculateUsedCapacity'](type);
      const availableCapacity = pool.capacity - pool.reserved - usedCapacity;
      const percentage = resourceController.getPoolUsagePercentage(type);
      
      stats[type] = {
        used: usedCapacity,
        available: availableCapacity,
        percentage,
        unit: pool.unit
      };
    }
  }
  
  return stats;
}
