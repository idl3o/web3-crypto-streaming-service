/**
 * Streaming Client
 * Handles live streaming operations
 */

import { BaseClient } from './base-client';
import {
    ApiResponse,
    Stream,
    StreamStatus,
    AccessType,
    PaginatedResponse,
    EventSubscription
} from '../types';

export interface StreamOptions {
    title: string;
    description?: string;
    scheduledStartTime?: string;
    thumbnailUrl?: string;
    access: AccessType;
    pricing?: {
        type: 'one_time' | 'time_based';
        amount: string;
        currency: string;
    };
    chatEnabled?: boolean;
    customMetadata?: Record<string, any>;
}

export class StreamingClient extends BaseClient {
    /**
     * Get stream by ID
     * @param streamId ID of the stream to retrieve
     */
    public async getStream(streamId: string): Promise<ApiResponse<Stream>> {
        return this.request<Stream>(`/streams/${streamId}`);
    }

    /**
     * Create a new stream
     * @param options Stream configuration options
     */
    public async createStream(options: StreamOptions): Promise<ApiResponse<{
        stream: Stream;
        streamKey: string;
        ingestEndpoint: string;
    }>> {
        return this.request<{ stream: Stream; streamKey: string; ingestEndpoint: string }>(
            '/streams/create',
            'POST',
            options
        );
    }

    /**
     * Update stream metadata
     * @param streamId ID of the stream to update
     * @param options Updated stream options
     */
    public async updateStream(streamId: string, options: Partial<StreamOptions>): Promise<ApiResponse<Stream>> {
        return this.request<Stream>(
            `/streams/${streamId}`,
            'PUT',
            options
        );
    }

    /**
     * Start a stream
     * @param streamId ID of the stream to start
     */
    public async startStream(streamId: string): Promise<ApiResponse<{ status: StreamStatus }>> {
        return this.request<{ status: StreamStatus }>(
            `/streams/${streamId}/start`,
            'POST'
        );
    }

    /**
     * End a stream
     * @param streamId ID of the stream to end
     */
    public async endStream(streamId: string): Promise<ApiResponse<{ status: StreamStatus }>> {
        return this.request<{ status: StreamStatus }>(
            `/streams/${streamId}/end`,
            'POST'
        );
    }

    /**
     * Get live streams
     * @param page Page number
     * @param pageSize Items per page
     */
    public async getLiveStreams(page: number = 1, pageSize: number = 20): Promise<ApiResponse<PaginatedResponse<Stream>>> {
        return this.request<PaginatedResponse<Stream>>(
            '/streams/live',
            'GET',
            undefined,
            { page: page.toString(), pageSize: pageSize.toString() }
        );
    }

    /**
     * Get upcoming scheduled streams
     * @param page Page number
     * @param pageSize Items per page
     */
    public async getUpcomingStreams(page: number = 1, pageSize: number = 20): Promise<ApiResponse<PaginatedResponse<Stream>>> {
        return this.request<PaginatedResponse<Stream>>(
            '/streams/upcoming',
            'GET',
            undefined,
            { page: page.toString(), pageSize: pageSize.toString() }
        );
    }

    /**
     * Get creator's streams
     * @param creatorId Creator's user ID
     * @param status Filter by stream status
     * @param page Page number
     * @param pageSize Items per page
     */
    public async getCreatorStreams(
        creatorId: string,
        status?: StreamStatus,
        page: number = 1,
        pageSize: number = 20
    ): Promise<ApiResponse<PaginatedResponse<Stream>>> {
        const params: Record<string, string> = {
            creatorId,
            page: page.toString(),
            pageSize: pageSize.toString()
        };

        if (status) {
            params.status = status;
        }

        return this.request<PaginatedResponse<Stream>>(
            '/streams/creator',
            'GET',
            undefined,
            params
        );
    }

    /**
     * Generate viewer access token for a stream
     * @param streamId Stream ID
     */
    public async getViewerToken(streamId: string): Promise<ApiResponse<{
        token: string;
        expiresAt: string;
        playbackUrl: string;
    }>> {
        return this.request<{ token: string; expiresAt: string; playbackUrl: string }>(
            `/streams/${streamId}/viewer-token`,
            'POST'
        );
    }

    /**
     * Subscribe to stream events
     * @param streamId Stream ID
     * @param onViewerCountChange Callback for viewer count changes
     * @param onStreamStateChange Callback for stream state changes
     */
    public subscribeToStreamEvents(
        streamId: string,
        onViewerCountChange?: (count: number) => void,
        onStreamStateChange?: (status: StreamStatus) => void
    ): EventSubscription {
        // This would typically connect to a WebSocket or SSE endpoint
        // For simplicity, we're just returning an unsubscribe function
        console.log(`Subscribed to events for stream ${streamId}`);

        // In a real implementation, this would return an actual event subscription
        return {
            unsubscribe: () => {
                console.log(`Unsubscribed from events for stream ${streamId}`);
            }
        };
    }
}
