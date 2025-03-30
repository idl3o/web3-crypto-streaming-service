/**
 * Web3 Crypto Streaming Service SDK
 * Allows third-party applications to integrate with our streaming service
 */

import { W3CStreamingClient } from './client';
import * as Types from './types';

// Export main client
export { W3CStreamingClient };

// Export specialized service clients
export { ContentClient } from './clients/content';
export { PaymentClient } from './clients/payment';
export { AuthClient } from './clients/auth';
export { StreamingClient } from './clients/streaming';
export { BlockchainClient } from './clients/blockchain';
export { MetadataClient } from './clients/metadata';

// Export types
export { Types };

// Re-export common types for convenience
export type {
    SDKOptions,
    SDKEnvironment,
    ApiResponse,
    ErrorResponse,
    PaginatedResponse
} from './types';

// Default export is the main client constructor
export default W3CStreamingClient;
