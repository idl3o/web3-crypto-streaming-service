import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { ioErrorService, IOErrorType, IOErrorSeverity } from './IOErrorService';
import { healthMonitoringService, ComponentType, HealthStatus } from './HealthMonitoringService';

/**
 * File pattern match type
 */
export enum MatchType {
  EXACT = 'exact',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  CONTAINS = 'contains',
  REGEX = 'regex',
  GLOB = 'glob'
}

/**
 * File batch operation type
 */
export enum BatchOperationType {
  COPY = 'copy',
  MOVE = 'move',
  DELETE = 'delete',
  ARCHIVE = 'archive',
  CHECKSUM = 'checksum',
  TRANSFORM = 'transform'
}

/**
 * Filter criteria for file batch operations
 */
export interface FileFilter {
  pattern: string;
  matchType: MatchType;
  minSize?: number; // in bytes
  maxSize?: number; // in bytes
  modifiedAfter?: Date;
  modifiedBefore?: Date;
  createdAfter?: Date;
  createdBefore?: Date;
  extensions?: string[]; // e.g., ['.txt', '.json']
}

/**
 * File transformation options
 */
export interface TransformOptions {
  encoding?: BufferEncoding;
  transformer: (content: string) => string | Promise<string>;
  backup?: boolean; // Whether to create a backup before transforming
}

/**
 * Archiving options
 */
export interface ArchiveOptions {
  archiveFormat?: 'zip' | 'tar' | 'tgz';
  compression?: boolean;
  deleteOriginal?: boolean;
}

/**
 * Batch operation result
 */
export interface BatchOperationResult {
  operation: BatchOperationType;
  successful: boolean;
  filesProcessed: number;
  failedFiles: string[];
  errors: Error[];
  details?: Record<string, any>;
  duration: number;
}

/**
 * File information
 */
export interface FileInfo {
  path: string;
  name: string;
  size: number;
  extension: string;
  createdAt: Date;
  modifiedAt: Date;
  isDirectory: boolean;
  checksum?: string;
  metadata?: Record<string, any>;
}

/**
 * File System Batch Automation Tool Service
 * Manages batch operations on files and directories in the system
 */
export class FileSystemBatchAutomationService extends EventEmitter {
  private static instance: FileSystemBatchAutomationService;
  private initialized = false;
  private operationHistory: BatchOperationResult[] = [];
  private activeOperations = new Map<string, { 
    type: BatchOperationType;
    startedAt: number;
    status: 'running' | 'completed' | 'failed'; 
  }>();
  private maxHistoryItems = 100;
  
  private constructor() {
    super();
    this.setMaxListeners(50);
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): FileSystemBatchAutomationService {
    if (!FileSystemBatchAutomationService.instance) {
      FileSystemBatchAutomationService.instance = new FileSystemBatchAutomationService();
    }
    return FileSystemBatchAutomationService.instance;
  }
  
  /**
   * Initialize the service
   * @param options Initialization options
   */
  public async initialize(options?: { maxHistoryItems?: number }): Promise<boolean> {
    if (this.initialized) {
      return true;
    }
    
    try {
      // Register with health monitoring
      await this.registerWithHealthMonitoring();
      
      if (options?.maxHistoryItems) {
        this.maxHistoryItems = options.maxHistoryItems;
      }
      
      this.initialized = true;
      this.emit('initialized');
      return true;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.FILE_SYSTEM,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to initialize FileSystemBatchAutomationService',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return false;
    }
  }
  
