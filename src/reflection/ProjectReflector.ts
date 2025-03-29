import { Octokit } from '@octokit/rest';
import { UserDiscovery } from './UserDiscovery';

interface ProjectInsight {
    name: string;
    url: string;
    stars: number;
    features: string[];
    compatibility: number;
    lastUpdate: Date;
}

export class ProjectReflector {
    private octokit: Octokit;
    private insights: Map<string, ProjectInsight> = new Map();
    private readonly searchTerms = [
        'crypto-streaming',
        'web3-calendar',
        'crypto-bot-economy',
        'defi-assistant'
    ];
    private userDiscovery: UserDiscovery;

    constructor(githubToken: string) {
        this.octokit = new Octokit({ auth: githubToken });
        this.userDiscovery = new UserDiscovery(githubToken);
    }

    public async reflectOnSimilarProjects(): Promise<Map<string, ProjectInsight>> {
        // Discover interesting users first
        const users = await this.userDiscovery.discoverObscureUsers();
        console.log('🔍 Discovered interesting users:', this.userDiscovery.getRecommendedUsers());
        
        for (const term of this.searchTerms) {
            const repos = await this.searchRepositories(term);
            for (const repo of repos) {
                await this.analyzeRepository(repo);
            }
        }
        return this.insights;
    }

    private async searchRepositories(term: string): Promise<any[]> {
        const { data } = await this.octokit.search.repos({
            q: `${term} language:typescript stars:>10`,
            sort: 'stars',
            per_page: 5
        });
        return data.items;
    }

    private async analyzeRepository(repo: any): Promise<void> {
        const { data: contents } = await this.octokit.repos.getContent({
            owner: repo.owner.login,
            repo: repo.name,
            path: ''
        });

        const features = await this.detectFeatures(contents);
        const compatibility = this.assessCompatibility(features);

        this.insights.set(repo.full_name, {
            name: repo.name,
            url: repo.html_url,
            stars: repo.stargazers_count,
            features,
            compatibility,
            lastUpdate: new Date(repo.updated_at)
        });
    }

    private async detectFeatures(contents: any[]): Promise<string[]> {
        const features: Set<string> = new Set();
        
        for (const file of contents) {
            if (file.type === 'file' && file.name.endsWith('.ts')) {
                features.add(this.categorizeFile(file.name));
            }
        }

        return Array.from(features);
    }

    private categorizeFile(filename: string): string {
        if (filename.includes('bot')) return 'bot-automation';
        if (filename.includes('stream')) return 'data-streaming';
        if (filename.includes('calendar')) return 'scheduling';
        if (filename.includes('trade')) return 'trading';
        return 'other';
    }

    private assessCompatibility(features: string[]): number {
        const ourFeatures = new Set([
            'bot-automation',
            'data-streaming',
            'scheduling',
            'trading'
        ]);

        const matchingFeatures = features.filter(f => ourFeatures.has(f));
        return matchingFeatures.length / ourFeatures.size;
    }

    public getRecommendations(): string[] {
        const recommendations: string[] = [];
        
        for (const [name, insight] of this.insights) {
            if (insight.compatibility > 0.7) {
                recommendations.push(
                    `Consider integrating with ${name} (${insight.compatibility * 100}% compatible)`
                );
            }
        }

        return recommendations;
    }
}
