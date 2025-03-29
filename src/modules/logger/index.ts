import dotenv from 'dotenv';

dotenv.config();

enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

/**
 * Logger Module - Provides consistent logging across the application
 */
export class LoggerModule {
    private level: LogLevel;

    constructor() {
        // Set log level from environment or default to INFO
        const configLevel = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
        this.level = LogLevel[configLevel as keyof typeof LogLevel] || LogLevel.INFO;
    }

    /**
     * Format log message with timestamp and level
     */
    private formatMessage(level: string, message: string): string {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${level}] ${message}`;
    }

    /**
     * Log debug message
     */
    public debug(message: string, ...args: any[]): void {
        if (this.level <= LogLevel.DEBUG) {
            console.debug(this.formatMessage('DEBUG', message), ...args);
        }
    }

    /**
     * Log info message
     */
    public info(message: string, ...args: any[]): void {
        if (this.level <= LogLevel.INFO) {
            console.info(this.formatMessage('INFO', message), ...args);
        }
    }

    /**
     * Log warning message
     */
    public warn(message: string, ...args: any[]): void {
        if (this.level <= LogLevel.WARN) {
            console.warn(this.formatMessage('WARN', message), ...args);
        }
    }

    /**
     * Log error message
     */
    public error(message: string, ...args: any[]): void {
        if (this.level <= LogLevel.ERROR) {
            console.error(this.formatMessage('ERROR', message), ...args);
        }
    }
}

// Export singleton instance
export const logger = new LoggerModule();