  /**
   * Register with health monitoring
   */
  private async registerWithHealthMonitoring(): Promise<void> {
    if (!healthMonitoringService['initialized']) {
      await healthMonitoringService.initialize();
    }
    
    healthMonitoringService.registerComponent(
      'file-system-batch',
      ComponentType.FILE_SYSTEM,
      {
        status: HealthStatus.HEALTHY,
        message: 'File System Batch Automation Service initialized',
        metrics: {
          operationsCompleted: 0,
          activeOperations: 0
        }
      }
    );
    
    healthMonitoringService.registerHealthCheck(
      'file-system-batch',
      async () => {
        const activeOpsCount = this.activeOperations.size;
        
        let status = HealthStatus.HEALTHY;
        let message = 'File System Batch Automation Service operating normally';
        
        if (activeOpsCount > 10) {
          status = HealthStatus.DEGRADED;
          message = `Service under heavy load with ${activeOpsCount} active operations`;
        }
        
        return {
          status,
          message,
          metrics: {
            operationsCompleted: this.operationHistory.length,
            activeOperations: activeOpsCount
          }
        };
      },
      15 * 60 * 1000 // Check every 15 minutes
    );
  }
  
  /**
   * Find files matching the given criteria
   * @param rootPath Root directory to search from
   * @param filter File filter criteria
   * @param recursive Whether to search recursively in subdirectories
   */
  public async findFiles(
    rootPath: string,
    filter: FileFilter,
    recursive: boolean = false
  ): Promise<FileInfo[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      // Track operation
      const operationId = `find-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      this.activeOperations.set(operationId, {
        type: BatchOperationType.CHECKSUM,
        startedAt: Date.now(),
        status: 'running'
      });
      
      const result = await this._findFilesInternal(rootPath, filter, recursive);
      
      // Update operation status
      this.activeOperations.set(operationId, {
        ...this.activeOperations.get(operationId)!,
        status: 'completed'
      });
      
      return result;
    } catch (error) {
      ioErrorService.reportError({
        type: IOErrorType.FILE_SYSTEM,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to find files',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return [];
    }
  }
  
  /**
   * Internal method to recursively find files
   */
  private async _findFilesInternal(
    dirPath: string,
    filter: FileFilter,
    recursive: boolean
  ): Promise<FileInfo[]> {
    // Ensure directory exists
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      throw new Error(`Directory does not exist: ${dirPath}`);
    }
    
    const files: FileInfo[] = [];
    const entries = fs.readdirSync(dirPath);
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory() && recursive) {
        // Recursive call for subdirectories
        const subDirFiles = await this._findFilesInternal(fullPath, filter, recursive);
        files.push(...subDirFiles);
      } else if (!stats.isDirectory()) {
        // Check if file matches filter criteria
        if (this.matchesFilter(entry, fullPath, stats, filter)) {
          files.push({
            path: fullPath,
            name: entry,
            size: stats.size,
            extension: path.extname(entry),
            createdAt: new Date(stats.birthtime),
            modifiedAt: new Date(stats.mtime),
            isDirectory: false
          });
        }
      }
    }
    
    return files;
  }
  
  /**
   * Check if a file matches filter criteria
   */
  private matchesFilter(
    fileName: string,
    filePath: string,
    stats: fs.Stats,
    filter: FileFilter
  ): boolean {
    // Check pattern match
    let patternMatched = false;
    
    switch (filter.matchType) {
      case MatchType.EXACT:
        patternMatched = fileName === filter.pattern;
        break;
      case MatchType.STARTS_WITH:
        patternMatched = fileName.startsWith(filter.pattern);
        break;
      case MatchType.ENDS_WITH:
        patternMatched = fileName.endsWith(filter.pattern);
        break;
      case MatchType.CONTAINS:
        patternMatched = fileName.includes(filter.pattern);
        break;
      case MatchType.REGEX:
        patternMatched = new RegExp(filter.pattern).test(fileName);
        break;
      case MatchType.GLOB:
        // Simple glob support (just * wildcard)
        const regexPattern = filter.pattern
          .replace(/\./g, '\\.')
          .replace(/\*/g, '.*');
        patternMatched = new RegExp(`^${regexPattern}$`).test(fileName);
        break;
    }
    
    if (!patternMatched) {
      return false;
    }
    
    // Check extension if specified
    if (filter.extensions && filter.extensions.length > 0) {
      const fileExt = path.extname(fileName);
      if (!filter.extensions.includes(fileExt)) {
        return false;
      }
    }
    
    // Check file size if specified
    if (filter.minSize !== undefined && stats.size < filter.minSize) {
      return false;
    }
    
    if (filter.maxSize !== undefined && stats.size > filter.maxSize) {
      return false;
    }
    
    // Check modification time if specified
    if (filter.modifiedAfter && stats.mtime < filter.modifiedAfter) {
      return false;
    }
    
    if (filter.modifiedBefore && stats.mtime > filter.modifiedBefore) {
      return false;
    }
    
    // Check creation time if specified
    if (filter.createdAfter && stats.birthtime < filter.createdAfter) {
      return false;
    }
    
    if (filter.createdBefore && stats.birthtime > filter.createdBefore) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Copy files matching the filter criteria from source to destination
   * @param sourcePath Source directory
   * @param destPath Destination directory
   * @param filter Filter criteria for files
   * @param recursive Whether to search recursively in subdirectories
   * @param overwrite Whether to overwrite existing files
   */
  public async copyFiles(
    sourcePath: string,
    destPath: string,
    filter: FileFilter,
    recursive: boolean = false,
    overwrite: boolean = false
  ): Promise<BatchOperationResult> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const startTime = Date.now();
    
    // Track operation
    const operationId = `copy-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.activeOperations.set(operationId, {
      type: BatchOperationType.COPY,
      startedAt: startTime,
      status: 'running'
    });
    
    const result: BatchOperationResult = {
      operation: BatchOperationType.COPY,
      successful: false,
      filesProcessed: 0,
      failedFiles: [],
      errors: [],
      duration: 0,
      details: {
        sourcePath,
        destPath,
        overwrite
      }
    };
    
    try {
      // Find the matching files
      const files = await this.findFiles(sourcePath, filter, recursive);
      
      // Ensure destination directory exists
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      
      // Copy each matching file
      for (const file of files) {
        try {
          const relativePath = path.relative(sourcePath, file.path);
          const destFilePath = path.join(destPath, relativePath);
          
          // Ensure destination directory structure exists
          const destDir = path.dirname(destFilePath);
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
          }
          
          // Check if destination file already exists
          const destFileExists = fs.existsSync(destFilePath);
          
          if (destFileExists && !overwrite) {
            throw new Error(`Destination file already exists: ${destFilePath}`);
          }
          
          // Copy the file
          fs.copyFileSync(file.path, destFilePath);
          
          result.filesProcessed++;
        } catch (error) {
          result.failedFiles.push(file.path);
          result.errors.push(error instanceof Error ? error : new Error(String(error)));
        }
      }
      
      result.successful = result.failedFiles.length === 0;
      
    } catch (error) {
      result.successful = false;
      result.errors.push(error instanceof Error ? error : new Error(String(error)));
      
      ioErrorService.reportError({
        type: IOErrorType.FILE_SYSTEM,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to copy files',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
    }
    
    // Update operation status
    const endTime = Date.now();
    result.duration = endTime - startTime;
    
    this.activeOperations.set(operationId, {
      ...this.activeOperations.get(operationId)!,
      status: result.successful ? 'completed' : 'failed'
    });
    
    // Add to operation history
    this.addToOperationHistory(result);
    
    // Emit operation result event
    this.emit('operation-completed', { 
      operationId,
      operationType: BatchOperationType.COPY,
      result
    });
    
    return result;
  }
  
  /**
   * Move files matching the filter criteria from source to destination
   * @param sourcePath Source directory
   * @param destPath Destination directory
   * @param filter Filter criteria for files
   * @param recursive Whether to search recursively in subdirectories
   * @param overwrite Whether to overwrite existing files
   */
  public async moveFiles(
    sourcePath: string,
    destPath: string,
    filter: FileFilter,
    recursive: boolean = false,
    overwrite: boolean = false
  ): Promise<BatchOperationResult> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const startTime = Date.now();
    
    // Track operation
    const operationId = `move-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.activeOperations.set(operationId, {
      type: BatchOperationType.MOVE,
      startedAt: startTime,
      status: 'running'
    });
    
    const result: BatchOperationResult = {
      operation: BatchOperationType.MOVE,
      successful: false,
      filesProcessed: 0,
      failedFiles: [],
      errors: [],
      duration: 0,
      details: {
        sourcePath,
        destPath,
        overwrite
      }
    };
    
    try {
      // Find the matching files
      const files = await this.findFiles(sourcePath, filter, recursive);
      
      // Ensure destination directory exists
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      
      // Move each matching file
      for (const file of files) {
        try {
          const relativePath = path.relative(sourcePath, file.path);
          const destFilePath = path.join(destPath, relativePath);
          
          // Ensure destination directory structure exists
          const destDir = path.dirname(destFilePath);
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
          }
          
          // Check if destination file already exists
          const destFileExists = fs.existsSync(destFilePath);
          
          if (destFileExists && !overwrite) {
            throw new Error(`Destination file already exists: ${destFilePath}`);
          }
          
          // If destination exists and overwrite is true, remove it first
          if (destFileExists) {
            fs.unlinkSync(destFilePath);
          }
          
          // Move/rename the file
          fs.renameSync(file.path, destFilePath);
          
          result.filesProcessed++;
        } catch (error) {
          result.failedFiles.push(file.path);
          result.errors.push(error instanceof Error ? error : new Error(String(error)));
        }
      }
      
      result.successful = result.failedFiles.length === 0;
      
    } catch (error) {
      result.successful = false;
      result.errors.push(error instanceof Error ? error : new Error(String(error)));
      
      ioErrorService.reportError({
        type: IOErrorType.FILE_SYSTEM,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to move files',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
    }
    
    // Update operation status
    const endTime = Date.now();
    result.duration = endTime - startTime;
    
    this.activeOperations.set(operationId, {
      ...this.activeOperations.get(operationId)!,
      status: result.successful ? 'completed' : 'failed'
    });
    
    // Add to operation history
    this.addToOperationHistory(result);
    
    // Emit operation result event
    this.emit('operation-completed', { 
      operationId,
      operationType: BatchOperationType.MOVE,
      result
    });
    
    return result;
  }
  
  /**
   * Delete files matching the filter criteria
   * @param sourcePath Source directory
   * @param filter Filter criteria for files
   * @param recursive Whether to search recursively in subdirectories
   */
  public async deleteFiles(
    sourcePath: string,
    filter: FileFilter,
    recursive: boolean = false
  ): Promise<BatchOperationResult> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const startTime = Date.now();
    
    // Track operation
    const operationId = `delete-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.activeOperations.set(operationId, {
      type: BatchOperationType.DELETE,
      startedAt: startTime,
      status: 'running'
    });
    
    const result: BatchOperationResult = {
      operation: BatchOperationType.DELETE,
      successful: false,
      filesProcessed: 0,
      failedFiles: [],
      errors: [],
      duration: 0,
      details: {
        sourcePath
      }
    };
    
    try {
      // Find the matching files
      const files = await this.findFiles(sourcePath, filter, recursive);
      
      // Delete each matching file
      for (const file of files) {
        try {
          fs.unlinkSync(file.path);
          result.filesProcessed++;
        } catch (error) {
          result.failedFiles.push(file.path);
          result.errors.push(error instanceof Error ? error : new Error(String(error)));
        }
      }
      
      result.successful = result.failedFiles.length === 0;
      
    } catch (error) {
      result.successful = false;
      result.errors.push(error instanceof Error ? error : new Error(String(error)));
      
      ioErrorService.reportError({
        type: IOErrorType.FILE_SYSTEM,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to delete files',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
    }
    
    // Update operation status
    const endTime = Date.now();
    result.duration = endTime - startTime;
    
    this.activeOperations.set(operationId, {
      ...this.activeOperations.get(operationId)!,
      status: result.successful ? 'completed' : 'failed'
    });
    
    // Add to operation history
    this.addToOperationHistory(result);
    
    // Emit operation result event
    this.emit('operation-completed', { 
      operationId,
      operationType: BatchOperationType.DELETE,
      result
    });
    
    return result;
  }
  
  /**
   * Calculate checksums for files matching the filter criteria
   * @param sourcePath Source directory
   * @param filter Filter criteria for files
   * @param algorithm Hash algorithm (default: sha256)
   * @param recursive Whether to search recursively in subdirectories
   */
  public async calculateChecksums(
    sourcePath: string,
    filter: FileFilter,
    algorithm: string = 'sha256',
    recursive: boolean = false
  ): Promise<BatchOperationResult> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const startTime = Date.now();
    
    // Track operation
    const operationId = `checksum-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.activeOperations.set(operationId, {
      type: BatchOperationType.CHECKSUM,
      startedAt: startTime,
      status: 'running'
    });
    
    const result: BatchOperationResult = {
      operation: BatchOperationType.CHECKSUM,
      successful: false,
      filesProcessed: 0,
      failedFiles: [],
      errors: [],
      duration: 0,
      details: {
        sourcePath,
        algorithm,
        checksums: {} as Record<string, string>
      }
    };
    
    try {
      // Find the matching files
      const files = await this.findFiles(sourcePath, filter, recursive);
      
      // Calculate checksum for each matching file
      for (const file of files) {
        try {
          const fileBuffer = fs.readFileSync(file.path);
          const checksum = crypto.createHash(algorithm).update(fileBuffer).digest('hex');
          
          // Add to checksums
          result.details!.checksums[file.path] = checksum;
          
          result.filesProcessed++;
        } catch (error) {
          result.failedFiles.push(file.path);
          result.errors.push(error instanceof Error ? error : new Error(String(error)));
        }
      }
      
      result.successful = result.failedFiles.length === 0;
      
    } catch (error) {
      result.successful = false;
      result.errors.push(error instanceof Error ? error : new Error(String(error)));
      
      ioErrorService.reportError({
        type: IOErrorType.FILE_SYSTEM,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to calculate checksums',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
    }
    
    // Update operation status
    const endTime = Date.now();
    result.duration = endTime - startTime;
    
    this.activeOperations.set(operationId, {
      ...this.activeOperations.get(operationId)!,
      status: result.successful ? 'completed' : 'failed'
    });
    
    // Add to operation history
    this.addToOperationHistory(result);
    
    // Emit operation result event
    this.emit('operation-completed', { 
      operationId,
      operationType: BatchOperationType.CHECKSUM,
      result
    });
    
    return result;
  }
  
  /**
   * Transform files matching the filter criteria
   * @param sourcePath Source directory
   * @param filter Filter criteria for files
   * @param options Transform options
   * @param recursive Whether to search recursively in subdirectories
   */
  public async transformFiles(
    sourcePath: string,
    filter: FileFilter,
    options: TransformOptions,
    recursive: boolean = false
  ): Promise<BatchOperationResult> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const startTime = Date.now();
    
    // Track operation
    const operationId = `transform-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.activeOperations.set(operationId, {
      type: BatchOperationType.TRANSFORM,
      startedAt: startTime,
      status: 'running'
    });
    
    const result: BatchOperationResult = {
      operation: BatchOperationType.TRANSFORM,
      successful: false,
      filesProcessed: 0,
      failedFiles: [],
      errors: [],
      duration: 0,
      details: {
        sourcePath,
        backup: options.backup
      }
    };
    
    try {
      // Find the matching files
      const files = await this.findFiles(sourcePath, filter, recursive);
      
      // Transform each matching file
      for (const file of files) {
        try {
          // Read file content
          const content = fs.readFileSync(file.path, options.encoding || 'utf8');
          
          // Create backup if requested
          if (options.backup) {
            const backupPath = `${file.path}.bak`;
            fs.copyFileSync(file.path, backupPath);
          }
          
          // Transform content
          const transformedContent = await Promise.resolve(options.transformer(content));
          
          // Write transformed content back to file
          fs.writeFileSync(file.path, transformedContent, options.encoding || 'utf8');
          
          result.filesProcessed++;
        } catch (error) {
          result.failedFiles.push(file.path);
          result.errors.push(error instanceof Error ? error : new Error(String(error)));
        }
      }
      
      result.successful = result.failedFiles.length === 0;
      
    } catch (error) {
      result.successful = false;
      result.errors.push(error instanceof Error ? error : new Error(String(error)));
      
      ioErrorService.reportError({
        type: IOErrorType.FILE_SYSTEM,
        severity: IOErrorSeverity.ERROR,
        message: 'Failed to transform files',
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        error: error instanceof Error ? error : new Error(String(error))
      });
    }
    
    // Update operation status
    const endTime = Date.now();
    result.duration = endTime - startTime;
    
    this.activeOperations.set(operationId, {
      ...this.activeOperations.get(operationId)!,
      status: result.successful ? 'completed' : 'failed'
    });
    
    // Add to operation history
    this.addToOperationHistory(result);
    
    // Emit operation result event
    this.emit('operation-completed', { 
      operationId,
      operationType: BatchOperationType.TRANSFORM,
      result
    });
    
    return result;
  }
  
  /**
   * Get detailed information about a file
   * @param filePath Path to the file
   * @param includeChecksum Whether to include a checksum in the file info
   * @param algorithm Hash algorithm for checksum (default: sha256)
   */
  public getFileInfo(
    filePath: string,
    includeChecksum: boolean = false,
    algorithm: string = 'sha256'
  ): FileInfo | null {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const stats = fs.statSync(filePath);
      const fileInfo: FileInfo = {
        path: filePath,
        name: path.basename(filePath),
        size: stats.size,
        extension: path.extname(filePath),
        createdAt: new Date(stats.birthtime),
        modifiedAt: new Date(stats.mtime),
        isDirectory: stats.isDirectory()
      };
      
      // Calculate checksum if requested and not a directory
      if (includeChecksum && !stats.isDirectory()) {
        const fileBuffer = fs.readFileSync(filePath);
        fileInfo.checksum = crypto.createHash(algorithm).update(fileBuffer).digest('hex');
      }
      
      return fileInfo;
    } catch (error) {
      console.error('Error getting file info:', error);
      return null;
    }
  }
  
