/**
 * Shorthand Language Composition Service
 * 
 * Provides a concise command language for streamlined interactions
 * with the Web3 Crypto Streaming platform.
 */

import * as BlockchainService from './BlockchainService';
import * as RiceSecurityService from './RiceAdvancedNetworkSecurityService';
import * as JerusalemProtocolService from './JerusalemProtocolService';
import * as MinimalModeService from './MinimalModeService';
import * as ResourceManagementService from './ResourceManagementService';

// Service state
let initialized = false;
const customCommands = new Map();
const commandHistory = new Map();
const commandAliases = new Map();
const userMacros = new Map();

// Standard command definitions with their handlers
const standardCommands = {
    // Connection commands
    "connect": {
        handler: async (args) => {
            await BlockchainService.connectWallet();
            return { success: true, message: "Wallet connected" };
        },
        description: "Connect wallet",
        examples: ["connect"]
    },

    "disconnect": {
        handler: async (args) => {
            await BlockchainService.disconnectWallet();
            return { success: true, message: "Wallet disconnected" };
        },
        description: "Disconnect wallet",
        examples: ["disconnect"]
    },

    // Mode toggles
    "min": {
        handler: async (args) => {
            const state = args[0]?.toLowerCase();
            let newState;

            if (state === "on") {
                newState = MinimalModeService.toggleMinimalMode(true);
            } else if (state === "off") {
                newState = MinimalModeService.toggleMinimalMode(false);
            } else {
                newState = MinimalModeService.toggleMinimalMode();
            }

            return {
                success: true,
                message: `Minimal mode ${newState ? "enabled" : "disabled"}`
            };
        },
        description: "Toggle minimal mode",
        examples: ["min", "min on", "min off"]
    },

    // Transfer commands
    "xfer": {
        handler: async (args) => {
            if (args.length < 3) {
                return {
                    success: false,
                    message: "Usage: xfer [source_network] [dest_network] [content_id] [size_mb?]"
                };
            }

            const sourceNetwork = args[0].toLowerCase();
            const destNetwork = args[1].toLowerCase();
            const contentId = args[2];
            const transferSize = parseInt(args[3] || "100");

            // Validate networks
            const networks = Object.values(JerusalemProtocolService.SUPPORTED_NETWORKS);
            if (!networks.includes(sourceNetwork)) {
                return { success: false, message: `Invalid source network: ${sourceNetwork}` };
            }
            if (!networks.includes(destNetwork)) {
                return { success: false, message: `Invalid destination network: ${destNetwork}` };
            }

            // Get gateway
            const gateways = JerusalemProtocolService.getAvailableGateways({
                sourceNetwork,
                destinationNetwork: destNetwork
            });

            if (gateways.length === 0) {
                return { success: false, message: "No compatible gateways found" };
            }

            // Create transfer
            const transfer = await JerusalemProtocolService.createTransfer({
                contentId,
                sourceNetwork,
                destinationNetwork: destNetwork,
                sourceUrl: `ipfs://content/${contentId}`,
                gatewayId: gateways[0].id,
                transferSize,
                contentType: JerusalemProtocolService.CONTENT_TYPES.MIXED
            });

            return {
                success: true,
                message: `Transfer initiated: ${transfer.transfer.id}`,
                data: transfer.transfer
            };
        },
        description: "Transfer content between networks",
        examples: [
            "xfer ethereum polygon content_123",
            "xfer solana ethereum nft_456 200"
        ]
    },

    // Resource Management commands
    "rm": {
        handler: async (args) => {
            if (args.length < 2) {
                return {
                    success: false,
                    message: "Usage: rm [resource_type] [resource_id] [options]"
                };
            }

            const resourceType = args[0].toLowerCase();
            const resourceId = args[1];
            
            // Parse options
            const options = {};
            for (let i = 2; i < args.length; i++) {
                const arg = args[i];
                if (arg === "--hard") {
                    options.removalType = ResourceManagementService.REMOVAL_TYPE.HARD_DELETE;
                } else if (arg === "--soft") {
                    options.removalType = ResourceManagementService.REMOVAL_TYPE.SOFT_DELETE;
                } else if (arg === "--archive") {
                    options.removalType = ResourceManagementService.REMOVAL_TYPE.ARCHIVE;
                } else if (arg === "--hide") {
                    options.removalType = ResourceManagementService.REMOVAL_TYPE.HIDE;
                } else if (arg === "--quarantine") {
                    options.removalType = ResourceManagementService.REMOVAL_TYPE.QUARANTINE;
                } else if (arg.startsWith("--reason=")) {
                    options.reason = arg.substring(9);
                }
            }
            
            // Ensure resourceType is valid
            const validResourceTypes = Object.values(ResourceManagementService.RESOURCE_TYPE)
                .map(type => type.toLowerCase());
            
            if (!validResourceTypes.includes(resourceType)) {
                return {
                    success: false,
                    message: `Invalid resource type: ${resourceType}. Valid types are: ${validResourceTypes.join(', ')}`
                };
            }
            
            try {
                // Call ResourceManagementService to perform removal
                const result = await ResourceManagementService.removeResource(
                    resourceType.toUpperCase(),
                    resourceId,
                    options
                );
                
                return {
                    success: true,
                    message: `Resource removal initiated: ${result.removal.id}`,
                    data: result.removal
                };
            } catch (error) {
                return {
                    success: false,
                    message: `Error removing resource: ${error.message}`
                };
            }
        },
        description: "Remove or manage resources",
        examples: [
            "rm content content_123",
            "rm stream stream_456 --hard",
            "rm collection collection_789 --archive",
            "rm content content_123 --reason=Outdated content"
        ]
    },

    "rmlist": {
        handler: async (args) => {
            try {
                const removals = await ResourceManagementService.getRemovalsByUser();
                
                if (removals.length === 0) {
                    return {
                        success: true,
                        message: "No removals found",
                        data: []
                    };
                }
                
                // Format removals for display
                const formattedRemovals = removals.map(r => ({
                    id: r.id,
                    resourceType: r.resourceType,
                    resourceId: r.resourceId,
                    status: r.status,
                    removalType: r.removalType,
                    requestTime: new Date(r.requestTime).toLocaleString()
                }));
                
                return {
                    success: true,
                    message: `Found ${removals.length} removals`,
                    data: formattedRemovals
                };
            } catch (error) {
                return {
                    success: false,
                    message: `Error listing removals: ${error.message}`
                };
            }
        },
        description: "List your resource removal operations",
        examples: ["rmlist"]
    },

    "rmrevert": {
        handler: async (args) => {
            if (args.length < 1) {
                return {
                    success: false,
                    message: "Usage: rmrevert [removal_id]"
                };
            }
            
            const removalId = args[0];
            
            try {
                const result = await ResourceManagementService.revertRemoval(removalId);
                
                if (result.success) {
                    return {
                        success: true,
                        message: `Successfully reverted removal ${removalId}`,
                        data: result.removal
                    };
                } else {
                    return {
                        success: false,
                        message: result.message
                    };
                }
            } catch (error) {
                return {
                    success: false,
                    message: `Error reverting removal: ${error.message}`
                };
            }
        },
        description: "Revert a resource removal operation",
        examples: ["rmrevert rm_1234567890_abcdef"]
    },

    // Composition operators
    "pipe": {
        handler: async (args, context) => {
            if (!context.previousResult || !context.previousResult.success) {
                return {
                    success: false,
                    message: "Nothing to pipe from previous command"
                };
            }

            // Use previous command's output as first argument to the next command
            if (context.previousResult.data) {
                args.unshift(context.previousResult.data);
            } else {
                args.unshift(context.previousResult.message);
            }

            return { success: true, message: "Piped data to next command", piped: true };
        },
        description: "Pipe output from previous command to the next command",
        examples: ["command1 | command2"]
    },

    // Utility commands
    "echo": {
        handler: async (args) => {
            const message = args.join(" ");
            return { success: true, message };
        },
        description: "Display text",
        examples: ["echo Hello world"]
    },

    "help": {
        handler: async (args) => {
            // Return list of commands with descriptions
            const command = args[0];

            if (command) {
                // Get help for specific command
                const cmdInfo = standardCommands[command] || customCommands.get(command);
                if (!cmdInfo) {
                    return { success: false, message: `Command not found: ${command}` };
                }

                return {
                    success: true,
                    message: `${command}: ${cmdInfo.description}\nExamples:\n${cmdInfo.examples.join('\n')}`
                };
            }

            // List all commands
            const allCommands = [
                ...Object.keys(standardCommands),
                ...Array.from(customCommands.keys())
            ];

            return {
                success: true,
                message: `Available commands:\n${allCommands.sort().join(', ')}`
            };
        },
        description: "Display help information",
        examples: ["help", "help xfer"]
    },

    "define": {
        handler: async (args) => {
            if (args.length < 2) {
                return { success: false, message: "Usage: define [name] [command sequence]" };
            }

            const name = args[0];
            const commandSequence = args.slice(1).join(" ");

            await defineUserMacro(name, commandSequence);

            return {
                success: true,
                message: `Macro '${name}' defined successfully`
            };
        },
        description: "Define a custom macro command",
        examples: ["define quickTransfer xfer ethereum polygon"]
    }
};

