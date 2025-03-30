/**
 * SDK Types and Interfaces
 */

// SDK configuration options
export interface SDKOptions {
    apiKey?: string;
    environment?: SDKEnvironment;
    baseUrl?: string;
    timeout?: number;
    retryAttempts?: number;
    authToken?: string;
    walletProvider?: any; // Compatible with ethers.js providers
    persistCache?: boolean;
    disableTelemetry?: boolean;
    logLevel?: 'error' | 'warn' | 'info' | 'debug';
}

// Environment types for SDK
export enum SDKEnvironment {
    PRODUCTION = 'production',
    STAGING = 'staging',
    DEVELOPMENT = 'development',
    LOCAL = 'local'
}

// Standard API response wrapper
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: ErrorResponse;
    meta?: {
        timestamp: number;
        requestId: string;
        processingTimeMs: number;
    };
}

// Error response structure
export interface ErrorResponse {
    code: string;
    message: string;
    details?: any;
}

// Paginated response structure
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

// Content types
export interface Content {
    id: string;
    title: string;
    description: string;
    creatorId: string;
    contentType: ContentType;
    thumbnailUrl: string;
    duration: number;
    status: ContentStatus;
    createdAt: string;
    updatedAt: string;
    viewCount: number;
    access: AccessType;
    pricing?: ContentPricing;
    metadata?: Record<string, any>;
    ipfsHash?: string;
}

export enum ContentType {
    VIDEO = 'video',
    AUDIO = 'audio',
    IMAGE = 'image',
    TEXT = 'text',
    LIVESTREAM = 'livestream'
}

export enum ContentStatus {
    DRAFT = 'draft',
    PROCESSING = 'processing',
    PUBLISHED = 'published',
    SCHEDULED = 'scheduled',
    ARCHIVED = 'archived',
    REJECTED = 'rejected'
}

export enum AccessType {
    PUBLIC = 'public',
    SUBSCRIPTION = 'subscription',
    PAY_PER_VIEW = 'pay_per_view',
    PRIVATE = 'private',
    NFT_HOLDERS = 'nft_holders'
}

export interface ContentPricing {
    type: 'one_time' | 'time_based';
    amount: string;
    currency: string;
    paymentOptions: string[];
}

// User types
export interface User {
    id: string;
    username: string;
    displayName: string;
    bio?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    isCreator: boolean;
    walletAddresses?: string[];
    createdAt: string;
    stats?: UserStats;
    socialLinks?: SocialLink[];
}

export interface UserStats {
    followers: number;
    following: number;
    totalContent: number;
    totalViews: number;
}

export interface SocialLink {
    platform: 'twitter' | 'youtube' | 'instagram' | 'tiktok' | 'website' | 'discord' | 'vk';
    url: string;
}

// Stream types
export interface Stream {
    id: string;
    title: string;
    description: string;
    creatorId: string;
    status: StreamStatus;
    startTime?: string;
    endTime?: string;
    thumbnailUrl?: string;
    viewerCount: number;
    access: AccessType;
    pricing?: ContentPricing;
    playbackUrls?: PlaybackUrls;
    chatEnabled: boolean;
}

export enum StreamStatus {
    SCHEDULED = 'scheduled',
    LIVE = 'live',
    ENDED = 'ended',
    ARCHIVED = 'archived'
}

export interface PlaybackUrls {
    hls?: string;
    dash?: string;
    rtmp?: string;
    webRTC?: string;
}

// Payment types
export interface Transaction {
    id: string;
    type: TransactionType;
    status: TransactionStatus;
    fromAddress: string;
    toAddress: string;
    amount: string;
    currency: string;
    networkFee?: string;
    txHash?: string;
    blockNumber?: number;
    blockTimestamp?: string;
    contentId?: string;
    streamId?: string;
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

export enum TransactionType {
    PAYMENT = 'payment',
    SUBSCRIPTION = 'subscription',
    DONATION = 'donation',
    PAYOUT = 'payout',
    REFUND = 'refund',
    PLATFORM_FEE = 'platform_fee'
}

export enum TransactionStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    FAILED = 'failed',
    CANCELED = 'canceled'
}

// Blockchain types
export interface ChainConfig {
    chainId: number;
    name: string;
    rpcUrls: string[];
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    blockExplorerUrls: string[];
}

export interface NFTMetadata {
    name: string;
    description: string;
    image: string;
    external_url?: string;
    attributes?: Array<{
        trait_type: string;
        value: string | number;
    }>;
}

// Event subscription
export interface EventSubscription {
    unsubscribe: () => void;
}
