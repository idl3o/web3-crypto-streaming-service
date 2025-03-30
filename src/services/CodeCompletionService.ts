/**
 * Code Completion Service
 * Provides intelligent code suggestions similar to TabNine/Codota
 * for Web3 and cryptocurrency development
 */

import { geminiAIService } from './GeminiAIService';

export interface CompletionOptions {
  maxSuggestions?: number;
  language?: string;
  context?: string;
  indentation?: number;
  timeout?: number;
  includeTypes?: boolean;
}

export interface CodeSuggestion {
  text: string;
  score: number;
  type?: 'method' | 'property' | 'class' | 'keyword' | 'variable' | 'snippet' | 'other';
  description?: string;
  documentation?: string;
}

export class CodeCompletionService {
  private localCache: Map<string, { suggestions: CodeSuggestion[], timestamp: number }> = new Map();
  private cacheExpiryMs: number = 1000 * 60 * 60; // 1 hour
  private web3Keywords: Set<string> = new Set([
    'ethereum', 'block', 'transaction', 'wei', 'gwei', 'ether', 'gas', 'address',
    'contract', 'wallet', 'nonce', 'sign', 'verify', 'token', 'erc20', 'erc721',
    'ipfs', 'hash', 'blockchain', 'web3', 'metamask', 'satoshi', 'bitcoin'
  ]);
  
  /**
   * Get code suggestions for the current cursor position
   * @param code Current code
   * @param cursorPosition Position of cursor in the code
   * @param options Completion options
   */
  public async getSuggestions(
    code: string,
    cursorPosition: number,
    options: CompletionOptions = {}
  ): Promise<CodeSuggestion[]> {
    const prefix = code.substring(0, cursorPosition);
    const cacheKey = this.generateCacheKey(prefix, options);
    
    // Check cache first
    const cached = this.localCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiryMs) {
      return cached.suggestions;
    }
    
