/**
 * Content Client
 * Handles operations related to content management
 */

import { BaseClient } from './base-client';
import {
    ApiResponse,
    Content,
    PaginatedResponse,
    ContentType,
    AccessType
} from '../types';

export interface ContentSearchParams {
    query?: string;
    creatorId?: string;
    contentType?: ContentType;
    access?: AccessType;
    page?: number;
    pageSize?: number;
    sortBy?: 'newest' | 'popular' | 'trending';
}

export interface ContentUploadMetadata {
    title: string;
    description?: string;
    contentType: ContentType;
    access: AccessType;
    pricing?: {
        type: 'one_time' | 'time_based';
        amount: string;
        currency: string;
    };
    thumbnail?: Blob;
    nftMetadata?: {
        tokenId?: string;
        contractAddress?: string;
        chain?: string;
    };
    customMetadata?: Record<string, any>;
}

export class ContentClient extends BaseClient {
    /**
     * Get content by ID
     * @param contentId ID of the content to retrieve
     */
    public async getContent(contentId: string): Promise<ApiResponse<Content>> {
        return this.request<Content>(`/content/${contentId}`);
    }

    /**
     * Search for content
     * @param params Search parameters
     */
    public async searchContent(params: ContentSearchParams): Promise<ApiResponse<PaginatedResponse<Content>>> {
        return this.request<PaginatedResponse<Content>>('/content/search', 'GET', undefined, params as any);
    }

    /**
     * Get popular content
     * @param limit Maximum number of items to return
     */
    public async getPopularContent(limit: number = 10): Promise<ApiResponse<Content[]>> {
        return this.request<Content[]>('/content/popular', 'GET', undefined, { limit: limit.toString() });
    }

    /**
     * Get content by creator
     * @param creatorId ID of the content creator
     * @param page Page number
     * @param pageSize Number of items per page
     */
    public async getCreatorContent(
        creatorId: string,
        page: number = 1,
        pageSize: number = 20
    ): Promise<ApiResponse<PaginatedResponse<Content>>> {
        return this.request<PaginatedResponse<Content>>(
            '/content/creator',
            'GET',
            undefined,
            { creatorId, page: page.toString(), pageSize: pageSize.toString() }
        );
    }

    /**
     * Initialize content upload
     * @param metadata Content metadata
     */
    public async initializeUpload(metadata: ContentUploadMetadata): Promise<ApiResponse<{
        contentId: string;
        uploadUrl: string;
        tokenData?: {
            token: string;
            expiresAt: string;
        }
    }>> {
        return this.request<{ contentId: string; uploadUrl: string; tokenData?: { token: string; expiresAt: string } }>(
            '/content/upload/initialize',
            'POST',
            metadata
        );
    }

    /**
     * Finalize content upload
     * @param contentId ID of the uploaded content
     * @param checksum Content checksum for verification
     */
    public async finalizeUpload(contentId: string, checksum: string): Promise<ApiResponse<{ status: string }>> {
        return this.request<{ status: string }>(
            '/content/upload/finalize',
            'POST',
            { contentId, checksum }
        );
    }

    /**
     * Update content metadata
     * @param contentId ID of the content to update
     * @param metadata Updated metadata
     */
    public async updateContent(contentId: string, metadata: Partial<ContentUploadMetadata>): Promise<ApiResponse<Content>> {
        return this.request<Content>(
            `/content/${contentId}`,
            'PUT',
            metadata
        );
    }

    /**
     * Delete content
     * @param contentId ID of the content to delete
     */
    public async deleteContent(contentId: string): Promise<ApiResponse<{ success: boolean }>> {
        return this.request<{ success: boolean }>(
            `/content/${contentId}`,
            'DELETE'
        );
    }

    /**
     * Generate secure playback URL
     * @param contentId ID of the content
     * @param expiresIn URL expiration time in seconds
     */
    public async getPlaybackUrl(contentId: string, expiresIn: number = 3600): Promise<ApiResponse<{
        url: string;
        expiresAt: string;
    }>> {
        return this.request<{ url: string; expiresAt: string }>(
            '/content/playback',
            'POST',
            { contentId, expiresIn }
        );
    }
}
