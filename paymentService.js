const Stripe = require('stripe');
const stripe = new Stripe('your-stripe-secret-key'); // Replace with your Stripe secret key
const PDFDocument = require('pdfkit');
const fs = require('fs');
const { exec } = require('child_process');
const workspaceManager = require('./workspaceManager');
const { logError } = require('./errorLogger');

/**
 * Process a payment using Stripe.
 * @param {string} paymentMethodId - The payment method ID from the client.
 * @param {number} amount - The amount to charge in cents.
 * @param {string} currency - The currency (e.g., 'usd').
 * @returns {Promise<object>} - The payment intent result.
 */
async function processPayment(paymentMethodId, amount, currency = 'usd') {
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency,
            payment_method: paymentMethodId,
            confirm: true,
        });
        console.log('Payment successful:', paymentIntent);
        return paymentIntent;
    } catch (error) {
        logError(error);
        console.error('Error processing payment:', error);
        throw error;
    }
}

/**
 * Increase tokens for a user account
 * @param {string} userId - The user's ID
 * @param {number} tokenAmount - Amount of tokens to add
 * @param {string} paymentMethodId - The payment method ID from the client
 * @param {number} cost - The cost in cents for the tokens
 * @returns {Promise<object>} - Object containing payment and token information
 */
async function increaseTokens(userId, tokenAmount, paymentMethodId, cost) {
    try {
        // First validate the payment through Stripe's payment processing
        // This ensures funds are available before allocating tokens
        const paymentResult = await processPayment(paymentMethodId, cost);
        
        if (paymentResult.status === 'succeeded') {
            // Token Management System Integration Point
            // TODO: Implement these steps in your token management system:
            // 1. Verify user account exists
            // 2. Check for any token limits or restrictions
            // 3. Update token balance in database
            // 4. Record transaction history
            const tokenUpdate = {
                userId,
                addedTokens: tokenAmount,
                timestamp: new Date(),
                transactionId: paymentResult.id,
                // Additional fields to consider:
                // - previousBalance
                // - newBalance
                // - tokenRate (tokens per currency unit)
            };
            
            console.log('Tokens increased successfully:', tokenUpdate);
            return tokenUpdate;
        }
        
        // If payment succeeded but we reach this point,
        // there was likely an issue with the token management system
        throw new Error('Payment processed but token increase failed - check token management system');
    } catch (error) {
        logError(error);
        // Log detailed error for debugging while keeping user message generic
        console.error('Error increasing tokens:', {
            error,
            userId,
            tokenAmount,
            cost
        });
        throw error;
    }
}

/**
 * Export transaction details to PDF
 * @param {object} transaction - Transaction details
 * @param {string} outputPath - Path to save the PDF
 * @returns {Promise<string>} - Path to the generated PDF
 */
async function exportTransactionPDF(transaction, outputPath) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument();
            const stream = fs.createWriteStream(outputPath);
            
            doc.pipe(stream);
            
            // Add content to PDF
            doc.fontSize(20).text('Transaction Receipt', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12);
            doc.text(`Transaction ID: ${transaction.transactionId}`);
            doc.text(`User ID: ${transaction.userId}`);
            doc.text(`Tokens Added: ${transaction.addedTokens}`);
            doc.text(`Date: ${transaction.timestamp}`);
            
            doc.end();
            
            stream.on('finish', () => {
                resolve(outputPath);
            });
            
            stream.on('error', reject);
        } catch (error) {
            logError(error);
            reject(error);
        }
    });
}

/**
 * Create a Git commit with a standardized message
 * @param {object} transactionDetails - Details of the transaction
 * @returns {Promise<string>} - Commit hash
 */
async function gitCommit(transactionDetails) {
    return new Promise((resolve, reject) => {
        const commitMessage = `feat(payment): Process transaction ${transactionDetails.transactionId}

- User: ${transactionDetails.userId}
- Tokens: ${transactionDetails.addedTokens}
- Date: ${transactionDetails.timestamp}

[automated commit]`;

        exec('git add . && git commit -m "' + commitMessage.replace(/"/g, '\\"') + '"', (error, stdout, stderr) => {
            if (error) {
                logError(error);
                console.error('Git commit error:', error);
                reject(error);
                return;
            }
            console.log('Git commit successful:', stdout);
            resolve(stdout);
        });
    });
}