/**
 * Initialize the Shorthand Language Composition service
 * @param {Object} options Configuration options
 * @returns {Promise<boolean>} Success status
 */
export async function initShortHandLanguage(options = {}) {
    if (initialized) {
        return true;
    }

    try {
        console.log('Initializing Shorthand Language Composition Service...');

        // Initialize the RICE security service if not already initialized
        if (!RiceSecurityService.getSecurityMetrics()) {
            await RiceSecurityService.initSecurityService();
        }

        // Register standard aliases
        setupCommandAliases();

        // If wallet is connected, load user macros
        if (BlockchainService.isConnected()) {
            const userAddress = BlockchainService.getCurrentAccount();
            await loadUserMacros(userAddress);
        }

        initialized = true;
        console.log('Shorthand Language Composition Service initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize Shorthand Language Service:', error);
        return false;
    }
}

/**
 * Setup standard command aliases
 */
function setupCommandAliases() {
    // Wallet commands
    commandAliases.set("c", "connect");
    commandAliases.set("d", "disconnect");

    // Transfer aliases
    commandAliases.set("transfer", "xfer");
    commandAliases.set("x", "xfer");

    // Mode toggles
    commandAliases.set("minimal", "min");

    // Utility aliases
    commandAliases.set("?", "help");
    commandAliases.set("print", "echo");

    // Resource Management aliases
    commandAliases.set("remove", "rm");
    commandAliases.set("delete", "rm");
    commandAliases.set("removals", "rmlist");
    commandAliases.set("undo", "rmrevert");
}

