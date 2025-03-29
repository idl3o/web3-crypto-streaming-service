import { create, IPFSHTTPClient } from 'ipfs-http-client';
import axios from 'axios';
import dotenv from 'dotenv';
import { logger } from '../logger';

dotenv.config();

/**
 * IPFS Module - Handles all IPFS interactions
 */
export class IPFSModule {
    private client?: IPFSHTTPClient;
    private gateways: string[];

    constructor() {
        this.gateways = [
            'https://ipfs.io/ipfs/',
            'https://gateway.pinata.cloud/ipfs/',
            'https://cloudflare-ipfs.com/ipfs/',
            'https://ipfs.fleek.co/ipfs/',
            ...(process.env.IPFS_GATEWAYS?.split(',') || [])
        ];

        try {
            // Try to create a client if IPFS API is available
            if (process.env.IPFS_API_URL) {
                this.client = create({ url: process.env.IPFS_API_URL });
            }
        } catch (err) {
            logger.warn('IPFS client initialization failed, using gateway only mode');
        }
    }

    /**
     * Upload content to IPFS
     */
    public async uploadContent(content: Buffer | string): Promise<string> {
        if (!this.client) {
            throw new Error('IPFS client not available');
        }

        const result = await this.client.add(content);
        return result.path;
    }

    /**
     * Pin content on IPFS
     */
    public async pinContent(cid: string): Promise<void> {
        if (!this.client) {
            throw new Error('IPFS client not available');
        }

        await this.client.pin.add(cid);
        logger.info(`Content pinned: ${cid}`);
    }

    /**
     * Fetch content from IPFS (with fallback to gateways)
     */
    public async fetchContent(cid: string): Promise<Buffer> {
        // Try direct IPFS client first if available
        if (this.client) {
            try {
                const chunks = [];
                for await (const chunk of this.client.cat(cid)) {
                    chunks.push(chunk);
                }
                return Buffer.concat(chunks);
            } catch (err) {
                logger.warn(`Direct IPFS fetch failed for ${cid}, trying gateways`);
            }
        }

        // Try gateways as fallback
        for (const gateway of this.gateways) {
            try {
                const url = `${gateway}${cid}`;
                const response = await axios.get(url, {
                    responseType: 'arraybuffer',
                    timeout: 10000
                });
                return Buffer.from(response.data);
            } catch (err) {
                logger.warn(`Gateway fetch failed: ${gateway}`);
            }
        }

        throw new Error(`Failed to fetch content ${cid} from all sources`);
    }

    /**
     * List pinned content
     */
    public async listPins(): Promise<string[]> {
        if (!this.client) {
            throw new Error('IPFS client not available');
        }

        const pins = [];
        for await (const pin of this.client.pin.ls()) {
            pins.push(pin.cid.toString());
        }
        return pins;
    }
}

// Export singleton instance
export const ipfs = new IPFSModule();
