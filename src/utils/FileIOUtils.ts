/**
 * File IO Utilities
 * Handles file operations for the Web3 Crypto Streaming Service
 */
import { Buffer } from 'buffer';
import { ipfsService } from '../services/IPFSService';
import { createHash } from 'crypto';
import { ioErrorService, IOErrorType, IOErrorSeverity } from '../services/IOErrorService';

export enum FileType {
    VIDEO = 'video',
    AUDIO = 'audio',
    IMAGE = 'image',
    DOCUMENT = 'document',
    OTHER = 'other'
}

export interface FileMetadata {
    name: string;
    type: string;
    size: number;
    lastModified: number;
    hash?: string;
    ipfsHash?: string;
    duration?: number; // For audio/video
    dimensions?: { width: number; height: number }; // For images/videos
    thumbnail?: string;
}

export class FileIOUtils {
    /**
     * Calculate hash of a file
     * @param file File to hash
     * @param algorithm Hash algorithm to use
     */
    public static async calculateFileHash(file: File, algorithm: 'sha256' | 'blake3' = 'sha256'): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    if (!event.target?.result) {
                        throw new Error('Failed to read file');
                    }

                    const buffer = Buffer.from(event.target.result as ArrayBuffer);

                    if (algorithm === 'blake3') {
                        // Use blake3 for faster hashing of large files
                        const blake3 = await import('blake3');
                        const hash = blake3.default.hash(buffer);
                        resolve(hash.toString('hex'));
                    } else {
                        // Use SHA-256 as default
                        const hash = createHash('sha256').update(buffer).digest('hex');
                        resolve(hash);
                    }
                } catch (error) {
                    // Report the error to IOErrorService
                    ioErrorService.reportError({
                        type: IOErrorType.FILE_READ,
                        severity: IOErrorSeverity.ERROR,
                        message: `Failed to calculate ${algorithm} hash for file`,
                        details: error instanceof Error ? error.message : 'Unknown error',
                        fileName: file.name,
                        fileSize: file.size,
                        retryable: true,
                        error: error instanceof Error ? error : undefined
                    });
                    reject(error);
                }
            };
            reader.onerror = (error) => {
                // Report the error to IOErrorService
                ioErrorService.reportError({
                    type: IOErrorType.FILE_READ,
                    severity: IOErrorSeverity.ERROR,
                    message: 'Failed to read file for hashing',
                    fileName: file.name,
                    fileSize: file.size,
                    retryable: true,
                    error: error instanceof Error ? error : undefined
                });
                reject(error);
            };
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Extract file metadata
     * @param file File to extract metadata from
     * @param calculateHash Whether to calculate file hash
     */
    public static async extractFileMetadata(file: File, calculateHash: boolean = false): Promise<FileMetadata> {
        const metadata: FileMetadata = {
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified
        };

        // Calculate hash if requested
        if (calculateHash) {
            metadata.hash = await this.calculateFileHash(file);
        }

        // Extract media-specific metadata
        if (file.type.startsWith('image/')) {
            const dimensions = await this.getImageDimensions(file);
            metadata.dimensions = dimensions;
        } else if (file.type.startsWith('video/')) {
            const videoMetadata = await this.getVideoMetadata(file);
            metadata.dimensions = videoMetadata.dimensions;
            metadata.duration = videoMetadata.duration;
            metadata.thumbnail = videoMetadata.thumbnail;
        } else if (file.type.startsWith('audio/')) {
            const duration = await this.getAudioDuration(file);
            metadata.duration = duration;
        }

        return metadata;
    }

    /**
     * Upload file to IPFS
     * @param file File to upload
     * @param onProgress Progress callback
     */
    public static async uploadToIPFS(
        file: File,
        onProgress?: (progress: number) => void
    ): Promise<{ ipfsHash: string; metadata: FileMetadata }> {
        try {
            // Extract metadata first
            const metadata = await this.extractFileMetadata(file, true);

            // Upload to IPFS
            const ipfsHash = await ipfsService.addFile(file, onProgress);
            metadata.ipfsHash = ipfsHash;

            return { ipfsHash, metadata };
        } catch (error) {
            // Report the error to IOErrorService
            ioErrorService.reportError({
                type: IOErrorType.IPFS_UPLOAD,
                severity: IOErrorSeverity.ERROR,
                message: 'Failed to upload file to IPFS',
                details: error instanceof Error ? error.message : 'Unknown error',
                fileName: file.name,
                fileSize: file.size,
                retryable: true,
                error: error instanceof Error ? error : undefined
            });
            throw error;
        }
    }

    /**
     * Chunk a file for streaming or processing
     * @param file File to chunk
     * @param chunkSize Size of each chunk in bytes
     */
    public static async* chunkFile(file: File, chunkSize: number = 1024 * 1024): AsyncGenerator<Uint8Array> {
        let offset = 0;

        try {
            while (offset < file.size) {
                const chunk = file.slice(offset, offset + chunkSize);
                const arrayBuffer = await chunk.arrayBuffer();

                yield new Uint8Array(arrayBuffer);
                offset += chunkSize;
            }
        } catch (error) {
            // Report the error to IOErrorService
            ioErrorService.reportError({
                type: IOErrorType.FILE_READ,
                severity: IOErrorSeverity.ERROR,
                message: 'Failed to chunk file for processing',
                details: error instanceof Error ? error.message : 'Unknown error',
                fileName: file.name,
                fileSize: file.size,
                retryable: true,
                error: error instanceof Error ? error : undefined
            });
            throw error;
        }
    }

    /**
     * Download file from URL or IPFS
     * @param source URL or IPFS hash
     * @param filename Filename to save as
     * @param onProgress Progress callback
     */
    public static async downloadFile(
        source: string,
        filename: string,
        onProgress?: (progress: number) => void
    ): Promise<void> {
        try {
            // Handle IPFS hash
            if (source.startsWith('ipfs://')) {
                const ipfsHash = source.replace('ipfs://', '');
                const blob = await ipfsService.getFile(ipfsHash, onProgress);
                this.saveBlob(blob, filename);
                return;
            }

            // Handle regular URL
            const response = await fetch(source);

            if (!response.ok) {
                throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
            }

            if (response.body && onProgress) {
                const reader = response.body.getReader();
                const contentLength = Number(response.headers.get('Content-Length') || '0');
                let receivedLength = 0;
                const chunks: Uint8Array[] = [];

                while (true) {
                    const { done, value } = await reader.read();

                    if (done) break;

                    chunks.push(value);
                    receivedLength += value.length;

                    if (contentLength > 0) {
                        onProgress(receivedLength / contentLength);
                    }
                }

                const blob = new Blob(chunks);
                this.saveBlob(blob, filename);
            } else {
                // Fallback for browsers that don't support readable streams
                const blob = await response.blob();
                this.saveBlob(blob, filename);
            }
        } catch (error) {
            // Determine if this is an IPFS or network error
            const errorType = source.startsWith('ipfs://') ?
                IOErrorType.IPFS_DOWNLOAD :
                IOErrorType.NETWORK_RESPONSE;

            // Report the error to IOErrorService
            ioErrorService.reportError({
                type: errorType,
                severity: IOErrorSeverity.ERROR,
                message: `Failed to download file${filename ? ': ' + filename : ''}`,
                details: error instanceof Error ? error.message : 'Unknown error',
                fileName: filename,
                url: source,
                retryable: true,
                error: error instanceof Error ? error : undefined
            });

            throw error;
        }
    }

    /**
     * Save blob to file
     * @private
     */
    private static saveBlob(blob: Blob, filename: string): void {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    }

    /**
     * Get dimensions of an image
     * @private
     */
    private static getImageDimensions(file: File): Promise<{ width: number; height: number }> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve({ width: img.width, height: img.height });
            };
            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
            img.src = URL.createObjectURL(file);
        });
    }

    /**
     * Get metadata for a video file
     * @private
     */
    private static getVideoMetadata(file: File): Promise<{
        duration: number;
        dimensions: { width: number; height: number };
        thumbnail?: string;
    }> {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'metadata';

            video.onloadedmetadata = () => {
                // Generate thumbnail at 25% of the video
                video.currentTime = Math.min(video.duration * 0.25, 5);
            };

            video.ontimeupdate = () => {
                // Create thumbnail once seeking is complete
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) throw new Error('Failed to get canvas context');

                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const thumbnail = canvas.toDataURL('image/jpeg', 0.7);

                    resolve({
                        duration: video.duration,
                        dimensions: { width: video.videoWidth, height: video.videoHeight },
                        thumbnail
                    });

                    // Clean up
                    URL.revokeObjectURL(video.src);
                } catch (error) {
                    reject(error);
                }
            };

            video.onerror = () => {
                reject(new Error('Failed to load video metadata'));
                URL.revokeObjectURL(video.src);
            };

            video.src = URL.createObjectURL(file);
        });
    }

    /**
     * Get duration of an audio file
     * @private
     */
    private static getAudioDuration(file: File): Promise<number> {
        return new Promise((resolve, reject) => {
            const audio = new Audio();

            audio.onloadedmetadata = () => {
                resolve(audio.duration);
                URL.revokeObjectURL(audio.src);
            };

            audio.onerror = () => {
                reject(new Error('Failed to load audio metadata'));
                URL.revokeObjectURL(audio.src);
            };

            audio.src = URL.createObjectURL(file);
        });
    }

    /**
     * Detect file type from mime type or extension
     * @param file File or mime type string
     */
    public static detectFileType(file: File | string): FileType {
        const mimeType = typeof file === 'string' ? file : file.type;

        if (mimeType.startsWith('video/')) {
            return FileType.VIDEO;
        } else if (mimeType.startsWith('audio/')) {
            return FileType.AUDIO;
        } else if (mimeType.startsWith('image/')) {
            return FileType.IMAGE;
        } else if (
            mimeType.startsWith('application/pdf') ||
            mimeType.includes('document') ||
            mimeType.includes('text/')
        ) {
            return FileType.DOCUMENT;
        }

        return FileType.OTHER;
    }
}
