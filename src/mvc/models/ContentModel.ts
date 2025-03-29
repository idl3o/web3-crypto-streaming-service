import { BaseModel } from '@/mvc/core/BaseModel';

/**
 * ContentType defines the type of content
 */
export enum ContentType {
    VIDEO = 'video',
    AUDIO = 'audio',
    DOCUMENT = 'document',
    IMAGE = 'image',
    LIVESTREAM = 'livestream'
}

/**
 * ContentLicense defines the license type
 */
export enum ContentLicense {
    STANDARD = 'standard',
    PREMIUM = 'premium',
    EXCLUSIVE = 'exclusive',
    OPEN = 'open'
}

/**
 * Model for content metadata
 */
export class ContentModel extends BaseModel {
    public id: string = '';
    public title: string = '';
    public description: string = '';
    public creator: string = '';
    public creatorAddress: string = '';
    public creatorProfile?: {
        username: string;
        avatar: string;
        bio: string;
    };
    public contentType: ContentType = ContentType.VIDEO;
    public duration: number = 0;
    public thumbnail: string = '';
    public ipfsHash: string = '';
    public url: string = '';
    public tags: string[] = [];
    public publishedAt: number = 0;
    public updatedAt: number = 0;
    public viewCount: number = 0;
    public paymentRate: number = 0;
    public license: ContentLicense = ContentLicense.STANDARD;
    public isLive: boolean = false;

    /**
     * Validate the model data
     */
    public validate(): boolean {
        this.clearErrors();

        if (!this.id) {
            this.addError('id', 'ID is required');
        }

        if (!this.title || this.title.trim().length === 0) {
            this.addError('title', 'Title is required');
        } else if (this.title.length > 100) {
            this.addError('title', 'Title cannot exceed 100 characters');
        }

        if (this.description.length > 5000) {
            this.addError('description', 'Description cannot exceed 5000 characters');
        }

        if (!this.creator || this.creator.trim().length === 0) {
            this.addError('creator', 'Creator is required');
        }

        if (this.contentType === ContentType.LIVESTREAM && !this.isLive) {
            this.addError('contentType', 'Livestream content must have isLive set to true');
        }

        if (!this.ipfsHash && !this.url) {
            this.addError('source', 'Either IPFS hash or URL must be provided');
        }

        if (this.paymentRate < 0) {
            this.addError('paymentRate', 'Payment rate cannot be negative');
        }

        return this._errors.size === 0;
    }

    /**
     * Convert model to a plain object
     */
    public toObject(): Record<string, any> {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            creator: this.creator,
            creatorAddress: this.creatorAddress,
            creatorProfile: this.creatorProfile,
            contentType: this.contentType,
            duration: this.duration,
            thumbnail: this.thumbnail,
            ipfsHash: this.ipfsHash,
            url: this.url,
            tags: this.tags,
            publishedAt: this.publishedAt,
            updatedAt: this.updatedAt,
            viewCount: this.viewCount,
            paymentRate: this.paymentRate,
            license: this.license,
            isLive: this.isLive
        };
    }

    /**
     * Create model from a plain object
     */
    public fromObject(obj: Record<string, any>): this {
        if (obj.id) this.id = obj.id;
        if (obj.title) this.title = obj.title;
        if (obj.description) this.description = obj.description;
        if (obj.creator) this.creator = obj.creator;
        if (obj.creatorAddress) this.creatorAddress = obj.creatorAddress;
        if (obj.creatorProfile) this.creatorProfile = obj.creatorProfile;
        if (obj.contentType) this.contentType = obj.contentType;
        if (obj.duration !== undefined) this.duration = obj.duration;
        if (obj.thumbnail) this.thumbnail = obj.thumbnail;
        if (obj.ipfsHash) this.ipfsHash = obj.ipfsHash;
        if (obj.url) this.url = obj.url;
        if (obj.tags) this.tags = obj.tags;
        if (obj.publishedAt) this.publishedAt = obj.publishedAt;
        if (obj.updatedAt) this.updatedAt = obj.updatedAt;
        if (obj.viewCount !== undefined) this.viewCount = obj.viewCount;
        if (obj.paymentRate !== undefined) this.paymentRate = obj.paymentRate;
        if (obj.license) this.license = obj.license;
        if (obj.isLive !== undefined) this.isLive = obj.isLive;

        return this;
    }

    /**
     * Get the content URL (resolves IPFS if needed)
     */
    public getContentUrl(): string {
        if (this.url) return this.url;

        // Resolve IPFS URL if hash exists
        if (this.ipfsHash) {
            return `https://ipfs.io/ipfs/${this.ipfsHash}`;
        }

        return '';
    }
}
