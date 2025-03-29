// Type aliases for better clarity and type safety
export type ContentType = 'video' | 'audio' | 'image' | 'article';
export type LicenseType = 'cc0' | 'cc-by' | 'cc-by-sa' | 'copyright' | 'other';

/**
 * Stream request structure
 * @interface StreamRequest
 * @property {string} userId - User identifier
 * @property {number} amount - Amount to stream
 * @property {string} currency - Currency type
 */
export interface StreamRequest {
    userId: string;
    amount: number;
    currency: string;
}

/**
 * Stream response structure
 * @interface StreamResponse
 * @property {boolean} success - Indicates if the stream request was successful
 * @property {string} message - Response message
 * @property {string} [streamId] - Optional stream identifier
 */
export interface StreamResponse {
    success: boolean;
    message: string;
    streamId?: string;
}

/**
 * Content metadata structure
 * @interface ContentMetadata
 * @property {string} title - The title of the content
 * @property {string} description - Description of the content
 * @property {string} creator - Creator's identifier or name
 * @property {string} [creatorAvatar] - Optional URL to the creator's avatar
 * @property {LicenseType} license - The license type of the content
 * @property {string} preview - URL to the content preview
 * @property {ContentType} type - The type of content (e.g., video, audio)
 * @property {string} [mimeType] - Optional MIME type of the content
 * @property {string} ipfsHash - IPFS hash of the content
 * @property {number} created - Timestamp of when the content was created
 * @property {string[]} [tags] - Optional tags or keywords for the content
 * @example
 * const metadata: ContentMetadata = {
 *   title: "Introduction to Web3",
 *   description: "Learn the basics of Web3 technology",
 *   creator: "John Doe",
 *   license: "cc-by",
 *   preview: "https://example.com/preview.jpg",
 *   type: "video",
 *   ipfsHash: "Qm...",
 *   created: 1681234567890,
 *   tags: ["web3", "blockchain"]
 * };
 */
export interface ContentMetadata {
    title: string;
    description: string;
    creator: string;
    creatorAvatar?: string;
    license: LicenseType;
    preview: string;
    type: ContentType;
    mimeType?: string;
    ipfsHash: string;
    created: number;
    tags?: string[];
}

/**
 * Full content object
 * Extends ContentMetadata with additional properties
 * @interface Content
 * @property {string} id - Unique identifier for the content
 * @property {boolean} [verified] - Indicates if the content is verified
 * @property {boolean} [featured] - Indicates if the content is featured
 * @property {number} [views] - Number of views for the content
 */
export interface Content extends ContentMetadata {
    id: string;
    verified?: boolean;
    featured?: boolean;
    views?: number;
}

/**
 * Extended content metadata structure
 * Adds optional fields for richer metadata
 * @interface ExtendedContentMetadata
 * @property {number} [duration] - Duration in seconds for video/audio content
 * @property {string} [resolution] - Resolution for video content (e.g., "1080p")
 * @property {number} [fileSize] - File size in bytes
 * @property {string[]} [categories] - Categories or tags for the content
 */
export interface ExtendedContentMetadata extends ContentMetadata {
    duration?: number;
    resolution?: string;
    fileSize?: number;
    categories?: string[];
}

/**
 * License information
 * @interface License
 * @property {LicenseType} type - The type of license
 * @property {string} name - The name of the license
 * @property {string} url - URL to the license details
 * @property {boolean} requiresAttribution - Whether attribution is required
 * @property {boolean} allowsCommercialUse - Whether commercial use is allowed
 * @property {boolean} allowsModification - Whether modifications are allowed
 */
export interface License {
    type: LicenseType;
    name: string;
    url: string;
    requiresAttribution: boolean;
    allowsCommercialUse: boolean;
    allowsModification: boolean;
}

/**
 * Wallet connection state
 * @interface WalletState
 * @property {string} address - Wallet address
 * @property {boolean} isConnected - Connection status
 * @property {number} chainId - Blockchain chain ID
 * @property {string} networkName - Name of the blockchain network
 * @property {string} balance - Wallet balance
 */
export interface WalletState {
    address: string;
    isConnected: boolean;
    chainId: number;
    networkName: string;
    balance: string;
}

/**
 * Wallet connection details
 * @interface WalletConnection
 * @property {string} address - Wallet address
 * @property {number} chainId - Blockchain chain ID
 * @property {string} networkName - Name of the blockchain network
 * @property {string} balance - Wallet balance
 * @property {boolean} isConnected - Connection status
 */
export interface WalletConnection {
    address: string;
    chainId: number;
    networkName: string;
    balance: string;
    isConnected: boolean;
}

/**
 * API error response
 * @interface ApiError
 * @property {string} code - Error code
 * @property {string} message - Error message
 * @property {any} [details] - Additional error details
 */
export interface ApiError {
    code: string;
    message: string;
    details?: any;
}

/**
 * API response structure
 * @template T
 * @interface ApiResponse
 * @property {boolean} success - Indicates if the API call was successful
 * @property {T} data - The data returned by the API
 * @property {string} [error] - Error message if the API call failed
 */
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    error?: string;
}

/**
 * Paginated API response
 * Extends ApiResponse with pagination details
 * @template T
 * @interface PaginatedResponse
 * @property {number} currentPage - Current page number
 * @property {number} totalPages - Total number of pages
 * @property {number} totalItems - Total number of items
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    currentPage: number;
    totalPages: number;
    totalItems: number;
}