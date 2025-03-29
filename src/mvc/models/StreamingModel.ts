import { BaseModel } from '@/mvc/core/BaseModel';

/**
 * StreamQuality defines the available streaming quality levels
 */
export enum StreamQuality {
    AUTO = 'auto',
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    HD = 'hd',
    _4K = '4k'
}

/**
 * StreamingStatus defines the possible states of a streaming session
 */
export enum StreamingStatus {
    IDLE = 'idle',
    CONNECTING = 'connecting',
    ACTIVE = 'active',
    PAUSED = 'paused',
    ERROR = 'error',
    COMPLETED = 'completed'
}

/**
 * Model for a content streaming session
 */
export class StreamingModel extends BaseModel {
    public contentId: string = '';
    public streamId: string = '';
    public status: StreamingStatus = StreamingStatus.IDLE;
    public quality: StreamQuality = StreamQuality.AUTO;
    public startTime: number = 0;
    public duration: number = 0;
    public paymentRate: number = 0;
    public totalPaid: number = 0;
    public creatorAddress: string = '';
    public viewerAddress: string = '';
    public bufferHealth: number = 0;
    public error: string = '';

    /**
     * Validate the model data
     */
    public validate(): boolean {
        this.clearErrors();

        if (!this.contentId) {
            this.addError('contentId', 'Content ID is required');
        }

        if (this.paymentRate < 0) {
            this.addError('paymentRate', 'Payment rate cannot be negative');
        }

        if (this.status === StreamingStatus.ACTIVE && !this.streamId) {
            this.addError('streamId', 'Stream ID is required for active streams');
        }

        if (this.status === StreamingStatus.ACTIVE && !this.creatorAddress) {
            this.addError('creatorAddress', 'Creator address is required for active streams');
        }

        if (this.status === StreamingStatus.ACTIVE && !this.viewerAddress) {
            this.addError('viewerAddress', 'Viewer address is required for active streams');
        }

        return this._errors.size === 0;
    }

    /**
     * Convert model to a plain object
     */
    public toObject(): Record<string, any> {
        return {
            contentId: this.contentId,
            streamId: this.streamId,
            status: this.status,
            quality: this.quality,
            startTime: this.startTime,
            duration: this.duration,
            paymentRate: this.paymentRate,
            totalPaid: this.totalPaid,
            creatorAddress: this.creatorAddress,
            viewerAddress: this.viewerAddress,
            bufferHealth: this.bufferHealth,
            error: this.error
        };
    }

    /**
     * Create model from a plain object
     */
    public fromObject(obj: Record<string, any>): this {
        if (obj.contentId) this.contentId = obj.contentId;
        if (obj.streamId) this.streamId = obj.streamId;
        if (obj.status) this.status = obj.status;
        if (obj.quality) this.quality = obj.quality;
        if (obj.startTime) this.startTime = obj.startTime;
        if (obj.duration) this.duration = obj.duration;
        if (obj.paymentRate) this.paymentRate = obj.paymentRate;
        if (obj.totalPaid) this.totalPaid = obj.totalPaid;
        if (obj.creatorAddress) this.creatorAddress = obj.creatorAddress;
        if (obj.viewerAddress) this.viewerAddress = obj.viewerAddress;
        if (obj.bufferHealth) this.bufferHealth = obj.bufferHealth;
        if (obj.error) this.error = obj.error;

        return this;
    }

    /**
     * Calculate current cost for this streaming session
     */
    public getCurrentCost(): number {
        if (this.status !== StreamingStatus.ACTIVE) return this.totalPaid;

        const now = Date.now();
        const activeTime = (now - this.startTime) / 60000; // Convert to minutes
        return this.paymentRate * activeTime;
    }

    /**
     * Update the duration of the stream
     */
    public updateDuration(): void {
        if (this.status === StreamingStatus.ACTIVE && this.startTime > 0) {
            this.duration = (Date.now() - this.startTime) / 1000; // Duration in seconds
        }
    }
}