    try {
      // Get context around the cursor position
      const context = this.extractContext(code, cursorPosition, options.context);
      
      // Get suggestions from different sources
      const [localSuggestions, aiSuggestions] = await Promise.all([
        this.getLocalSuggestions(prefix, options),
        this.getAISuggestions(context, prefix, options)
      ]);
      
      // Merge and rank suggestions
      const mergedSuggestions = this.mergeSuggestions(localSuggestions, aiSuggestions);
      
      // Cache the results
      this.localCache.set(cacheKey, {
        suggestions: mergedSuggestions,
        timestamp: Date.now()
      });
      
      return mergedSuggestions;
    } catch (error) {
      console.error('Error getting code suggestions:', error);
      return [];
    }
  }
  
  /**
   * Generate basic suggestions based on local patterns and dictionary
   */
  private async getLocalSuggestions(
    prefix: string,
    options: CompletionOptions
  ): Promise<CodeSuggestion[]> {
    const suggestions: CodeSuggestion[] = [];
    
    // Extract the current token being typed
    const tokenMatch = prefix.match(/[\w$]+$/);
    if (!tokenMatch) return [];
    
    const currentToken = tokenMatch[0].toLowerCase();
    if (currentToken.length < 2) return [];
    
    // Check for Web3 keywords
    for (const keyword of this.web3Keywords) {
      if (keyword.toLowerCase().includes(currentToken)) {
        suggestions.push({
          text: keyword,
          score: this.calculateScore(currentToken, keyword),
          type: 'keyword'
        });
      }
    }
    
    // Add common blockchain patterns based on context
    if (prefix.includes('transaction') || prefix.includes('tx')) {
      suggestions.push({
        text: 'sendTransaction',
        score: 0.8,
        type: 'method',
        description: 'Send a transaction to the network'
      });
    }
    
    if (prefix.includes('contract') || prefix.includes('deploy')) {
      suggestions.push({
        text: 'deployContract',
        score: 0.85,
        type: 'method',
        description: 'Deploy a new smart contract'
      });
    }
    
    if (prefix.includes('address') || prefix.includes('wallet')) {
      suggestions.push({
        text: 'validateAddress',
        score: 0.82,
        type: 'method',
        description: 'Validate a blockchain address'
      });
    }
    
    return suggestions.sort((a, b) => b.score - a.score)
      .slice(0, options.maxSuggestions || 5);
  }
  
  /**
   * Generate AI-powered suggestions using Gemini
   */
  private async getAISuggestions(
    context: string,
    prefix: string,
    options: CompletionOptions
  ): Promise<CodeSuggestion[]> {
    if (!geminiAIService.isConfigured()) {
      return [];
    }
    
    try {
      const language = options.language || this.detectLanguage(context);
      const prompt = `
Given the following code context in ${language}, suggest code completions for where the cursor is located (marked by |).
Return 3-5 high-quality suggestions formatted as JSON array of objects with "text" and "type" properties.
Focus on Web3/blockchain-specific completions when relevant.

CODE CONTEXT:
\`\`\`${language}
${context.trim()}|
\`\`\`

Only respond with valid JSON array, nothing else:
[{
  "text": "completion text",
  "type": "method|property|class|variable|snippet",
  "description": "brief description"
}, ... ]
`;

      const response = await geminiAIService.generateContent(prompt, {
        temperature: 0.2,
        maxOutputTokens: 500
      });
      
      try {
        // Parse the AI response as JSON
        const jsonString = response.text.replace(/```json|```/g, '').trim();
        const suggestions = JSON.parse(jsonString);
        
        // Add scores and validate the suggestions
        return suggestions.map((suggestion: any, index: number) => ({
          text: suggestion.text || "",
          type: suggestion.type || "other",
          description: suggestion.description || "",
          score: 0.9 - (index * 0.05) // Give AI suggestions high scores, decreasing by position
        })).filter((s: CodeSuggestion) => s.text.length > 0);
      } catch (error) {
        console.error('Failed to parse AI suggestions:', error);
        return [];
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      return [];
    }
  }
  
  /**
   * Merge and rank suggestions from different sources
   */
  private mergeSuggestions(
    localSuggestions: CodeSuggestion[],
    aiSuggestions: CodeSuggestion[]
  ): CodeSuggestion[] {
    // Combine all suggestions
    const allSuggestions = [...localSuggestions, ...aiSuggestions];
    
    // Remove duplicates, keeping the one with the highest score
    const uniqueSuggestions = new Map<string, CodeSuggestion>();
    
    for (const suggestion of allSuggestions) {
      const existing = uniqueSuggestions.get(suggestion.text);
      
      if (!existing || suggestion.score > existing.score) {
        uniqueSuggestions.set(suggestion.text, suggestion);
      }
    }
    
    // Sort by score and return
    return Array.from(uniqueSuggestions.values())
      .sort((a, b) => b.score - a.score);
  }
  
  /**
   * Calculate how well a token matches a suggestion
   */
  private calculateScore(token: string, suggestion: string): number {
    const lowerToken = token.toLowerCase();
    const lowerSuggestion = suggestion.toLowerCase();
    
    // Exact match at beginning (highest score)
    if (lowerSuggestion.startsWith(lowerToken)) {
      return 0.9 + ((lowerToken.length / lowerSuggestion.length) * 0.1);
    }
    
    // Word boundary match (medium score)
    if (lowerSuggestion.includes(`_${lowerToken}`) || lowerSuggestion.includes(`.${lowerToken}`)) {
      return 0.8;
    }
    
    // Contains match (lower score)
    if (lowerSuggestion.includes(lowerToken)) {
      return 0.7;
    }
    
    // Fuzzy match (lowest score)
    let matchingChars = 0;
    let lastMatchIndex = -1;
    
    for (const char of lowerToken) {
      const index = lowerSuggestion.indexOf(char, lastMatchIndex + 1);
      if (index > -1) {
        matchingChars++;
        lastMatchIndex = index;
      }
    }
    
    return (matchingChars / lowerToken.length) * 0.6;
  }
  
  /**
   * Extract context around cursor position
   */
  private extractContext(code: string, cursorPosition: number, contextType?: string): string {
    // Default to showing the last few lines
    const contextSize = 500; // Characters
    const start = Math.max(0, cursorPosition - contextSize);
    return code.substring(start, cursorPosition);
  }
  
  /**
   * Generate cache key for suggestions
   */
  private generateCacheKey(prefix: string, options: CompletionOptions): string {
    const lastTokens = prefix.split(/\s+/).slice(-5).join(' ');
    return `${lastTokens}|${options.language || ''}|${options.includeTypes || false}`;
  }
  
  /**
   * Attempt to detect the programming language from code
   */
  private detectLanguage(code: string): string {
    if (code.includes('contract') && code.includes('function') && code.includes('address')) {
      return 'solidity';
    }
    
    if (code.includes('import React') || code.includes('useState') || code.includes('function Component')) {
      return 'typescript-react';
    }
    
    if (code.includes('import') && (code.includes('from') || code.includes('export'))) {
      return code.includes('interface') || code.includes(': ') ? 'typescript' : 'javascript';
    }
    
    return 'javascript';
  }
  
  /**
   * Clear the suggestion cache
   */
  public clearCache(): void {
    this.localCache.clear();
  }
}

// Create singleton instance
export const codeCompletionService = new CodeCompletionService();
export default codeCompletionService;
