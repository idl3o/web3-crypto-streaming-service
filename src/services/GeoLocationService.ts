import { EventEmitter } from 'events';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';

/**
 * Geographic region definition
 */
export interface GeographicRegion {
  id: string;
  name: string;
  type: 'country' | 'state' | 'city' | 'custom';
  code?: string; // ISO country code, state code, etc.
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  radius?: number; // For circular regions (in km)
  polygon?: Array<{ latitude: number; longitude: number }>; // For custom polygons
  parentRegionId?: string; // For hierarchical regions
}

/**
 * Location check result
 */
export interface LocationCheckResult {
  isAllowed: boolean;
  matchedRegion?: GeographicRegion;
  timestamp: number;
}

/**
 * Content location restriction
 */
export interface ContentLocationRestriction {
  contentId: string;
  allowedRegions: string[]; // Region IDs
  deniedRegions: string[]; // Region IDs that override allowed regions
  enforceLevel: 'strict' | 'moderate' | 'relaxed';
}

/**
 * Service for handling location-based features
 */
export class GeoLocationService extends EventEmitter {
  private static instance: GeoLocationService;
  private regions = new Map<string, GeographicRegion>();
  private contentRestrictions = new Map<string, ContentLocationRestriction>();
  private initialized: boolean = false;
  private readonly DEFAULT_RADIUS_KM = 100; // Default radius in kilometers
  
  private constructor() {
    super();
    this.setMaxListeners(30);
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): GeoLocationService {
    if (!GeoLocationService.instance) {
      GeoLocationService.instance = new GeoLocationService();
    }
    return GeoLocationService.instance;
  }
  
