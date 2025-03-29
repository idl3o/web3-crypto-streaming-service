import { ethers } from 'ethers';
import { WaybackInspiration } from './wayback';
import { InternalLanguage } from './internal-lang';

export interface WikiEntry {
    path: string;
    title: string;
    content: string;
    tags: string[];
    timestamp: number;
    revision: number;
    contributors: Set<string>;
}

export class WikiSimulator {
    private entries: Map<string, WikiEntry> = new Map();
    private wayback: WaybackInspiration;
    private language: InternalLanguage;
    private readonly maxEntries = 1000;
    private readonly entryTTL = 24 * 60 * 60 * 1000; // 24 hours

    constructor() {
        this.wayback = new WaybackInspiration();
        this.language = new InternalLanguage();
    }

    private cleanupOldEntries(): void {
        const now = Date.now();
        let deletedCount = 0;

        for (const [path, entry] of this.entries) {
            if (now - entry.timestamp > this.entryTTL) {
                this.entries.delete(path);
                deletedCount++;
            }
            if (this.entries.size <= this.maxEntries) break;
        }

        if (deletedCount > 0) {
            console.log(`Cleaned up ${deletedCount} stale wiki entries`);
        }
    }

    async generateEntry(path: string, era: number): Promise<WikiEntry> {
        this.cleanupOldEntries();
        const timeline = await this.wayback.inspectTimeline(path, era);
        const inspiration = timeline[0].inspirationScore;

        const axiom = await this.language.postulateAxiom(
            `Knowledge from ${era} has wisdom value ${inspiration}`
        );

        const entry: WikiEntry = {
            path,
            title: this.generateTitle(path),
            content: await this.generateContent(timeline[0], axiom),
            tags: this.generateTags(era),
            timestamp: Date.now(),
            revision: 1,
            contributors: new Set([ethers.utils.id('wiki-sim').slice(0, 8)])
        };

        this.entries.set(path, entry);
        return entry;
    }

    private generateTitle(path: string): string {
        return path.split('/').pop()?.replace(/-/g, ' ')
            .split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ') || 'Untitled Entry';
    }

    private async generateContent(node: any, axiom: boolean): Promise<string> {
        const metrics = await this.wayback.getInspirationMetrics(node.memoryHash);
        return [
            `# ${metrics.era} Analysis`,
            '',
            '## Historical Context',
            `Resonance: ${metrics.resonance.toFixed(3)}`,
            `Inspiration: ${metrics.inspiration.toFixed(3)}`,
            '',
            '## Evolution Path',
            metrics.evolution.map(e => `- ${e}`).join('\n'),
            '',
            '## Wisdom Integration',
            `Axiom Status: ${axiom ? 'Validated' : 'Pending'}`
        ].join('\n');
    }

    private generateTags(era: number): string[] {
        const baseTags = ['web-history', 'digital-archaeology'];
        if (era < 1995) return [...baseTags, 'pre-web'];
        if (era < 2000) return [...baseTags, 'web1'];
        if (era < 2015) return [...baseTags, 'web2'];
        return [...baseTags, 'web3'];
    }

    async populateWiki(paths: string[]): Promise<Map<string, WikiEntry>> {
        const startYear = 1990;
        const yearIncrement = 5;

        for (const path of paths) {
            for (let year = startYear; year <= 2023; year += yearIncrement) {
                await this.generateEntry(path, year);
            }
        }

        return this.entries;
    }

    async exportToMarkdown(entry: WikiEntry): Promise<string> {
        return [
            `<!-- filepath: ${entry.path} -->`,
            `# ${entry.title}`,
            '',
            entry.content,
            '',
            '## Metadata',
            `Tags: ${entry.tags.join(', ')}`,
            `Last Updated: ${new Date(entry.timestamp).toISOString()}`,
            `Revision: ${entry.revision}`,
            `Contributors: ${Array.from(entry.contributors).join(', ')}`
        ].join('\n');
    }
}
