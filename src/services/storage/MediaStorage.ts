import fs from 'fs/promises';
import path from 'path';

interface MediaConfig {
    storageDir: string;
    maxFileSize?: number;
    allowedTypes?: string[];
}

export class MediaStorage {
    private config: Required<MediaConfig>;
    
    constructor(config: MediaConfig) {
        this.config = {
            maxFileSize: 10 * 1024 * 1024, // 10MB
            allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
            ...config
        };
        this.initialize();
    }

    private async initialize(): Promise<void> {
        await fs.mkdir(this.config.storageDir, { recursive: true });
    }

    public async storeMedia(file: Buffer, filename: string, type: string): Promise<string> {
        if (!this.config.allowedTypes.includes(type)) {
            throw new Error('Unsupported media type');
        }

        if (file.length > this.config.maxFileSize) {
            throw new Error('File size exceeds limit');
        }

        const safeName = this.sanitizeFilename(filename);
        const filePath = path.join(this.config.storageDir, safeName);
        await fs.writeFile(filePath, file);
        return safeName;
    }

    public async getMedia(filename: string): Promise<Buffer> {
        const filePath = path.join(this.config.storageDir, this.sanitizeFilename(filename));
        return fs.readFile(filePath);
    }

    private sanitizeFilename(filename: string): string {
        return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    }
}
