const fs = require('fs');
const path = require('path');

/**
 * Log an error to a file with a timestamp.
 * @param {Error|string} error - The error to log.
 */
function logError(error) {
    const logFilePath = path.join(__dirname, 'error.log');
    const timestamp = new Date().toISOString();
    const errorMessage = typeof error === 'string' ? error : error.stack || error.message;

    const logEntry = `[${timestamp}] ${errorMessage}\n`;
    fs.appendFile(logFilePath, logEntry, (err) => {
        if (err) {
            console.error('Failed to write to error log:', err);
        }
    });
}

module.exports = { logError };