  /**
   * Initialize the geo location service
   */
  public async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }
    
    try {
      // Load default regions
      await this.loadDefaultRegions();
      
      this.initialized = true;
      this.emit('initialized');
      return true;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.SYSTEM,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to initialize GeoLocationService',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return false;
    }
  }
  
  /**
   * Register a geographic region
   * @param region Region to register
   */
  public registerRegion(region: GeographicRegion): boolean {
    try {
      // Validate region
      this.validateRegion(region);
      
      // Store region
      this.regions.set(region.id, region);
      
      // Emit event
      this.emit('region-registered', { regionId: region.id });
      
      return true;
    } catch (error) {
      console.error('Error registering region:', error);
      return false;
    }
  }
  
  /**
   * Set content location restrictions
   * @param contentId Content identifier
   * @param restriction Location restriction
   */
  public setContentRestriction(
    contentId: string, 
    restriction: Omit<ContentLocationRestriction, 'contentId'>
  ): ContentLocationRestriction {
    const fullRestriction: ContentLocationRestriction = {
      contentId,
      ...restriction
    };
    
    this.contentRestrictions.set(contentId, fullRestriction);
    
    this.emit('restriction-set', { 
      contentId,
      restriction: fullRestriction
    });
    
    return fullRestriction;
  }
  
  /**
   * Check if a location is allowed for content
   * @param contentId Content identifier
   * @param latitude Latitude
   * @param longitude Longitude
   */
  public checkLocationAccess(
    contentId: string,
    latitude: number,
    longitude: number
  ): LocationCheckResult {
    // Get content restriction
    const restriction = this.contentRestrictions.get(contentId);
    
    // If no restriction, allow access
    if (!restriction) {
      return {
        isAllowed: true,
        timestamp: Date.now()
      };
    }
    
    // Check denied regions first (they take precedence)
    for (const regionId of restriction.deniedRegions) {
      const region = this.regions.get(regionId);
      
      if (region && this.isLocationInRegion(latitude, longitude, region)) {
        return {
          isAllowed: false,
          matchedRegion: region,
          timestamp: Date.now()
        };
      }
    }
    
    // If no allowed regions specified, allow access
    if (restriction.allowedRegions.length === 0) {
      return {
        isAllowed: true,
        timestamp: Date.now()
      };
    }
    
    // Check allowed regions
    for (const regionId of restriction.allowedRegions) {
      const region = this.regions.get(regionId);
      
      if (region && this.isLocationInRegion(latitude, longitude, region)) {
        return {
          isAllowed: true,
          matchedRegion: region,
          timestamp: Date.now()
        };
      }
    }
    
    // If we get here, location is not in any allowed region
    return {
      isAllowed: false,
      timestamp: Date.now()
    };
  }
  
  /**
   * Get all registered regions
   */
  public getAllRegions(): GeographicRegion[] {
    return Array.from(this.regions.values());
  }
  
  /**
   * Get content restriction
   * @param contentId Content identifier
   */
  public getContentRestriction(contentId: string): ContentLocationRestriction | undefined {
    return this.contentRestrictions.get(contentId);
  }
  
  /**
   * Get regions near a location
   * @param latitude Latitude
   * @param longitude Longitude
   * @param radiusKm Search radius in kilometers
   * @param limit Maximum number of regions to return
   */
  public getNearbyRegions(
    latitude: number,
    longitude: number,
    radiusKm: number = this.DEFAULT_RADIUS_KM,
    limit: number = 10
  ): GeographicRegion[] {
    const regions = Array.from(this.regions.values())
      .filter(region => {
        // Only consider regions with coordinates
        if (!region.coordinates) return false;
        
        // Calculate distance
        const distance = this.calculateDistance(
          latitude,
          longitude,
          region.coordinates.latitude,
          region.coordinates.longitude
        );
        
        return distance <= radiusKm;
      })
      .sort((a, b) => {
        // Sort by distance
        if (!a.coordinates || !b.coordinates) return 0;
        
        const distanceA = this.calculateDistance(
          latitude,
          longitude,
          a.coordinates.latitude,
          a.coordinates.longitude
        );
        
        const distanceB = this.calculateDistance(
          latitude,
          longitude,
          b.coordinates.latitude,
          b.coordinates.longitude
        );
        
        return distanceA - distanceB;
      });
    
    return regions.slice(0, limit);
  }
  
  /**
   * Check if location is within a region
   * @param latitude Latitude
   * @param longitude Longitude
   * @param region Geographic region
   */
  private isLocationInRegion(
    latitude: number,
    longitude: number,
    region: GeographicRegion
  ): boolean {
    // For circular regions
    if (region.coordinates && region.radius) {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        region.coordinates.latitude,
        region.coordinates.longitude
      );
      
      return distance <= region.radius;
    }
    
    // For polygon regions
    if (region.polygon && region.polygon.length > 2) {
      return this.isPointInPolygon(latitude, longitude, region.polygon);
    }
    
    // For hierarchical regions, check parent
    if (region.parentRegionId) {
      const parentRegion = this.regions.get(region.parentRegionId);
      if (parentRegion) {
        return this.isLocationInRegion(latitude, longitude, parentRegion);
      }
    }
    
    // Default case
    return false;
  }
  
  /**
   * Calculate distance between two points using Haversine formula
   * @param lat1 Latitude of point 1
   * @param lon1 Longitude of point 1
   * @param lat2 Latitude of point 2
   * @param lon2 Longitude of point 2
   * @returns Distance in kilometers
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }
  
  /**
   * Convert degrees to radians
   * @param degrees Angle in degrees
   */
  private toRadians(degrees: number): number {
    return degrees * Math.PI / 180;
  }
  
  /**
   * Check if a point is inside a polygon using ray-casting algorithm
   * @param latitude Latitude of point
   * @param longitude Longitude of point
   * @param polygon Array of polygon vertices
   */
  private isPointInPolygon(
    latitude: number,
    longitude: number,
    polygon: Array<{ latitude: number; longitude: number }>
  ): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].latitude;
      const yi = polygon[i].longitude;
      const xj = polygon[j].latitude;
      const yj = polygon[j].longitude;
      
      const intersect = ((yi > longitude) !== (yj > longitude)) &&
        (latitude < (xj - xi) * (longitude - yi) / (yj - yi) + xi);
      
      if (intersect) inside = !inside;
    }
    
    return inside;
  }
  
  /**
   * Validate a geographic region
   * @param region Region to validate
   */
  private validateRegion(region: GeographicRegion): void {
    if (!region.id) {
      throw new Error('Region ID is required');
    }
    
    if (!region.name) {
      throw new Error('Region name is required');
    }
    
    if (!region.type) {
      throw new Error('Region type is required');
    }
    
    // Validate coordinates if provided
    if (region.coordinates) {
      if (region.coordinates.latitude < -90 || region.coordinates.latitude > 90) {
        throw new Error('Invalid latitude: must be between -90 and 90');
      }
      
      if (region.coordinates.longitude < -180 || region.coordinates.longitude > 180) {
        throw new Error('Invalid longitude: must be between -180 and 180');
      }
    }
    
    // Validate radius if provided
    if (region.radius !== undefined && region.radius <= 0) {
      throw new Error('Radius must be positive');
    }
    
    // Validate polygon if provided
    if (region.polygon) {
      if (region.polygon.length < 3) {
        throw new Error('Polygon must have at least 3 points');
      }
      
      for (const point of region.polygon) {
        if (point.latitude < -90 || point.latitude > 90) {
          throw new Error('Invalid polygon latitude: must be between -90 and 90');
        }
        
        if (point.longitude < -180 || point.longitude > 180) {
          throw new Error('Invalid polygon longitude: must be between -180 and 180');
        }
      }
    }
    
    // Validate parent region ID if provided
    if (region.parentRegionId && !this.regions.has(region.parentRegionId)) {
      throw new Error(`Parent region ${region.parentRegionId} does not exist`);
    }
  }
  
  /**
   * Load default regions
   */
  private async loadDefaultRegions(): Promise<void> {
    // Add some example regions
    this.registerRegion({
      id: 'uk',
      name: 'United Kingdom',
      type: 'country',
      code: 'GB',
      coordinates: {
        latitude: 55.378051,
        longitude: -3.435973
      },
      radius: 500
    });
    
    // North Devon Area
    this.registerRegion({
      id: 'north-devon',
      name: 'North Devon',
      type: 'custom',
      parentRegionId: 'uk',
      coordinates: {
        latitude: 51.1630157,
        longitude: -4.0806446
      },
      radius: 30
    });
    
    // Add United States
    this.registerRegion({
      id: 'us',
      name: 'United States',
      type: 'country',
      code: 'US',
      coordinates: {
        latitude: 37.09024,
        longitude: -95.712891
      },
      radius: 2500
    });
    
    // Add Australia
    this.registerRegion({
      id: 'au',
      name: 'Australia',
      type: 'country',
      code: 'AU',
      coordinates: {
        latitude: -25.274398,
        longitude: 133.775136
      },
      radius: 2000
    });
    
    // Add European Union as a custom region
    this.registerRegion({
      id: 'eu',
      name: 'European Union',
      type: 'custom',
      coordinates: {
        latitude: 50.8503,
        longitude: 4.3517
      },
      radius: 1500
    });
  }
}

// Export singleton instance
export const geoLocationService = GeoLocationService.getInstance();
export default geoLocationService;