/**
 * Load user-defined macros
 * @param {string} userAddress User's wallet address
 */
async function loadUserMacros(userAddress) {
    if (!userAddress) return;

    const normalizedAddress = userAddress.toLowerCase();

    // In a real implementation, this would load macros from persistent storage
    // For this example, we'll create some sample macros

    if (!userMacros.has(normalizedAddress)) {
        userMacros.set(normalizedAddress, new Map());
    }

    const userMacroMap = userMacros.get(normalizedAddress);

    // Add some sample macros if none exist
    if (userMacroMap.size === 0) {
        userMacroMap.set("poly2eth", "xfer polygon ethereum");
        userMacroMap.set("eth2poly", "xfer ethereum polygon");
    }
}

/**
 * Parse and execute a command string
 * @param {string} commandString Command string to execute
 * @param {Object} options Execution options
 * @returns {Promise<Object>} Execution result
 */
export async function executeCommand(commandString, options = {}) {
    if (!initialized) {
        await initShortHandLanguage();
    }

    try {
        // Parse command string into command tokens
        const tokens = parseCommandString(commandString);

        // Process each command in the pipeline
        let context = { previousResult: null };
        let results = [];

        for (const commandTokens of tokens) {
            const result = await processSingleCommand(commandTokens, context);
            results.push(result);
            context.previousResult = result;

            // Stop processing on failure unless force continue is specified
            if (!result.success && !options.forceContinue) {
                break;
            }
        }

        // Record command in history if wallet is connected
        if (BlockchainService.isConnected()) {
            recordCommandHistory(commandString, results[results.length - 1]);
        }

        // Return the last result
        return results[results.length - 1];
    } catch (error) {
        console.error('Error executing command:', error);
        return {
            success: false,
            message: `Error: ${error.message}`
        };
    }
}

/**
 * Parse a command string into tokens
 * @param {string} commandString Command string to parse
 * @returns {Array} Array of command tokens
 */
function parseCommandString(commandString) {
    // Split by pipe operator to handle composition
    const commands = commandString.split('|').map(cmd => cmd.trim());

    // Process each command into tokens
    return commands.map(cmd => {
        // Basic tokenization (respecting quoted strings)
        const tokens = [];
        let current = '';
        let inQuote = false;

        for (let i = 0; i < cmd.length; i++) {
            const char = cmd[i];

            if (char === '"' && (i === 0 || cmd[i - 1] !== '\\')) {
                inQuote = !inQuote;
                continue;
            }

            if (char === ' ' && !inQuote) {
                if (current) {
                    tokens.push(current);
                    current = '';
                }
            } else {
                current += char;
            }
        }

        if (current) {
            tokens.push(current);
        }

        return tokens;
    });
}

/**
 * Process a single command
 * @param {Array} tokens Command tokens
 * @param {Object} context Execution context
 * @returns {Promise<Object>} Command result
 */
