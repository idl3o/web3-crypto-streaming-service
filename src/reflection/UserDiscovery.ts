import { Octokit } from '@octokit/rest';

interface UserInsight {
    username: string;
    popularity: number;
    specialization: string[];
    repositories: RepoInsight[];
    lastActive: Date;
    influence: number;
}

interface RepoInsight {
    name: string;
    stars: number;
    topics: string[];
    activity: number;
    obscurityScore: number;
}

export class UserDiscovery {
    private octokit: Octokit;
    private discoveries: Map<string, UserInsight> = new Map();
    private readonly activityThreshold = 100;
    private readonly obscurityThreshold = 0.7;

    constructor(githubToken: string) {
        this.octokit = new Octokit({ auth: githubToken });
    }

    public async discoverObscureUsers(): Promise<Map<string, UserInsight>> {
        const queries = [
            'location:hidden',
            'created:<2010',
            'followers:>1000',
            'repos:>50'
        ];

        for (const query of queries) {
            const users = await this.searchUsers(query);
            for (const user of users) {
                if (await this.isInterestingUser(user)) {
                    await this.analyzeUser(user);
                }
            }
        }

        return this.discoveries;
    }

    private async searchUsers(query: string): Promise<any[]> {
        const { data } = await this.octokit.search.users({
            q: query,
            sort: 'followers',
            per_page: 10
        });
        return data.items;
    }

    private async isInterestingUser(user: any): Promise<boolean> {
        const { data: repos } = await this.octokit.repos.listForUser({
            username: user.login,
            sort: 'stars',
            per_page: 5
        });

        const obscureRepos = repos.filter(repo => 
            repo.stargazers_count > 100 && 
            repo.stargazers_count < 1000 &&
            repo.updated_at > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
        );

        return obscureRepos.length > 0;
    }

    private async analyzeUser(user: any): Promise<void> {
        const { data: profile } = await this.octokit.users.getByUsername({
            username: user.login
        });

        const repos = await this.analyzeRepositories(user.login);
        const specialization = this.detectSpecialization(repos);

        this.discoveries.set(user.login, {
            username: user.login,
            popularity: profile.followers,
            specialization,
            repositories: repos,
            lastActive: new Date(profile.updated_at),
            influence: this.calculateInfluence(profile, repos)
        });
    }

    private async analyzeRepositories(username: string): Promise<RepoInsight[]> {
        const { data: repos } = await this.octokit.repos.listForUser({
            username,
            sort: 'updated',
            per_page: 10
        });

        return repos.map(repo => ({
            name: repo.name,
            stars: repo.stargazers_count,
            topics: repo.topics || [],
            activity: this.calculateActivity(repo),
            obscurityScore: this.calculateObscurityScore(repo)
        }));
    }

    private calculateActivity(repo: any): number {
        const ageInDays = (Date.now() - new Date(repo.created_at).getTime()) / (1000 * 60 * 60 * 24);
        return repo.pushed_at ? (repo.stargazers_count / ageInDays) : 0;
    }

    private calculateObscurityScore(repo: any): number {
        const popularity = repo.stargazers_count;
        const activity = this.calculateActivity(repo);
        return (activity > 0 && popularity < 1000) ? 
            (activity / popularity) : 0;
    }

    private detectSpecialization(repos: RepoInsight[]): string[] {
        const topics = repos.flatMap(repo => repo.topics);
        return Array.from(new Set(topics))
            .filter(topic => 
                topics.filter(t => t === topic).length >= 2
            );
    }

    private calculateInfluence(profile: any, repos: RepoInsight[]): number {
        const totalStars = repos.reduce((sum, repo) => sum + repo.stars, 0);
        const obscurityBonus = repos.filter(r => r.obscurityScore > this.obscurityThreshold).length;
        return (totalStars * obscurityBonus) / profile.followers;
    }

    public getRecommendedUsers(): string[] {
        return Array.from(this.discoveries.entries())
            .filter(([_, insight]) => insight.influence > 1)
            .map(([username, insight]) => 
                `@${username} - Specializes in: ${insight.specialization.join(', ')}`
            );
    }
}
