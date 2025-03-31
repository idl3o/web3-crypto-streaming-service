import { EventEmitter } from 'events';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';
import { sonaStreamingService } from './SonaStreamingService';
import { resourceController, ResourcePriority } from './ResourceControllerService';

/**
 * Content categories for Dionysian content
 */
export enum ContentCategory {
  PHILOSOPHY = 'philosophy',
  FUTURE = 'future',
  TECHNOLOGY = 'technology',
  ECONOMICS = 'economics',
  IDENTITY = 'identity',
  MIXED = 'mixed'
}

/**
 * Playback mode options
 */
export enum PlaybackMode {
  SEQUENTIAL = 'sequential',
  RANDOM = 'random',
  ADAPTIVE = 'adaptive'  // Adapts to user's interests
}

/**
 * Audio content item
 */
export interface AudioContent {
  id: string;
  title: string;
  description: string;
  category: ContentCategory;
  duration: number;  // In seconds
  filePath: string;
  createdAt: number;
  tags: string[];
  metrics?: {
    plays: number;
    completions: number;
    averagePlaytime: number;
  };
}

/**
 * Playback session
 */
export interface PlaybackSession {
  sessionId: string;
  userId?: string;
  currentContent?: AudioContent;
  queue: string[];  // Content IDs
  startedAt: number;
  mode: PlaybackMode;
  category?: ContentCategory;
  isActive: boolean;
  listenedTo: Record<string, number>;  // Content ID -> seconds listened
}

/**
 * Dionysian Agent Streaming Service
 * Provides philosophical and futuristic audio content
 */
export class DionysiusStreamingService extends EventEmitter {
  private static instance: DionysiusStreamingService;
  private initialized: boolean = false;
  private audioContent = new Map<string, AudioContent>();
  private activeSessions = new Map<string, PlaybackSession>();
  private contentBasePath: string = '/assets/audio/dionysian-agent/';
  
  private constructor() {
    super();
    this.setMaxListeners(30);
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): DionysiusStreamingService {
    if (!DionysiusStreamingService.instance) {
      DionysiusStreamingService.instance = new DionysiusStreamingService();
    }
    return DionysiusStreamingService.instance;
  }
  
  /**
   * Initialize the Dionysius streaming service
   * @param contentPath Optional custom path to content
   */
  public async initialize(contentPath?: string): Promise<boolean> {
    if (this.initialized) {
      return true;
    }
    
    try {
      // Set content path if provided
      if (contentPath) {
        this.contentBasePath = contentPath;
      }
      
      // Load audio content metadata
      await this.loadContentMetadata();
      
      this.initialized = true;
      this.emit('initialized', { 
        contentCount: this.audioContent.size,
        basePath: this.contentBasePath
      });
      
      return true;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.STREAMING,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to initialize Dionysius streaming service',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return false;
    }
  }
  