async function processSingleCommand(tokens, context) {
    if (!tokens || tokens.length === 0) {
        return { success: false, message: "Empty command" };
    }

    const commandName = tokens[0];
    const args = tokens.slice(1);

    // Check if this is a pipeline operator
    if (commandName === "|" || commandName === "pipe") {
        return standardCommands.pipe.handler(args, context);
    }

    // Check for alias
    const resolvedCommand = commandAliases.get(commandName) || commandName;

    // Check for user macro (if wallet is connected)
    let macroCommand = null;
    if (BlockchainService.isConnected()) {
        const userAddress = BlockchainService.getCurrentAccount().toLowerCase();
        const userMacroMap = userMacros.get(userAddress);

        if (userMacroMap && userMacroMap.has(resolvedCommand)) {
            macroCommand = userMacroMap.get(resolvedCommand);
        }
    }

    if (macroCommand) {
        // Execute macro (with args appended)
        const fullCommand = `${macroCommand} ${args.join(' ')}`;
        return executeCommand(fullCommand);
    }

    // Find command handler
    const command = standardCommands[resolvedCommand] || customCommands.get(resolvedCommand);

    if (!command) {
        return {
            success: false,
            message: `Unknown command: ${commandName}`
        };
    }

    // Execute command
    try {
        return await command.handler(args, context);
    } catch (error) {
        return {
            success: false,
            message: `Error executing '${commandName}': ${error.message}`
        };
    }
}

/**
 * Record command in history
 * @param {string} command Command string
 * @param {Object} result Execution result
 */
function recordCommandHistory(command, result) {
    const userAddress = BlockchainService.getCurrentAccount().toLowerCase();

    if (!commandHistory.has(userAddress)) {
        commandHistory.set(userAddress, []);
    }

    const history = commandHistory.get(userAddress);

    history.push({
        command,
        result,
        timestamp: Date.now()
    });

    // Keep history to a reasonable size
    if (history.length > 100) {
        history.shift();
    }
}

/**
 * Get command history for a user
 * @param {string} userAddress User's wallet address (optional)
 * @returns {Array} Command history
 */
export function getCommandHistory(userAddress) {
    const address = userAddress ||
        (BlockchainService.isConnected() ? BlockchainService.getCurrentAccount() : null);

    if (!address) {
        return [];
    }

    const history = commandHistory.get(address.toLowerCase()) || [];
    return [...history]; // Return a copy
}

/**
 * Register a custom command
 * @param {string} name Command name
 * @param {Object} commandDefinition Command definition with handler, description, and examples
 * @returns {boolean} Success status
 */
export function registerCommand(name, commandDefinition) {
    if (!name || !commandDefinition || !commandDefinition.handler) {
        return false;
    }

    // Register command
    customCommands.set(name, {
        handler: commandDefinition.handler,
        description: commandDefinition.description || "Custom command",
        examples: commandDefinition.examples || []
    });

    return true;
}

/**
 * Define a user macro
 * @param {string} name Macro name
 * @param {string} commandSequence Command sequence
 * @returns {Promise<boolean>} Success status
 */
export async function defineUserMacro(name, commandSequence) {
    if (!BlockchainService.isConnected()) {
        throw new Error('Wallet must be connected to define macros');
    }

    const userAddress = BlockchainService.getCurrentAccount().toLowerCase();

    if (!userMacros.has(userAddress)) {
        userMacros.set(userAddress, new Map());
    }

    const userMacroMap = userMacros.get(userAddress);
    userMacroMap.set(name, commandSequence);

    // In a real implementation, we would persist this to storage
    return true;
}

/**
 * Get user macros
 * @param {string} userAddress User's wallet address (optional)
 * @returns {Object} User macros
 */
export function getUserMacros(userAddress) {
    const address = userAddress ||
        (BlockchainService.isConnected() ? BlockchainService.getCurrentAccount() : null);

    if (!address) {
        return {};
    }

    const userMacroMap = userMacros.get(address.toLowerCase());

    if (!userMacroMap) {
        return {};
    }

    return Object.fromEntries(userMacroMap);
}

/**
 * Get command aliases
 * @returns {Object} Command aliases
 */
export function getCommandAliases() {
    return Object.fromEntries(commandAliases);
}

/**
 * Get available commands
 * @returns {Array} Available commands
 */
export function getAvailableCommands() {
    const commands = [
        ...Object.entries(standardCommands).map(([name, cmd]) => ({
            name,
            description: cmd.description,
            examples: cmd.examples,
            isStandard: true
        })),
        ...Array.from(customCommands.entries()).map(([name, cmd]) => ({
            name,
            description: cmd.description,
            examples: cmd.examples,
            isStandard: false
        }))
    ];

    return commands;
}

export default {
    initShortHandLanguage,
    executeCommand,
    registerCommand,
    defineUserMacro,
    getCommandHistory,
    getUserMacros,
    getCommandAliases,
    getAvailableCommands
};
