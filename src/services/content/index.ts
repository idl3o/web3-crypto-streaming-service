import { create } from 'ipfs-core';

export interface ContentMetadata {
    title: string;
    description: string;
    creator: string;
    tags: string[];
}

export class ContentService {
    private ipfs = create();

    async uploadContent(file: File, metadata: ContentMetadata): Promise<string> {
        const content = await file.arrayBuffer();
        const result = await (await this.ipfs).add(content);

        const metadataResult = await (await this.ipfs).add(
            JSON.stringify({
                ...metadata,
                contentHash: result.cid.toString(),
            })
        );

        return metadataResult.cid.toString();
    }

    async getContent(contentId: string): Promise<{
        metadata: ContentMetadata;
        stream: AsyncIterable<Uint8Array>;
    }> {
        const metadataBytes = await (await this.ipfs).cat(contentId);
        const metadata = JSON.parse(new TextDecoder().decode(metadataBytes));

        const stream = (await this.ipfs).cat(metadata.contentHash);
        return { metadata, stream };
    }
}
