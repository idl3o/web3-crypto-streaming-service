// Type aliases for better clarity and type safety
export type ContentFormat = 'text' | 'markdown' | 'html' | 'latex' | 'code';
export type NotebookAccessLevel = 'private' | 'public' | 'shared' | 'organization';

/**
 * Notebook structure
 * @interface Notebook
 * @property {string} id - Unique identifier for the notebook
 * @property {string} title - The title of the notebook
 * @property {string} description - Description of the notebook
 * @property {string} ownerId - Owner identifier
 * @property {NotebookAccessLevel} accessLevel - Access level of the notebook
 * @property {string[]} [collaborators] - List of collaborator IDs
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 */
export interface Notebook {
    id: string;
    title: string;
    description: string;
    ownerId: string;
    accessLevel: NotebookAccessLevel;
    collaborators?: string[];
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Note structure within a notebook
 * @interface Note
 * @property {string} id - Unique identifier for the note
 * @property {string} notebookId - ID of the parent notebook
 * @property {string} title - The title of the note
 * @property {string} content - Content of the note
 * @property {ContentFormat} format - Format of the note content
 * @property {string[]} [tags] - Optional tags for the note
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 * @property {LLMQuery[]} [llmQueries] - Optional history of LLM queries
 */
export interface Note {
    id: string;
    notebookId: string;
    title: string;
    content: string;
    format: ContentFormat;
    tags?: string[];
    createdAt: Date;
    updatedAt: Date;
    llmQueries?: LLMQuery[];
}

/**
 * LLM Query structure
 * @interface LLMQuery
 * @property {string} id - Unique identifier for the query
 * @property {string} noteId - ID of the associated note
 * @property {string} query - The prompt/query sent to the LLM
 * @property {string} response - The response from the LLM
 * @property {string} model - The LLM model used
 * @property {Date} timestamp - When the query was made
 * @property {number} [tokens] - Optional token count used
 */
export interface LLMQuery {
    id: string;
    noteId: string;
    query: string;
    response: string;
    model: string;
    timestamp: Date;
    tokens?: number;
}

/**
 * Search query parameters
 * @interface SearchParams
 * @property {string} [query] - Search query string
 * @property {string[]} [tags] - Tags to filter by
 * @property {Date} [fromDate] - Start date range
 * @property {Date} [toDate] - End date range
 * @property {string} [notebookId] - Filter by notebook
 * @property {ContentFormat} [format] - Filter by content format
 */
export interface SearchParams {
    query?: string;
    tags?: string[];
    fromDate?: Date;
    toDate?: Date;
    notebookId?: string;
    format?: ContentFormat;
}

/**
 * LLM model configuration
 * @interface LLMConfig
 * @property {string} model - Model identifier
 * @property {number} temperature - Temperature setting for generation
 * @property {number} maxTokens - Maximum tokens to generate
 * @property {boolean} streaming - Whether to use streaming response
 * @property {Record<string, any>} [additionalParams] - Additional model parameters
 */
export interface LLMConfig {
    model: string;
    temperature: number;
    maxTokens: number;
    streaming: boolean;
    additionalParams?: Record<string, any>;
}

/**
 * Blockchain wallet connection
 * @interface WalletConnection
 * @property {string} address - Wallet address
 * @property {string} network - Blockchain network name (e.g., Ethereum, Polygon)
 * @property {number} chainId - Chain ID of the blockchain network
 * @property {string} balance - Wallet balance in the native currency
 * @property {boolean} isConnected - Connection status
 */
export interface WalletConnection {
    address: string;
    network: string;
    chainId: number;
    balance: string;
    isConnected: boolean;
}

/**
 * Blockchain transaction record
 * @interface TransactionRecord
 * @property {string} id - Unique transaction identifier (e.g., transaction hash)
 * @property {string} walletAddress - Address of the wallet initiating the transaction
 * @property {string} to - Recipient address
 * @property {string} amount - Amount transferred
 * @property {string} currency - Currency type (e.g., ETH, USDT)
 * @property {string} status - Status of the transaction (e.g., pending, confirmed, failed)
 * @property {Date} timestamp - Timestamp of the transaction
 */
export interface TransactionRecord {
    id: string;
    walletAddress: string;
    to: string;
    amount: string;
    currency: string;
    status: 'pending' | 'confirmed' | 'failed';
    timestamp: Date;
}

/**
 * Smart contract interaction
 * @interface SmartContractInteraction
 * @property {string} contractAddress - Address of the smart contract
 * @property {string} methodName - Name of the method being called
 * @property {Record<string, any>} parameters - Parameters passed to the method
 * @property {TransactionRecord} transaction - Associated transaction record
 */
export interface SmartContractInteraction {
    contractAddress: string;
    methodName: string;
    parameters: Record<string, any>;
    transaction: TransactionRecord;
}

/**
 * Data import configuration
 * @interface ImportOptions
 * @property {string} format - Format of the data being imported (e.g., JSON, CSV)
 * @property {boolean} overwrite - Whether to overwrite existing data
 * @property {string} [source] - Optional source identifier (e.g., URL, file path)
 */
export interface ImportOptions {
    format: 'json' | 'csv' | 'xml';
    overwrite: boolean;
    source?: string;
}

/**
 * Crypto token reference
 * @interface TokenReference
 * @property {string} tokenId - Unique identifier for the token
 * @property {string} contractAddress - Address of the token's smart contract
 * @property {string} ownerAddress - Address of the token owner
 * @property {string} metadataUrl - URL to the token's metadata
 */
export interface TokenReference {
    tokenId: string;
    contractAddress: string;
    ownerAddress: string;
    metadataUrl: string;
}

/**
 * Market data structure
 * @interface MarketData
 * @property {string} symbol - Trading pair symbol (e.g., BTC/USDT)
 * @property {number} price - Current price of the asset
 * @property {number} volume - Trading volume in the last 24 hours
 * @property {number} change - Percentage change in price over the last 24 hours
 * @property {Date} timestamp - Timestamp of the market data
 */
export interface MarketData {
    symbol: string;
    price: number;
    volume: number;
    change: number;
    timestamp: Date;
}

/**
 * Trading analysis template
 * @interface TradingAnalysis
 * @property {string} id - Unique identifier for the analysis
 * @property {string} title - Title of the analysis
 * @property {string} description - Description of the analysis
 * @property {MarketData[]} marketData - Array of market data used in the analysis
 * @property {string} strategy - Trading strategy description
 * @property {Date} createdAt - Creation timestamp
 */
export interface TradingAnalysis {
    id: string;
    title: string;
    description: string;
    marketData: MarketData[];
    strategy: string;
    createdAt: Date;
}