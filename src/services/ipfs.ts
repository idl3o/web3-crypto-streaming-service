import { create } from 'ipfs-http-client';

/**
 * Service to handle IPFS content operations
 */
export class IPFSService {
    private ipfs;
    private gateway: string;

    constructor(apiUrl = 'http://localhost:5001', gateway = 'https://ipfs.io/ipfs/') {
        this.ipfs = create({ url: apiUrl });
        this.gateway = gateway;
    }

    /**
     * Upload content to IPFS
     * @param content - Content buffer or string to upload
     * @returns CID of the uploaded content
     */
    async uploadContent(content: Buffer | string): Promise<string> {
        try {
            const result = await this.ipfs.add(content);
            return result.cid.toString();
        } catch (error) {
            console.error('IPFS upload error:', error);
            throw new Error('Failed to upload to IPFS');
        }
    }

    /**
     * Retrieve content from IPFS by CID
     * @param cid - Content identifier
     * @returns Content as a buffer
     */
    async getContent(cid: string): Promise<Buffer> {
        try {
            const chunks = [];
            for await (const chunk of this.ipfs.cat(cid)) {
                chunks.push(chunk);
            }
            return Buffer.concat(chunks);
        } catch (error) {
            console.error('IPFS retrieval error:', error);
            throw new Error('Failed to retrieve from IPFS');
        }
    }

    /**
     * Get a gateway URL for the given CID
     * @param cid - Content identifier
     * @returns IPFS gateway URL
     */
    getGatewayUrl(cid: string): string {
        return `${this.gateway}${cid}`;
    }

    /**
     * Check if IPFS node is available
     * @returns Boolean indicating if IPFS is available
     */
    async checkAvailability(): Promise<boolean> {
        try {
            await this.ipfs.version();
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Pin content to ensure persistence
     * @param cid - Content identifier to pin
     */
    async pinContent(cid: string): Promise<void> {
        try {
            await this.ipfs.pin.add(cid);
        } catch (error) {
            console.error('IPFS pin error:', error);
            throw new Error('Failed to pin content');
        }
    }
}

// Export singleton instance
export default new IPFSService();
