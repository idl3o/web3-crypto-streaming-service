const workspaceManager = require('./workspaceManager');
const { logError } = require('./errorLogger');

/**
 * A playbox for testing workspace-related functionality.
 */
async function runPlaybox() {
    try {
        console.log('Initializing workspace playbox...');

        // Example: Set a resource in the workspace
        workspaceManager.setResource('testResource', { key: 'value' });
        console.log('Resource set:', workspaceManager.getResource('testResource'));

        // Example: Register a mock connection
        workspaceManager.registerConnection('mockService', { status: 'connected' });
        console.log('Mock connection registered:', workspaceManager.getConnection('mockService'));

        // Example: Clear resources
        workspaceManager.clearResources();
        console.log('Resources cleared:', workspaceManager.getAllResources());
    } catch (error) {
        logError(error);
        console.error('Error in workspace playbox:', error);
    }
}

runPlaybox();
