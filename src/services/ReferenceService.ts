/**
 * Reference Service
 * Manages references between content, creators, and blockchain entities
 */

import { EventEmitter } from 'events';

export enum ReferenceType {
  CONTENT = 'content',         // Reference to another content item
  CREATOR = 'creator',         // Reference to a creator/user
  EXTERNAL_URL = 'external_url', // Reference to external website
  CONTRACT = 'contract',       // Reference to smart contract
  TRANSACTION = 'transaction', // Reference to blockchain transaction
  NFT = 'nft',                 // Reference to an NFT
  CITATION = 'citation',       // Academic citation
  STREAM = 'stream'            // Reference to a stream
}

export interface Reference {
  id: string;
  type: ReferenceType;
  sourceId: string;            // ID of the content containing the reference
  sourceType: 'content' | 'stream' | 'comment';
  targetId: string;            // ID of the referenced entity
  targetUrl?: string;          // URL for external references
  label?: string;              // Optional label/anchor text
  timestamp: number;           // When the reference was created
  position?: number;           // Position in the source content (character index)
  metadata?: Record<string, any>; // Additional metadata
  verified: boolean;           // Whether the reference has been verified
}

export interface ReferenceFilter {
  sourceId?: string;
  targetId?: string;
  type?: ReferenceType | ReferenceType[];
  verified?: boolean;
}

export interface ReferenceSummary {
  totalReferences: number;
  byType: Record<ReferenceType, number>;
  verified: number;
  unverified: number;
}

export class ReferenceService extends EventEmitter {
  private references: Map<string, Reference> = new Map();

  constructor() {
    super();
    this.loadPersistedReferences();
  }

  /**
   * Add a new reference
   */
  public addReference(reference: Omit<Reference, 'id' | 'timestamp' | 'verified'>): Reference {
    const id = this.generateReferenceId();
    const now = Date.now();

    const newReference: Reference = {
      ...reference,
      id,
      timestamp: now,
      verified: false // References start as unverified
    };

    this.references.set(id, newReference);
    this.persistReferences();
    this.emit('reference:added', newReference);

    // Schedule verification if appropriate
    this.scheduleVerification(newReference);

    return newReference;
  }

  /**
   * Get a reference by ID
   */
  public getReference(id: string): Reference | undefined {
    return this.references.get(id);
  }

