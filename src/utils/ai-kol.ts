import { PsycheMetrics, PsycheProfile } from './psyche-metrics';

export interface KOLProfile {
    id: string;
    name: string;
    expertise: string[];
    credibility: number;
    influence: number;
    contentHistory: ContentInteraction[];
    relationships: Map<string, number>;
    psyche?: PsycheProfile;
}

export interface ContentInteraction {
    type: 'post' | 'comment' | 'review' | 'recommendation';
    content: string;
    sentiment: number;
    timestamp: number;
    impact: number;
}

export class AIKeyOpinionLeader {
    private profile: KOLProfile;
    private persona: KOLPersona;
    private roleplayer: KOLRoleplayer;
    private psycheMetrics: PsycheMetrics;
    private readonly learningRate = 0.1;
    private readonly minCredibility = 0.3;
    private readonly maxInfluence = 0.95;

    constructor(expertise: string[]) {
        this.profile = {
            id: crypto.randomUUID(),
            name: this.generateKOLName(),
            expertise,
            credibility: 0.5,
            influence: 0.1,
            contentHistory: [],
            relationships: new Map()
        };
        this.roleplayer = new KOLRoleplayer();
        this.persona = this.roleplayer.generatePersona(this.selectArchetype(expertise));
        this.psycheMetrics = new PsycheMetrics();
        this.profile.psyche = this.psycheMetrics.createProfile(this.profile.id);
    }

    private selectArchetype(expertise: string[]): KOLPersona['archetype'] {
        const archetypes = {
            technical: 'Analyst',
            market: 'Analyst',
            innovation: 'Visionary',
            future: 'Visionary'
        } as const;

        const matches = expertise.map(exp =>
            Object.entries(archetypes)
                .find(([key]) => exp.includes(key))
        ).filter(Boolean);

        return (matches[0]?.[1] || 'Analyst') as KOLPersona['archetype'];
    }

    async generateInsight(context: string): Promise<ContentInteraction> {
        const interaction = await super.generateInsight(context);

        if (this.profile.psyche?.traits.get('adaptability')! > 0.7) {
            const marketPosition = this.getMarketPosition();
            interaction.content = this.incorporateMarketContext(
                interaction.content,
                marketPosition
            );
        }

        return interaction;
    }

    private async synthesizeContent(context: string): Promise<string> {
        const style = this.persona.style;
        const beliefs = Array.from(this.persona.beliefs);
        const relevantBelief = beliefs.find(belief => context.includes(belief)) || beliefs[0];

        const tone = style.tone === 'technical' ?
            `Based on technical analysis of ${context}...` :
            `Envisioning the future implications of ${context}...`;

        return `${tone} Through the lens of ${relevantBelief}, we observe...`;
    }

    private analyzeSentimentWithPersona(context: string): number {
        const baseSentiment = Math.random(); // Replace with actual sentiment analysis
        const emotionalBias = this.persona.style.emotionality;
        return (baseSentiment + emotionalBias) / 2;
    }

    private updateMetrics(interaction: ContentInteraction): void {
        // Update credibility based on content impact
        this.profile.credibility = Math.max(
            this.minCredibility,
            this.profile.credibility + (interaction.impact * this.learningRate)
        );

        // Update influence based on network effect
        this.profile.influence = Math.min(
            this.maxInfluence,
            this.profile.influence + (this.profile.credibility * this.learningRate)
        );
    }

    private generateKOLName(): string {
        const prefixes = ['Crypto', 'Web3', 'DeFi', 'Meta'];
        const suffixes = ['Sage', 'Pioneer', 'Visionary', 'Oracle'];
        return `${prefixes[Math.floor(Math.random() * prefixes.length)]}${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
    }

    private evaluatePsycheImpact(content: string): number {
        if (!this.profile.psyche) return 1;

        const openness = this.profile.psyche.traits.get('openness') || 0.5;
        const empathy = this.profile.psyche.traits.get('empathy') || 0.5;

        return (openness + empathy) / 2;
    }

    private incorporatePsycheInsights(content: string, impact: number): string {
        if (!this.profile.psyche) return content;

        const archetype = this.profile.psyche.archetype;
        const style = impact > 0.7 ? 'intuitive' : 'analytical';

        return `[${archetype.primary}/${style}] ${content}`;
    }

    private incorporateMarketContext(content: string, position: MarketPosition): string {
        const perspective = position.role === 'maker' ? 'market maker' :
            position.role === 'taker' ? 'market participant' :
                'market validator';

        return `[${perspective} view | conf: ${position.confidence.toFixed(2)}] ${content}`;
    }

    interactWith(otherKOL: AIKeyOpinionLeader, context: any): void {
        if (this.profile.psyche && otherKOL.profile.psyche) {
            this.psycheMetrics.developRelationship(
                this.profile.id,
                otherKOL.profile.id,
                context
            );
        }
    }
}
