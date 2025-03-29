import { BaseController } from '@/mvc/core/BaseController';
import { StreamingModel, StreamingStatus, StreamQuality } from '@/mvc/models/StreamingModel';
import { ContentModel } from '@/mvc/models/ContentModel';
import { useWalletStore } from '@/state/blockchain';

/**
 * Controller for managing content streaming
 */
export class StreamingController extends BaseController<StreamingModel> {
    private intervalId: number | null = null;
    private content: ContentModel | null = null;

    /**
     * Create a new streaming controller
     */
    constructor(model: StreamingModel = new StreamingModel()) {
        super(model);
    }

    /**
     * Set content for streaming
     */
    public setContent(content: ContentModel): void {
        this.content = content;

        // Update streaming model with content info
        this._model.contentId = content.id;
        this._model.creatorAddress = content.creatorAddress;
        this._model.paymentRate = content.paymentRate;
    }

    /**
     * Start streaming content
     */
    public async startStream(quality: StreamQuality = StreamQuality.AUTO): Promise<boolean> {
        try {
            if (!this.content) {
                throw new Error('No content set for streaming');
            }

            // Get user wallet
            const walletStore = useWalletStore();
            if (!walletStore.isConnected) {
                throw new Error('Wallet not connected');
            }

            // Check if user has sufficient funds
            const requiredFunds = this._model.paymentRate * 10; // Estimate for 10 minutes
            if (!walletStore.hasSufficientBalance(requiredFunds)) {
                throw new Error(`Insufficient funds. Required: ${requiredFunds} ETH`);
            }

            // Update model state
            this._model.status = StreamingStatus.CONNECTING;
            this._model.quality = quality;
            this._model.viewerAddress = walletStore.account || '';
            this._model.error = '';

            // Generate stream ID (in a real app, this would come from a smart contract)
            this._model.streamId = `stream_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

            // Simulate stream connection
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Start the stream
            this._model.status = StreamingStatus.ACTIVE;
            this._model.startTime = Date.now();

            // Start tracking time and payments
            this.startTracking();

            return true;
        } catch (error: any) {
            this._model.status = StreamingStatus.ERROR;
            this._model.error = error.message;
            return false;
        }
    }

    /**
     * Stop the active stream
     */
    public async stopStream(): Promise<void> {
        if (this._model.status !== StreamingStatus.ACTIVE) {
            return;
        }

        // Update final duration and payment
        this._model.updateDuration();
        this._model.totalPaid = this._model.getCurrentCost();

        // Stop tracking
        this.stopTracking();

        // Update status
        this._model.status = StreamingStatus.COMPLETED;
    }

    /**
     * Pause the active stream
     */
    public pauseStream(): void {
        if (this._model.status !== StreamingStatus.ACTIVE) {
            return;
        }

        // Update duration before pausing
        this._model.updateDuration();
        this._model.status = StreamingStatus.PAUSED;

        // Stop tracking while paused
        this.stopTracking();
    }

    /**
     * Resume a paused stream
     */
    public resumeStream(): void {
        if (this._model.status !== StreamingStatus.PAUSED) {
            return;
        }

        this._model.status = StreamingStatus.ACTIVE;
        this._model.startTime = Date.now() - (this._model.duration * 1000);

        // Resume tracking
        this.startTracking();
    }

    /**
     * Change stream quality
     */
    public changeQuality(quality: StreamQuality): void {
        this._model.quality = quality;
    }

    /**
     * Get current streaming stats
     */
    public getStats(): Record<string, any> {
        const currentCost = this._model.getCurrentCost();

        return {
            status: this._model.status,
            quality: this._model.quality,
            duration: this._model.duration,
            bufferHealth: this._model.bufferHealth,
            currentCost,
            paymentRate: this._model.paymentRate,
            creatorAddress: this._model.creatorAddress,
            streamId: this._model.streamId
        };
    }

    /**
     * Initialize the controller
     */
    public async initialize(): Promise<void> {
        // Nothing to initialize yet
    }

    /**
     * Clean up resources
     */
    public async dispose(): Promise<void> {
        this.stopTracking();

        // If stream is active, stop it first
        if (this._model.status === StreamingStatus.ACTIVE) {
            await this.stopStream();
        }
    }

    /**
     * Start tracking stream metrics and payments
     */
    private startTracking(): void {
        if (this.intervalId !== null) {
            this.stopTracking();
        }

        this.intervalId = window.setInterval(() => {
            // Update stream duration
            this._model.updateDuration();

            // Update buffer health (simulated for demo)
            this._model.bufferHealth = Math.min(100, 70 + Math.floor(Math.random() * 30));
        }, 1000);
    }

    /**
     * Stop tracking stream metrics
     */
    private stopTracking(): void {
        if (this.intervalId !== null) {
            window.clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}