  /**
   * Create a new playback session
   * @param userId Optional user identifier
   * @param category Optional content category filter
   * @param mode Playback mode
   */
  public createSession(
    userId?: string,
    category?: ContentCategory,
    mode: PlaybackMode = PlaybackMode.SEQUENTIAL
  ): PlaybackSession {
    if (!this.initialized) {
      throw new Error('Dionysius streaming service not initialized');
    }
    
    // Generate session ID
    const sessionId = `dionysius-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Create queue based on category
    let contentIds: string[] = [];
    
    if (category) {
      contentIds = Array.from(this.audioContent.values())
        .filter(content => content.category === category)
        .map(content => content.id);
    } else {
      contentIds = Array.from(this.audioContent.keys());
    }
    
    // Randomize if random mode
    if (mode === PlaybackMode.RANDOM) {
      contentIds = this.shuffleArray(contentIds);
    } else if (mode === PlaybackMode.ADAPTIVE && userId) {
      contentIds = this.prioritizeForUser(contentIds, userId);
    }
    
    // Create session
    const session: PlaybackSession = {
      sessionId,
      userId,
      queue: contentIds,
      startedAt: Date.now(),
      mode,
      category,
      isActive: true,
      listenedTo: {}
    };
    
    // Store session
    this.activeSessions.set(sessionId, session);
    
    // Emit event
    this.emit('session-created', { sessionId, userId });
    
    return session;
  }
  
  /**
   * Start playback of content
   * @param sessionId Session identifier
   * @param contentId Optional specific content to play (defaults to first in queue)
   */
  public async startPlayback(
    sessionId: string,
    contentId?: string
  ): Promise<AudioContent | null> {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    
    if (!session.isActive) {
      throw new Error(`Session is not active: ${sessionId}`);
    }
    
    try {
      // Determine which content to play
      let content: AudioContent | undefined;
      
      if (contentId) {
        // Specific content requested
        content = this.audioContent.get(contentId);
        if (!content) {
          throw new Error(`Content not found: ${contentId}`);
        }
        
        // Remove from queue if present
        session.queue = session.queue.filter(id => id !== contentId);
      } else if (session.queue.length > 0) {
        // Take first from queue
        const nextContentId = session.queue.shift();
        content = nextContentId ? this.audioContent.get(nextContentId) : undefined;
      }
      
      if (!content) {
        return null; // No content available
      }
      
      // Update session
      session.currentContent = content;
      this.activeSessions.set(sessionId, session);
      
      // Request resources
      await resourceController.requestResource({
        resourceType: 'bandwidth',
        amount: 0.5, // 0.5 Mbps for audio
        priority: ResourcePriority.LOW,
        allocatedTo: `dionysius-${sessionId}`,
        expiresAt: Date.now() + (content.duration * 1000) + 30000 // Duration + 30 second buffer
      });
      
      // Update metrics
      content.metrics = content.metrics || {
        plays: 0,
        completions: 0,
        averagePlaytime: 0
      };
      
      content.metrics.plays++;
      this.audioContent.set(content.id, content);
      
      // Emit event
      this.emit('playback-started', {
        sessionId,
        contentId: content.id,
        title: content.title
      });
      
      return content;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.STREAMING,
        severity: IOErrorSeverity.WARNING,
        message: 'Failed to start Dionysius content playback',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return null;
    }
  }
  
  /**
   * Pause current playback
   * @param sessionId Session identifier
   * @param position Current playback position in seconds
   */
  public pausePlayback(sessionId: string, position: number): boolean {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || !session.isActive || !session.currentContent) {
      return false;
    }
    
    try {
      // Track listened duration
      const contentId = session.currentContent.id;
      session.listenedTo[contentId] = (session.listenedTo[contentId] || 0) + position;
      
      // Emit event
      this.emit('playback-paused', { 
        sessionId, 
        contentId,
        position
      });
      
      return true;
    } catch (error) {
      console.error('Error pausing playback:', error);
      return false;
    }
  }
  
  /**
   * Complete playback of current content
   * @param sessionId Session identifier
   */
  public completePlayback(sessionId: string): AudioContent | null {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || !session.isActive || !session.currentContent) {
      return null;
    }
    
    try {
      const completedContent = session.currentContent;
      
      // Update metrics
      if (completedContent.metrics) {
        completedContent.metrics.completions++;
        this.audioContent.set(completedContent.id, completedContent);
      }
      
      // Track listened duration - consider it fully listened
      session.listenedTo[completedContent.id] = completedContent.duration;
      
      // Clear current content
      session.currentContent = undefined;
      this.activeSessions.set(sessionId, session);
      
      // Release resources
      resourceController.releaseResource(`dionysius-${sessionId}`);
      
      // Emit event
      this.emit('playback-completed', { 
        sessionId, 
        contentId: completedContent.id
      });
      
      return completedContent;
    } catch (error) {
      console.error('Error completing playback:', error);
      return null;
    }
  }
  
  /**
   * Get next content in queue
   * @param sessionId Session identifier
   */
  public getNextContent(sessionId: string): AudioContent | null {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || !session.isActive || session.queue.length === 0) {
      return null;
    }
    
    const nextContentId = session.queue[0];
    return this.audioContent.get(nextContentId) || null;
  }
  
  /**
   * Skip to next content in queue
   * @param sessionId Session identifier
   */
  public async skipToNext(sessionId: string): Promise<AudioContent | null> {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || !session.isActive || session.queue.length === 0) {
      return null;
    }
    
    try {
      // Complete current playback if any
      if (session.currentContent) {
        this.completePlayback(sessionId);
      }
      
      // Start next content
      return this.startPlayback(sessionId);
    } catch (error) {
      console.error('Error skipping to next content:', error);
      return null;
    }
  }
  
  /**
   * End a playback session
   * @param sessionId Session identifier
   */
  public endSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) {
      return false;
    }
    
    try {
      // Complete current playback if any
      if (session.currentContent) {
        this.completePlayback(sessionId);
      }
      
      // Mark session as inactive
      session.isActive = false;
      this.activeSessions.set(sessionId, session);
      
      // Emit event
      this.emit('session-ended', { 
        sessionId,
        duration: Date.now() - session.startedAt
      });
      
      return true;
    } catch (error) {
      console.error('Error ending session:', error);
      return false;
    }
  }
  
  /**
   * Get all content metadata
   */
  public getAllContent(): AudioContent[] {
    return Array.from(this.audioContent.values());
  }
  
  /**
   * Get content by category
   * @param category Content category
   */
  public getContentByCategory(category: ContentCategory): AudioContent[] {
    return Array.from(this.audioContent.values())
      .filter(content => content.category === category);
  }
  
  /**
   * Get content by ID
   * @param contentId Content identifier
   */
  public getContent(contentId: string): AudioContent | null {
    return this.audioContent.get(contentId) || null;
  }
  
  /**
   * Get active session info
   * @param sessionId Session identifier
   */
  public getSessionInfo(sessionId: string): PlaybackSession | null {
    return this.activeSessions.get(sessionId) || null;
  }
  
  /**
   * Get sessions for a user
   * @param userId User identifier
   */
  public getUserSessions(userId: string): PlaybackSession[] {
    return Array.from(this.activeSessions.values())
      .filter(session => session.userId === userId);
  }
  
  /**
   * Load content metadata
   */
  private async loadContentMetadata(): Promise<void> {
    // In a real implementation, this would load from files or a database
    // For this demonstration, we'll create sample content
    
    const sampleContent: AudioContent[] = [
      {
        id: 'introduction',
        title: 'Introduction to Digital Sovereignty',
        description: 'An exploration of digital sovereignty concepts in the Web3 era',
        category: ContentCategory.IDENTITY,
        duration: 420, // 7 minutes
        filePath: `${this.contentBasePath}introduction.mp3`,
        createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
        tags: ['sovereignty', 'web3', 'identity', 'introduction'],
        metrics: {
          plays: 245,
          completions: 187,
          averagePlaytime: 380
        }
      },
      {
        id: 'blockchain-philosophy',
        title: 'Philosophical Implications of Blockchain',
        description: 'A deep dive into the philosophical underpinnings of blockchain technology',
        category: ContentCategory.PHILOSOPHY,
        duration: 900, // 15 minutes
        filePath: `${this.contentBasePath}blockchain-philosophy.mp3`,
        createdAt: Date.now() - 25 * 24 * 60 * 60 * 1000, // 25 days ago
        tags: ['blockchain', 'philosophy', 'ethics', 'deep-dive'],
        metrics: {
          plays: 312,
          completions: 256,
          averagePlaytime: 820
        }
      },
      {
        id: 'future-ownership',
        title: 'The Future of Digital Ownership',
        description: 'Examining how blockchain transforms concepts of ownership and property',
        category: ContentCategory.FUTURE,
        duration: 780, // 13 minutes
        filePath: `${this.contentBasePath}future-of-ownership.mp3`,
        createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000, // 15 days ago
        tags: ['ownership', 'nft', 'property', 'future'],
        metrics: {
          plays: 189,
          completions: 142,
          averagePlaytime: 650
        }
      },
      {
        id: 'decentralized-identity',
        title: 'Decentralized Identity in the Web3 Era',
        description: 'How self-sovereign identity is changing personal data management',
        category: ContentCategory.IDENTITY,
        duration: 660, // 11 minutes
        filePath: `${this.contentBasePath}decentralized-identity.mp3`,
        createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 days ago
        tags: ['identity', 'self-sovereign', 'privacy', 'data'],
        metrics: {
          plays: 276,
          completions: 203,
          averagePlaytime: 590
        }
      },
      {
        id: 'crypto-economics',
        title: 'Fundamentals of Crypto Economics',
        description: 'Understanding the economic models behind cryptocurrency ecosystems',
        category: ContentCategory.ECONOMICS,
        duration: 840, // 14 minutes
        filePath: `${this.contentBasePath}crypto-economics.mp3`,
        createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
        tags: ['economics', 'tokenomics', 'incentives', 'game-theory'],
        metrics: {
          plays: 198,
          completions: 166,
          averagePlaytime: 780
        }
      }
    ];
    
    // Store content
    for (const content of sampleContent) {
      this.audioContent.set(content.id, content);
    }
  }
  
  /**
   * Shuffle array (Fisher-Yates algorithm)
   * @param array Array to shuffle
   */
  private shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    let currentIndex = newArray.length;
    let temporaryValue, randomIndex;
    
    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
      
      temporaryValue = newArray[currentIndex];
      newArray[currentIndex] = newArray[randomIndex];
      newArray[randomIndex] = temporaryValue;
    }
    
    return newArray;
  }
  
  /**
   * Prioritize content for a specific user
   * @param contentIds Content IDs to prioritize
   * @param userId User identifier
   */
  private prioritizeForUser(contentIds: string[], userId: string): string[] {
    // In a real implementation, this would use user preferences and history
    // For this demonstration, we'll just return in default order
    return contentIds;
  }
}

// Export singleton instance
export const dionysiusStreamingService = DionysiusStreamingService.getInstance();
export default dionysiusStreamingService;
