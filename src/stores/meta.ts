import { defineStore } from 'pinia';
import metaAnalysisService from '@/services/meta-analysis';

/**
 * @category System State
 * @subcategory Meta
 * 
 * Manages platform metadata, architecture analysis, and system metrics
 */
interface MetaState {
    metaData: Record<string, any> | null;
    sections: Record<string, any[]> | null;
    isLoading: boolean;
    error: string | null;
}

export const useMetaStore = defineStore('meta', {
    state: (): MetaState => ({
        metaData: null,
        sections: null,
        isLoading: false,
        error: null,
    }),

    getters: {
        hasMetaData: (state) => state.metaData !== null,

        getSection: (state) => (section: string) => {
            return state.sections?.[section] || [];
        },

        getCorePatterns: (state) => {
            return state.sections?.CORE_PATTERNS || [];
        },

        getMetrics: (state) => {
            return {
                ...state.sections?.INNOVATION_METRICS,
                ...state.sections?.VALIDATION_METRICS
            };
        },

        getRelationships: (state) => {
            return state.sections?.COMPONENT_RELATIONSHIPS || [];
        }
    },

    actions: {
        async loadMetaAnalysis() {
            try {
                this.isLoading = true;
                this.error = null;

                // Fetch the meta-analysis.txt file
                const response = await fetch('/meta-analysis.txt');
                if (!response.ok) {
                    throw new Error('Failed to load meta analysis file');
                }

                const metaText = await response.text();
                const { metaData, sections } = metaAnalysisService.parseMetaText(metaText);

                this.metaData = metaData;
                this.sections = sections;
            } catch (error) {
                console.error('Error loading meta analysis:', error);
                this.error = 'Failed to load meta analysis';
            } finally {
                this.isLoading = false;
            }
        },

        async queryMetaData(query: string) {
            if (!this.sections) {
                await this.loadMetaAnalysis();
            }

            // Implement query logic
            const results = {};

            if (!this.sections) return results;

            Object.entries(this.sections).forEach(([section, items]) => {
                const matchedItems = items.filter(item => {
                    if (typeof item === 'string') {
                        return item.toLowerCase().includes(query.toLowerCase());
                    }

                    if (typeof item === 'object') {
                        return Object.values(item).some(value =>
                            String(value).toLowerCase().includes(query.toLowerCase())
                        );
                    }

                    return false;
                });

                if (matchedItems.length > 0) {
                    results[section] = matchedItems;
                }
            });

            return results;
        }
    }
});
