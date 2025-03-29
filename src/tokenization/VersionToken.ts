import { createHash } from 'crypto';

interface TokenMetadata {
    version: string;
    timestamp: number;
    features: string[];
    commitHash: string;
}

export class VersionToken {
    private static readonly TOKEN_PREFIX = 'WCSS';  // Web3 Crypto Streaming Service
    private currentToken: string | null = null;
    private metadata: TokenMetadata | null = null;

    constructor(version: string, features: string[]) {
        this.generateToken(version, features);
    }

    private generateToken(version: string, features: string[]): void {
        const timestamp = Date.now();
        const commitHash = this.generateCommitHash(version, timestamp);
        
        this.metadata = {
            version,
            timestamp,
            features,
            commitHash
        };

        this.currentToken = this.encodeToken(this.metadata);
    }

    private generateCommitHash(version: string, timestamp: number): string {
        const data = `${version}-${timestamp}-${Date.now()}`;
        return createHash('sha256').update(data).digest('hex').slice(0, 8);
    }

    private encodeToken(metadata: TokenMetadata): string {
        const payload = Buffer.from(JSON.stringify(metadata)).toString('base64');
        return `${VersionToken.TOKEN_PREFIX}_${payload}`;
    }

    public getToken(): string {
        return this.currentToken || '';
    }

    public getMetadata(): TokenMetadata | null {
        return this.metadata;
    }

    public static decodeToken(token: string): TokenMetadata | null {
        try {
            if (!token.startsWith(VersionToken.TOKEN_PREFIX)) {
                return null;
            }

            const payload = token.split('_')[1];
            return JSON.parse(Buffer.from(payload, 'base64').toString());
        } catch {
            return null;
        }
    }

    public isUpdateAvailable(latestToken: string): boolean {
        const latestMetadata = VersionToken.decodeToken(latestToken);
        if (!latestMetadata || !this.metadata) return false;

        return this.compareVersions(latestMetadata.version, this.metadata.version) > 0;
    }

    private compareVersions(v1: string, v2: string): number {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);

        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const part1 = parts1[i] || 0;
            const part2 = parts2[i] || 0;
            if (part1 !== part2) return part1 - part2;
        }
        return 0;
    }
}