/**
 * Refresh service context and connections
 * @param {Object} options - Refresh options
 * @param {boolean} options.reconnectStripe - Whether to reconnect Stripe client
 * @param {number} options.maxRetries - Maximum number of refresh attempts
 * @returns {Promise<boolean>} - Success status
 */
async function refreshContext({ reconnectStripe = true, maxRetries = 3 } = {}) {
    let attempts = 0;
    
    while (attempts < maxRetries) {
        try {
            if (reconnectStripe) {
                const newStripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'your-stripe-secret-key');
                workspaceManager.registerConnection('stripe', newStripe);
                stripe = newStripe;
            }
            
            // Clear workspace cache
            workspaceManager.setResource('lastRefresh', new Date());
            console.log('Service context refreshed successfully');
            return true;
        } catch (error) {
            logError(error);
            attempts++;
            console.error(`Refresh attempt ${attempts} failed:`, error);
            
            if (attempts === maxRetries) {
                throw new Error('Max refresh attempts reached');
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
    }
    return false;
}

/**
 * Initialize automated tasks
 * @param {Object} options - Automation options
 */
function initializeAutomation({ 
    healthCheckInterval = 300000, // 5 minutes
    refreshInterval = 3600000,    // 1 hour
    runtimeConfig = {
        maxExecutionTime: 30000,  // 30 seconds
        trackMetrics: true,
        retryDelay: 5000         // 5 seconds
    }
} = {}) {
    const runtime = {
        startTime: Date.now(),
        executions: 0,
        failures: 0,
        successes: 0,
        executionTimes: [],
        rmsSpread: 0,
        frameNames: new Set()
    };

    const calculateRMS = () => {
        if (runtime.executionTimes.length === 0) return 0;
        const mean = runtime.executionTimes.reduce((a, b) => a + b, 0) / runtime.executionTimes.length;
        const squaredDiffs = runtime.executionTimes.map(time => Math.pow(time - mean, 2));
        return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length);
    };

    const endRun = (success, executionTime, frameName = 'default') => {
        if (success) runtime.successes++;
        runtime.frameNames.add(frameName);
        
        if (runtimeConfig.trackMetrics) {
            runtime.executionTimes.push(executionTime);
            runtime.rmsSpread = calculateRMS();
            workspaceManager.setResource('healthCheckMetrics', {
                runtime: executionTime,
                rmsSpread: runtime.rmsSpread,
                successRate: runtime.successes / runtime.executions,
                frameName,
                totalFrames: runtime.frameNames.size
            });
        }
    };

    workspaceManager.scheduleTask('healthCheck', async (frameName = 'system') => {
        try {
            const taskStart = Date.now();
            runtime.executions++;

            const result = await stripe.paymentMethods.list({ limit: 1 });
            workspaceManager.setResource('stripeHealth', true);
            
            const executionTime = Date.now() - taskStart;
            endRun(true, executionTime, frameName);
        } catch (error) {
            runtime.failures++;
            workspaceManager.setResource('stripeHealth', false);
            
            const executionTime = Date.now() - taskStart;
            endRun(false, executionTime, frameName);
            
            if (Date.now() - runtime.startTime < runtimeConfig.maxExecutionTime) {
                await workspaceManager.autoRecover();
            } else {
                console.error('Health check exceeded maximum execution time');
            }
        }
    }, healthCheckInterval);

    workspaceManager.scheduleTask('contextRefresh', async () => {
        await refreshContext();
    }, refreshInterval);
}

/**
 * Reboot the host system.
 * @returns {Promise<void>} - Resolves when the reboot command is executed.
 */
async function rebootHost() {
    return new Promise((resolve, reject) => {
        exec('shutdown -r now', (error, stdout, stderr) => {
            if (error) {
                logError(error);
                console.error('Error rebooting host:', error);
                reject(error);
                return;
            }
            console.log('Host reboot initiated:', stdout);
            resolve();
        });
    });
}

module.exports = {
    processPayment,
    increaseTokens,
    exportTransactionPDF,
    gitCommit,
    refreshContext,
    initializeAutomation,
    rebootHost
};
