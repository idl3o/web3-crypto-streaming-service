import { defineStore } from 'pinia';
import { uploadToIPFS, pinContent, resolveIPFS } from '../services/ipfsService';
import ipfsService from '@/services/ipfs';
import { Content, ContentMetadata } from '@/types';
import licenseService from '@/services/license';

/**
 * @category Content State
 * 
 * Manages content items, metadata, library, and content discovery
 */
interface ContentItem {
    id: string;
    title: string;
    description: string;
    cid: string;
    url: string;
    thumbnail?: string;
    createdAt: number;
    owner: string;
}

interface ContentState {
    contents: Record<string, Content>;
    featuredIds: string[];
    isLoading: boolean;
    error: string | null;
}

export const useContentStore = defineStore('content', {
    state: () => ({
        contents: {},
        featuredIds: [],
        isLoading: false,
        error: null,
        featuredContent: [] as ContentItem[],
        userContent: [] as ContentItem[],
    }),

    getters: {
        featuredContent: (state) =>
            state.featuredIds.map(id => state.contents[id]).filter(Boolean),

        getContentById: (state) => (id: string) =>
            state.contents[id] || null,

        getFeaturedContent: (state) => state.featuredContent,
        getUserContent: (state) => state.userContent,
    },

    actions: {
        async loadFeaturedContent() {
            this.isLoading = true;
            this.error = null;

            try {
                // This would be replaced with an actual API call to your backend
                // For now we're mocking the data
                await new Promise(resolve => setTimeout(resolve, 500));

                this.featuredContent = [
                    {
                        id: '1',
                        title: 'Introduction to Web3',
                        description: 'Learn the basics of Web3 technology',
                        cid: 'QmV9tSDx9UiPeWExXEeH6aoDvmihvx6jD5eLb4jbTaKGps',
                        url: 'https://ipfs.io/ipfs/QmV9tSDx9UiPeWExXEeH6aoDvmihvx6jD5eLb4jbTaKGps',
                        thumbnail: '/images/content/web3-intro.jpg',
                        createdAt: Date.now() - 86400000, // 1 day ago
                        owner: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'
                    },
                    {
                        id: '2',
                        title: 'Streaming Payments Guide',
                        description: 'How to set up streaming payments with Ethereum',
                        cid: 'QmSgvgwxZGaBLqkGyWemEDqikCqU52XxsYLKtdy3vGZ8uq',
                        url: 'https://ipfs.io/ipfs/QmSgvgwxZGaBLqkGyWemEDqikCqU52XxsYLKtdy3vGZ8uq',
                        thumbnail: '/images/content/payment-guide.jpg',
                        createdAt: Date.now() - 172800000, // 2 days ago
                        owner: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'
                    }
                ];
            } catch (error) {
                this.error = 'Failed to load featured content';
                console.error('Error loading featured content:', error);
            } finally {
                this.isLoading = false;
            }
        },

        async uploadContent(file: File, metadata: { title: string, description: string }) {
            this.isLoading = true;
            this.error = null;

            try {
                // Upload the file to IPFS
                const url = await uploadToIPFS(file);
                const cid = url.split('/').pop() || '';

                // Pin the content to ensure it remains available
                await pinContent(cid);

                // Create a new content item
                const contentItem: ContentItem = {
                    id: Date.now().toString(),
                    title: metadata.title,
                    description: metadata.description,
                    cid,
                    url: resolveIPFS(cid),
                    createdAt: Date.now(),
                    owner: '0x0000000000000000000000000000000000000000', // This would be the user's wallet address
                };

                // Add to user content
                this.userContent.push(contentItem);

                return contentItem;
            } catch (error) {
                this.error = 'Failed to upload content';
                console.error('Error uploading content:', error);
                throw error;
            } finally {
                this.isLoading = false;
            }
        },

        async getContentById(id: string): Promise<Content | null> {
            // Return from cache if available
            if (this.contents[id]) {
                return this.contents[id];
            }

            try {
                this.isLoading = true;

                // Fetch content metadata from API or IPFS
                const contentMetadata: ContentMetadata = await this.fetchContentMetadata(id);

                // Verify license
                const licenseValid = await licenseService.verifyLicense(contentMetadata);

                if (!licenseValid) {
                    throw new Error('Invalid content license');
                }

                // Create full content object
                const content: Content = {
                    id,
                    title: contentMetadata.title,
                    description: contentMetadata.description,
                    creator: contentMetadata.creator,
                    creatorAvatar: contentMetadata.creatorAvatar,
                    license: contentMetadata.license,
                    preview: contentMetadata.preview,
                    type: contentMetadata.type,
                    mimeType: contentMetadata.mimeType,
                    ipfsHash: contentMetadata.ipfsHash,
                    created: contentMetadata.created,
                    // Add any additional fields
                };

                // Store in cache
                this.contents[id] = content;

                return content;
            } catch (error) {
                console.error(`Error fetching content ${id}:`, error);
                this.error = `Failed to load content: ${error.message}`;
                return null;
            } finally {
                this.isLoading = false;
            }
        },

        async fetchContentMetadata(id: string): Promise<ContentMetadata> {
            // This would fetch from your API or directly from IPFS
            // Simplified implementation
            const response = await fetch(`/api/content/${id}/metadata`);
            return await response.json();
        }
    },
});
