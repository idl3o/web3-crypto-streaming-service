export class ErrorHandler {
    private static instance: ErrorHandler;
    private errorLog: Map<string, number> = new Map();
    private readonly maxRetries = 3;

    static getInstance(): ErrorHandler {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }

    handleError(error: Error, context: string): void {
        console.error(`Context: ${context}`, error);

        // Track error frequency
        const count = (this.errorLog.get(error.message) || 0) + 1;
        this.errorLog.set(error.message, count);

        // Log to monitoring
        if (count >= this.maxRetries) {
            console.error(`Critical error threshold reached in ${context}`);
            process.exit(1); // Controlled exit
        }
    }

    async wrapAsync<T>(
        fn: () => Promise<T>,
        context: string
    ): Promise<T | null> {
        try {
            return await fn();
        } catch (error) {
            this.handleError(error as Error, context);
            return null;
        }
    }
}

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1); // Required for clean exit
});