  /**
   * Add operation result to history, maintaining max size
   * @param result Operation result to add
   */
  private addToOperationHistory(result: BatchOperationResult): void {
    this.operationHistory.unshift(result);
    
    // Trim history to max size
    if (this.operationHistory.length > this.maxHistoryItems) {
      this.operationHistory = this.operationHistory.slice(0, this.maxHistoryItems);
    }
  }
  
  /**
   * Get operation history
   * @param limit Maximum number of items to return
   */
  public getOperationHistory(limit?: number): BatchOperationResult[] {
    if (limit && limit > 0) {
      return this.operationHistory.slice(0, limit);
    }
    return [...this.operationHistory];
  }
  
  /**
   * Get active operations
   */
  public getActiveOperations(): Array<{
    id: string;
    type: BatchOperationType;
    startedAt: number;
    status: string;
    runningTimeMs: number;
  }> {
    const now = Date.now();
    return Array.from(this.activeOperations.entries()).map(([id, op]) => ({
      id,
      type: op.type,
      startedAt: op.startedAt,
      status: op.status,
      runningTimeMs: now - op.startedAt
    }));
  }
  
  /**
   * Clear operation history
   */
  public clearOperationHistory(): void {
    this.operationHistory = [];
  }
}

// Export singleton instance
export const fileSystemBatchAutomationService = FileSystemBatchAutomationService.getInstance();
export default fileSystemBatchAutomationService;
