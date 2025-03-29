import { EventEmitter } from 'events';

interface PromptTemplate {
    id: string;
    pattern: string;
    context: string[];
    successRate: number;
    usage: number;
    lastUpdated: number;
}

interface PromptResult {
    success: boolean;
    response: any;
    executionTime: number;
    memoryUsage: number;
}

export class PromptManager extends EventEmitter {
    private templates: Map<string, PromptTemplate> = new Map();
    private results: Map<string, PromptResult[]> = new Map();
    private readonly learningRate = 0.1;
    private readonly updateThreshold = 10;

    public async createPrompt(input: string): Promise<string> {
        const context = this.analyzeContext(input);
        const template = this.findBestTemplate(context);
        
        return this.generateOptimizedPrompt(template, input);
    }

    private analyzeContext(input: string): string[] {
        const contexts = new Set<string>();
        
        // Technical context detection
        if (input.match(/\b(function|class|interface)\b/)) {
            contexts.add('code');
        }
        
        // Domain context detection
        if (input.match(/\b(crypto|blockchain|web3)\b/)) {
            contexts.add('crypto');
        }

        // Action context detection
        if (input.match(/\b(create|update|delete|optimize)\b/)) {
            contexts.add('action');
        }

        return Array.from(contexts);
    }

    private findBestTemplate(context: string[]): PromptTemplate {
        return Array.from(this.templates.values())
            .filter(t => t.context.some(c => context.includes(c)))
            .sort((a, b) => b.successRate - a.successRate)[0];
    }

    private async generateOptimizedPrompt(template: PromptTemplate, input: string): Promise<string> {
        const startTime = Date.now();
        const baseMemory = process.memoryUsage().heapUsed;

        const prompt = template ? 
            template.pattern.replace('{input}', input) :
            this.createNewTemplate(input).pattern.replace('{input}', input);

        const result: PromptResult = {
            success: true,
            response: prompt,
            executionTime: Date.now() - startTime,
            memoryUsage: process.memoryUsage().heapUsed - baseMemory
        };

        this.updateMetrics(template?.id, result);
        return prompt;
    }

    private createNewTemplate(input: string): PromptTemplate {
        const template: PromptTemplate = {
            id: `template_${Date.now()}`,
            pattern: this.generatePattern(input),
            context: this.analyzeContext(input),
            successRate: 1,
            usage: 0,
            lastUpdated: Date.now()
        };

        this.templates.set(template.id, template);
        return template;
    }

    private generatePattern(input: string): string {
        return input.replace(/\b\w+\b/g, match => 
            this.isKeyword(match) ? match : '{input}'
        );
    }

    private isKeyword(word: string): boolean {
        const keywords = ['function', 'class', 'interface', 'create', 'update', 'optimize'];
        return keywords.includes(word.toLowerCase());
    }

    private updateMetrics(templateId: string | undefined, result: PromptResult): void {
        if (!templateId) return;

        const template = this.templates.get(templateId);
        if (!template) return;

        const results = this.results.get(templateId) || [];
        results.push(result);
        this.results.set(templateId, results);

        if (results.length >= this.updateThreshold) {
            this.optimizeTemplate(template, results);
        }
    }

    private optimizeTemplate(template: PromptTemplate, results: PromptResult[]): void {
        const successRate = results.filter(r => r.success).length / results.length;
        const avgExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;

        template.successRate = (1 - this.learningRate) * template.successRate + 
                             this.learningRate * successRate;
        template.usage += results.length;
        template.lastUpdated = Date.now();

        this.emit('templateOptimized', {
            templateId: template.id,
            successRate: template.successRate,
            avgExecutionTime
        });

        this.results.set(template.id, []);
    }

    public getTemplateStats(): object {
        return {
            totalTemplates: this.templates.size,
            averageSuccessRate: Array.from(this.templates.values())
                .reduce((sum, t) => sum + t.successRate, 0) / this.templates.size,
            topPerformers: Array.from(this.templates.values())
                .sort((a, b) => b.successRate - a.successRate)
                .slice(0, 5)
                .map(t => ({
                    id: t.id,
                    successRate: t.successRate,
                    usage: t.usage
                }))
        };
    }
}
