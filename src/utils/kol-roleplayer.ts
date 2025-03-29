export interface KOLPersona {
    archetype: 'Analyst' | 'Visionary' | 'Educator' | 'Critic';
    traits: Map<string, number>;
    beliefs: Set<string>;
    style: {
        tone: 'formal' | 'casual' | 'technical' | 'inspiring';
        complexity: number;
        emotionality: number;
    };
}

export class KOLRoleplayer {
    private readonly basePersonas = {
        Analyst: {
            traits: new Map([
                ['objectivity', 0.9],
                ['precision', 0.85],
                ['skepticism', 0.7]
            ]),
            beliefs: new Set([
                'data-driven-decisions',
                'market-efficiency',
                'technical-analysis'
            ])
        },
        Visionary: {
            traits: new Map([
                ['innovation', 0.9],
                ['optimism', 0.8],
                ['boldness', 0.75]
            ]),
            beliefs: new Set([
                'future-potential',
                'paradigm-shifts',
                'technological-evolution'
            ])
        }
    };

    generatePersona(archetype: KOLPersona['archetype']): KOLPersona {
        const base = this.basePersonas[archetype];
        return {
            archetype,
            traits: new Map(base.traits),
            beliefs: new Set(base.beliefs),
            style: this.generateCommunicationStyle(archetype)
        };
    }

    private generateCommunicationStyle(archetype: KOLPersona['archetype']) {
        const styles = {
            Analyst: {
                tone: 'technical' as const,
                complexity: 0.8,
                emotionality: 0.3
            },
            Visionary: {
                tone: 'inspiring' as const,
                complexity: 0.6,
                emotionality: 0.7
            }
        };
        return styles[archetype];
    }
}
