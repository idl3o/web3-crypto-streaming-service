import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import crypto from 'crypto';
import { logger } from '../logger';
import { ipfs } from '../ipfs';

interface StreamManifest {
    id: string;
    title: string;
    description?: string;
    duration: number;
    created: string;
    ipfs: {
        manifestCid: string;
        segments: string[];
    }
    format: 'HLS' | 'DASH';
    resolution: string;
    encoder: string;
}

/**
 * Streaming Module - Handles video processing and delivery
 */
export class StreamingModule {
    private baseContentPath: string;

    constructor(contentPath?: string) {
        this.baseContentPath = contentPath || path.join(process.cwd(), 'content');
        this.ensureDirectories();
    }

    /**
     * Ensure required directories exist
     */
    private ensureDirectories(): void {
        const dirs = [
            path.join(this.baseContentPath, 'input'),
            path.join(this.baseContentPath, 'output'),
            path.join(this.baseContentPath, 'manifest'),
        ];

        for (const dir of dirs) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                logger.info(`Created directory: ${dir}`);
            }
        }
    }

    /**
     * Process video into streaming format
     */
    public async processVideo(
        videoPath: string,
        options = { format: 'HLS', segmentDuration: 10 }
    ): Promise<StreamManifest> {
        const videoFileName = path.basename(videoPath);
        const fileNameNoExt = path.parse(videoFileName).name.toLowerCase().replace(/\s+/g, '-');
        const fileHash = await this.calculateFileHash(videoPath);
        const shortHash = fileHash.substring(0, 8);
        const outputName = `${fileNameNoExt}-${shortHash}`;

        const outputDir = path.join(this.baseContentPath, 'output', outputName);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const manifestPath = path.join(outputDir, 'playlist.m3u8');

        await this.convertToStreamingFormat(videoPath, outputDir, options);

        // Get video metadata
        const duration = await this.getVideoDuration(videoPath);

        // Create manifest object
        const manifest: StreamManifest = {
            id: outputName,
            title: fileNameNoExt,
            duration,
            created: new Date().toISOString(),
            ipfs: {
                manifestCid: '',
                segments: []
            },
            format: options.format as 'HLS' | 'DASH',
            resolution: '1080p', // This would be extracted from video metadata
            encoder: 'h264'      // This would be extracted from video metadata
        };

        // Save manifest locally
        fs.writeFileSync(
            path.join(this.baseContentPath, 'manifest', `${outputName}.json`),
            JSON.stringify(manifest, null, 2)
        );

        return manifest;
    }

    /**
     * Calculate file hash
     */
    private calculateFileHash(filePath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256');
            const stream = fs.createReadStream(filePath);

            stream.on('error', err => reject(err));
            stream.on('data', chunk => hash.update(chunk));
            stream.on('end', () => resolve(hash.digest('hex')));
        });
    }

    /**
     * Convert video to streaming format
     */
    private convertToStreamingFormat(
        inputPath: string,
        outputDir: string,
        options: { format: string, segmentDuration: number }
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const manifestPath = path.join(outputDir, 'playlist.m3u8');

            logger.info(`Converting ${inputPath} to ${options.format} format...`);

            const ffmpegArgs = [
                '-i', inputPath,
                '-profile:v', 'baseline',
                '-level', '3.0',
                '-start_number', '0',
                '-hls_time', options.segmentDuration.toString(),
                '-hls_list_size', '0',
                '-f', 'hls',
                manifestPath
            ];

            const ffmpeg = spawn('ffmpeg', ffmpegArgs);

            ffmpeg.stderr.on('data', (data) => {
                logger.debug(`ffmpeg: ${data.toString()}`);
            });

            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    logger.info(`Successfully converted ${inputPath}`);
                    resolve();
                } else {
                    reject(new Error(`FFmpeg process exited with code ${code}`));
                }
            });

            ffmpeg.on('error', (err) => {
                reject(new Error(`FFmpeg process error: ${err.message}`));
            });
        });
    }

    /**
     * Get video duration
     */
    private async getVideoDuration(videoPath: string): Promise<number> {
        return new Promise((resolve, reject) => {
            const ffprobe = spawn('ffprobe', [
                '-v', 'error',
                '-show_entries', 'format=duration',
                '-of', 'default=noprint_wrappers=1:nokey=1',
                videoPath
            ]);

            let output = '';
            ffprobe.stdout.on('data', (data) => {
                output += data.toString();
            });

            ffprobe.on('close', (code) => {
                if (code === 0) {
                    resolve(parseFloat(output.trim()));
                } else {
                    reject(new Error(`FFprobe process exited with code ${code}`));
                }
            });

            ffprobe.on('error', (err) => {
                reject(new Error(`FFprobe process error: ${err.message}`));
            });
        });
    }

    /**
     * Upload stream to IPFS
     */
    public async uploadToIPFS(streamId: string): Promise<StreamManifest> {
        const manifestPath = path.join(
            this.baseContentPath,
            'manifest',
            `${streamId}.json`
        );

        if (!fs.existsSync(manifestPath)) {
            throw new Error(`Stream manifest not found: ${streamId}`);
        }

        const manifest: StreamManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const streamDir = path.join(this.baseContentPath, 'output', streamId);

        if (!fs.existsSync(streamDir)) {
            throw new Error(`Stream directory not found: ${streamId}`);
        }

        // Upload segments
        const segmentFiles = fs.readdirSync(streamDir)
            .filter(file => file.endsWith('.ts'));

        manifest.ipfs.segments = [];

        for (const segmentFile of segmentFiles) {
            const segmentPath = path.join(streamDir, segmentFile);
            const segmentContent = fs.readFileSync(segmentPath);
            const segmentCid = await ipfs.uploadContent(segmentContent);
            manifest.ipfs.segments.push(segmentCid);
            logger.info(`Uploaded segment ${segmentFile}: ${segmentCid}`);
        }

        // Upload manifest file
        const playlistContent = fs.readFileSync(path.join(streamDir, 'playlist.m3u8'));
        manifest.ipfs.manifestCid = await ipfs.uploadContent(playlistContent);
        logger.info(`Uploaded manifest: ${manifest.ipfs.manifestCid}`);

        // Update local manifest file
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

        return manifest;
    }

    /**
     * Get stream manifest by ID
     */
    public getStreamManifest(streamId: string): StreamManifest {
        const manifestPath = path.join(
            this.baseContentPath,
            'manifest',
            `${streamId}.json`
        );

        if (!fs.existsSync(manifestPath)) {
            throw new Error(`Stream manifest not found: ${streamId}`);
        }

        return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    }
}

// Export singleton instance
export const streaming = new StreamingModule();
