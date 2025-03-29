import { WikiSimulator } from '../wiki-sim';

describe('WikiSimulator', () => {
    let wiki: WikiSimulator;

    beforeEach(() => {
        wiki = new WikiSimulator();
    });

    test('should generate wiki entry', async () => {
        const entry = await wiki.generateEntry('web-evolution/early-browsers', 1995);
        expect(entry.title).toBe('Early Browsers');
        expect(entry.content).toContain('Web1 Analysis');
        expect(entry.tags).toContain('web1');
    });

    test('should populate multiple entries', async () => {
        const paths = [
            'web-evolution/protocols',
            'web-evolution/browsers',
            'web-evolution/standards'
        ];

        const entries = await wiki.populateWiki(paths);
        expect(entries.size).toBeGreaterThan(0);
        expect(Array.from(entries.values())[0].content).toBeTruthy();
    });

    test('should export to markdown', async () => {
        const entry = await wiki.generateEntry('web-evolution/networking', 2000);
        const markdown = await wiki.exportToMarkdown(entry);
        expect(markdown).toContain('# Networking');
        expect(markdown).toContain('Historical Context');
    });
});
