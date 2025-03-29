export interface PsycheProfile {
    id: string;
    traits: Map<string, number>;
    archetype: {
        primary: string;
        shadow: string;
        development: number;
    };
    relationships: Map<string, RelationshipDynamics>;
    intuitionField: Set<string>;
}

interface RelationshipDynamics {
    trust: number;
    resonance: number;
    tension: number;
    history: Array<{
        type: 'interaction' | 'conflict' | 'collaboration';
        impact: number;
        timestamp: number;
    }>;
}

export class PsycheMetrics {
    private profiles = new Map<string, PsycheProfile>();
    private readonly archetypes = [
        'Mentor', 'Seeker', 'Catalyst', 'Guardian',
        'Innovator', 'Harmonizer', 'Pioneer', 'Sage'
    ];

    createProfile(entityId: string): PsycheProfile {
        const profile: PsycheProfile = {
            id: entityId,
            traits: this.initializeTraits(),
            archetype: this.determineArchetype(),
            relationships: new Map(),
            intuitionField: new Set()
        };
        this.profiles.set(entityId, profile);
        return profile;
    }

    private initializeTraits(): Map<string, number> {
        return new Map([
            ['openness', 0.5 + Math.random() * 0.3],
            ['empathy', 0.4 + Math.random() * 0.4],
            ['curiosity', 0.6 + Math.random() * 0.3],
            ['resilience', 0.5 + Math.random() * 0.3],
            ['adaptability', 0.5 + Math.random() * 0.4]
        ]);
    }

    private determineArchetype() {
        const primary = this.archetypes[Math.floor(Math.random() * this.archetypes.length)];
        let shadow;
        do {
            shadow = this.archetypes[Math.floor(Math.random() * this.archetypes.length)];
        } while (shadow === primary);

        return {
            primary,
            shadow,
            development: 0.1 + Math.random() * 0.3
        };
    }

    developRelationship(profileId1: string, profileId2: string, context: any): void {
        const p1 = this.profiles.get(profileId1);
        const p2 = this.profiles.get(profileId2);
        if (!p1 || !p2) return;

        this.updateRelationshipDynamics(p1, p2, context);
        this.expandIntuitionField(p1, p2);
    }

    private updateRelationshipDynamics(p1: PsycheProfile, p2: PsycheProfile, context: any): void {
        const resonance = this.calculateResonance(p1, p2);
        const dynamics = p1.relationships.get(p2.id) || {
            trust: 0.1,
            resonance,
            tension: 0,
            history: []
        };

        dynamics.trust += (resonance * 0.1);
        dynamics.tension = Math.max(0, dynamics.tension + (context.conflict || 0) - (dynamics.trust * 0.1));

        dynamics.history.push({
            type: 'interaction',
            impact: resonance,
            timestamp: Date.now()
        });

        p1.relationships.set(p2.id, dynamics);
    }

    private expandIntuitionField(p1: PsycheProfile, p2: PsycheProfile): void {
        const sharedInsights = Array.from(p2.intuitionField)
            .filter(insight => this.isRelevantToProfile(insight, p1));

        sharedInsights.forEach(insight => p1.intuitionField.add(insight));
    }

    private calculateResonance(p1: PsycheProfile, p2: PsycheProfile): number {
        const traitCompatibility = Array.from(p1.traits.entries())
            .reduce((sum, [trait, value]) => {
                const otherValue = p2.traits.get(trait) || 0;
                return sum + (1 - Math.abs(value - otherValue));
            }, 0) / p1.traits.size;

        const archetypeResonance = p1.archetype.primary === p2.archetype.shadow ? 1.2 : 0.8;

        return traitCompatibility * archetypeResonance;
    }

    private isRelevantToProfile(insight: string, profile: PsycheProfile): boolean {
        return Math.random() < profile.traits.get('openness')!;
    }
}