  /**
   * Find references by filter criteria
   */
  public findReferences(filter: ReferenceFilter = {}): Reference[] {
    let results = Array.from(this.references.values());

    if (filter.sourceId) {
      results = results.filter(ref => ref.sourceId === filter.sourceId);
    }

    if (filter.targetId) {
      results = results.filter(ref => ref.targetId === filter.targetId);
    }

    if (filter.type) {
      if (Array.isArray(filter.type)) {
        results = results.filter(ref => filter.type!.includes(ref.type));
      } else {
        results = results.filter(ref => ref.type === filter.type);
      }
    }

    if (filter.verified !== undefined) {
      results = results.filter(ref => ref.verified === filter.verified);
    }

    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get references for content
   */
  public getContentReferences(contentId: string): Reference[] {
    return this.findReferences({
      sourceId: contentId,
      sourceType: 'content'
    });
  }

  /**
   * Get references for a stream
   */
  public getStreamReferences(streamId: string): Reference[] {
    return this.findReferences({
      sourceId: streamId,
      sourceType: 'stream'
    });
  }

  /**
   * Get backlinks (references to this entity)
   */
  public getBacklinks(entityId: string): Reference[] {
    return this.findReferences({
      targetId: entityId
    });
  }

  /**
   * Update reference verification status
   */
  public setReferenceVerified(id: string, verified: boolean, metadata?: Record<string, any>): Reference | undefined {
    const reference = this.references.get(id);
    
    if (!reference) {
      return undefined;
    }

    const updatedReference: Reference = {
      ...reference,
      verified,
      metadata: {
        ...reference.metadata,
        ...metadata,
        verifiedAt: verified ? Date.now() : undefined
      }
    };

    this.references.set(id, updatedReference);
    this.persistReferences();
    
    this.emit('reference:updated', updatedReference);
    return updatedReference;
  }

  /**
   * Delete a reference
   */
  public deleteReference(id: string): boolean {
    const result = this.references.delete(id);
    
    if (result) {
      this.persistReferences();
      this.emit('reference:deleted', id);
    }
    
    return result;
  }

  /**
   * Get summary statistics for references
   */
  public getReferenceSummary(filter: ReferenceFilter = {}): ReferenceSummary {
    const references = this.findReferences(filter);
    
    const summary: ReferenceSummary = {
      totalReferences: references.length,
      byType: Object.values(ReferenceType).reduce((acc, type) => {
        acc[type] = 0;
        return acc;
      }, {} as Record<ReferenceType, number>),
      verified: 0,
      unverified: 0
    };

    // Count references by type and verification status
    for (const ref of references) {
      summary.byType[ref.type]++;
      if (ref.verified) {
        summary.verified++;
      } else {
        summary.unverified++;
      }
    }

    return summary;
  }

  /**
   * Extract references from text content
   * This looks for patterns that match references in the content
   */
  public extractReferencesFromText(
    text: string,
    sourceId: string,
    sourceType: 'content' | 'stream' | 'comment'
  ): Reference[] {
    const extractedReferences: Reference[] = [];
    
    // Extract URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let match;
    
    while ((match = urlRegex.exec(text)) !== null) {
      const url = match[0];
      const position = match.index;
      
      extractedReferences.push(this.addReference({
        type: ReferenceType.EXTERNAL_URL,
        sourceId,
        sourceType,
        targetId: url,
        targetUrl: url,
        label: url,
        position,
        metadata: {
          extractedAutomatically: true,
          surroundingText: text.substring(Math.max(0, position - 20), Math.min(text.length, position + 50))
        }
      }));
    }
    
    // Extract contract references (0x format)
    const contractRegex = /\b(0x[a-fA-F0-9]{40})\b/g;
    
    while ((match = contractRegex.exec(text)) !== null) {
      const address = match[0];
      const position = match.index;
      
      extractedReferences.push(this.addReference({
        type: ReferenceType.CONTRACT,
        sourceId,
        sourceType,
        targetId: address,
        position,
        metadata: {
          extractedAutomatically: true,
          surroundingText: text.substring(Math.max(0, position - 20), Math.min(text.length, position + 50))
        }
      }));
    }
    
    // Extract transaction hashes
    const txRegex = /\b(0x[a-fA-F0-9]{64})\b/g;
    
    while ((match = txRegex.exec(text)) !== null) {
      const txHash = match[0];
      const position = match.index;
      
      extractedReferences.push(this.addReference({
        type: ReferenceType.TRANSACTION,
        sourceId,
        sourceType,
        targetId: txHash,
        position,
        metadata: {
          extractedAutomatically: true,
          surroundingText: text.substring(Math.max(0, position - 20), Math.min(text.length, position + 50))
        }
      }));
    }
    
    return extractedReferences;
  }

  /**
   * Schedule verification of a reference
   * @private
   */
  private scheduleVerification(reference: Reference): void {
    // For now, just log that we'd schedule verification
    console.log(`Scheduling verification for reference ${reference.id} of type ${reference.type}`);
    
    // In a real implementation, this would queue a background task or call
    // different verification methods based on reference type
    
    // For example:
    // setTimeout(() => this.verifyReference(reference.id), 100);
  }

  /**
   * Save references to localStorage
   * @private
   */
  private persistReferences(): void {
    try {
      const serialized = JSON.stringify(Array.from(this.references.entries()));
      localStorage.setItem('reference_service_data', serialized);
    } catch (error) {
      console.error('Failed to persist references:', error);
    }
  }

  /**
   * Load references from localStorage
   * @private
   */
  private loadPersistedReferences(): void {
    try {
      const serialized = localStorage.getItem('reference_service_data');
      
      if (serialized) {
        const entries: [string, Reference][] = JSON.parse(serialized);
        this.references = new Map(entries);
      }
    } catch (error) {
      console.error('Failed to load persisted references:', error);
    }
  }

  /**
   * Generate a unique ID for a reference
   * @private
   */
  private generateReferenceId(): string {
    return 'ref_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
  }
}

// Create singleton instance
export const referenceService = new ReferenceService();
export default referenceService;
