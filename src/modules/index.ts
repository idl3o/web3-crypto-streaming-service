// Export all modules
export * from './blockchain';
export * from './ipfs';
export * from './streaming';
export * from './wallet';
export * from './logger';
export * from './config';

// Import all modules to initialize them
import { blockchain } from './blockchain';
import { ipfs } from './ipfs';
import { streaming } from './streaming';
import { wallet } from './wallet';
import { logger } from './logger';
import { config } from './config';

// Export a single object with all modules
export const modules = {
    blockchain,
    ipfs,
    streaming,
    wallet,
    logger,
    config
};
