import { ethers } from 'ethers';
import { uploadToIPFS } from './ipfsService';

export interface StreamingOptions {
    paymentRate: number; // ETH per minute
    spendingLimit?: number; // Maximum ETH to spend
    durationLimit?: number; // Maximum minutes to stream
    token?: string; // ETH by default, could be a token address
}

export interface ContentStream {
    id: string;
    title: string;
    creator: string;
    creatorAddress: string;
    url: string;
    ipfsHash: string;
    streamingActive: boolean;
    timeWatched: number;
    amountSpent: number;
    paymentRate: number;
    thumbnail?: string;
    description?: string;
    tags?: string[];
    license?: string;
    createdAt: number;
}

export interface StreamStats {
    totalViewers: number;
    activeViewers: number;
    totalEarned: number;
    averageWatchTime: number;
}

export class StreamingService {
    private provider: ethers.providers.Web3Provider;
    private activeStreams: Map<string, ContentStream> = new Map();
    private streamIntervals: Map<string, NodeJS.Timer> = new Map();

    constructor(provider: ethers.providers.Web3Provider) {
        this.provider = provider;
    }

    /**
     * Upload content to IPFS and prepare for streaming
     */
    async uploadContent(file: File, metadata: any): Promise<string> {
        try {
            // Upload content to IPFS
            const ipfsPath = await uploadToIPFS(file);

            // Create content metadata
            const contentMetadata = {
                ...metadata,
                fileType: file.type,
                fileSize: file.size,
                ipfsPath,
                timestamp: Date.now(),
                license: metadata.license || 'standard'
            };

            // Upload metadata to IPFS
            const metadataHash = await uploadToIPFS(
                new Blob([JSON.stringify(contentMetadata)], { type: 'application/json' })
            );

            console.log(`Content uploaded to IPFS: ${ipfsPath}`);
            console.log(`Metadata uploaded to IPFS: ${metadataHash}`);

            return metadataHash;
        } catch (error) {
            console.error('Error uploading content:', error);
            throw new Error('Failed to upload content');
        }
    }

    /**
     * Start streaming content to viewer with payment stream
     */
    async startStream(contentId: string, options: StreamingOptions): Promise<ContentStream> {
        try {
            // Fetch content metadata
            const content = await this.getContentById(contentId);

            if (!content) {
                throw new Error('Content not found');
            }

            // Check wallet connection
            const accounts = await this.provider.listAccounts();
            if (!accounts || accounts.length === 0) {
                throw new Error('Wallet not connected');
            }

            // Create streaming session
            const stream: ContentStream = {
                ...content,
                streamingActive: true,
                timeWatched: 0,
                amountSpent: 0,
                paymentRate: options.paymentRate
            };

            // Start payment tracking interval (per minute)
            const interval = setInterval(() => {
                if (stream.streamingActive) {
                    // Update time watched (in minutes)
                    stream.timeWatched += 1;

                    // Calculate payment amount
                    stream.amountSpent += options.paymentRate;

                    // Check duration limit
                    if (options.durationLimit && stream.timeWatched >= options.durationLimit) {
                        this.stopStream(contentId);
                    }

                    // Check spending limit
                    if (options.spendingLimit && stream.amountSpent >= options.spendingLimit) {
                        this.stopStream(contentId);
                    }

                    console.log(`Streaming ${content.title}: ${stream.timeWatched} minutes watched, ${stream.amountSpent} ETH spent`);
                }
            }, 60000); // Update every minute

            // Store active stream
            this.activeStreams.set(contentId, stream);
            this.streamIntervals.set(contentId, interval);

            console.log(`Started streaming ${content.title} at ${options.paymentRate} ETH per minute`);
            return stream;
        } catch (error) {
            console.error('Error starting stream:', error);
            throw error;
        }
    }

    /**
     * Stop streaming content and finalize payment
     */
    async stopStream(contentId: string): Promise<ContentStream | null> {
        try {
            const stream = this.activeStreams.get(contentId);

            if (!stream) {
                console.warn(`No active stream found for content ${contentId}`);
                return null;
            }

            // Clear interval
            const interval = this.streamIntervals.get(contentId);
            if (interval) {
                clearInterval(interval);
                this.streamIntervals.delete(contentId);
            }

            // Update stream status
            stream.streamingActive = false;

            // Finalize payment
            if (stream.amountSpent > 0) {
                await this.finalizePayment(stream);
            }

            // Remove from active streams
            this.activeStreams.delete(contentId);

            console.log(`Stopped streaming ${stream.title}`);
            console.log(`Summary: ${stream.timeWatched} minutes watched, ${stream.amountSpent} ETH spent`);

            return stream;
        } catch (error) {
            console.error('Error stopping stream:', error);
            throw error;
        }
    }

    /**
     * Get a content stream by ID
     */
    async getContentById(contentId: string): Promise<ContentStream | null> {
        // This would fetch from a database or blockchain in a real app
        // Simulating for demo purposes
        return {
            id: contentId,
            title: 'Web3 Development Tutorial Series: Episode 1',
            creator: 'Crypto Academy',
            creatorAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
            url: `https://ipfs.io/ipfs/${contentId}`,
            ipfsHash: contentId,
            streamingActive: false,
            timeWatched: 0,
            amountSpent: 0,
            paymentRate: 0.0001,
            thumbnail: 'https://via.placeholder.com/320x180?text=Tutorial',
            description: 'Learn how to build decentralized applications on Ethereum.',
            tags: ['ethereum', 'web3', 'development', 'tutorial'],
            license: 'standard',
            createdAt: Date.now() - 3600000 // 1 hour ago
        };
    }

    /**
     * Get active streaming stats for a content creator
     */
    async getStreamingStats(creatorAddress: string): Promise<StreamStats> {
        // This would fetch actual stats from a backend or smart contract
        // Simulating for demo purposes
        return {
            totalViewers: 1245,
            activeViewers: 327,
            totalEarned: 0.3456,
            averageWatchTime: 8.2 // minutes
        };
    }

    /**
     * Process the payment for a stream
     */
    private async finalizePayment(stream: ContentStream): Promise<void> {
        try {
            // This would interact with a payment contract in a real app
            console.log(`Processing payment of ${stream.amountSpent} ETH to ${stream.creatorAddress}`);

            // Simulate sending a transaction
            const signer = this.provider.getSigner();
            const tx = {
                to: stream.creatorAddress,
                value: ethers.utils.parseEther(stream.amountSpent.toString())
            };

            // In a real app, this would be an actual transaction
            // Skipping actual transaction for demo
            // await signer.sendTransaction(tx);

            console.log('Payment processed successfully');
        } catch (error) {
            console.error('Payment processing error:', error);
            throw new Error('Failed to process payment');
        }
    }
}

export const createStreamingService = (provider: ethers.providers.Web3Provider): StreamingService => {
    return new StreamingService(provider);
};
