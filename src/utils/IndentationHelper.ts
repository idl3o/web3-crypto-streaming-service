/**
 * Utility for managing consistent code indentation
 */

export enum IndentStyle {
    SPACES = 'spaces',
    TABS = 'tabs'
}

export class IndentationHelper {
    private static _instance: IndentationHelper;
    private _indentSize: number = 4;
    private _indentStyle: IndentStyle = IndentStyle.SPACES;
    
    /**
     * Get the singleton instance
     */
    public static getInstance(): IndentationHelper {
        if (!this._instance) {
            this._instance = new IndentationHelper();
        }
        return this._instance;
    }
    
    /**
     * Configure indentation settings
     */
    public configure(style: IndentStyle, size: number = 4): void {
        this._indentStyle = style;
        this._indentSize = size;
    }
    
    /**
     * Get indentation style
     */
    public getIndentStyle(): IndentStyle {
        return this._indentStyle;
    }
    
    /**
     * Get indent size
     */
    public getIndentSize(): number {
        return this._indentSize;
    }
    
    /**
     * Create an indentation string of specified level
     * @param level The indentation level
     */
    public getIndent(level: number): string {
        if (this._indentStyle === IndentStyle.TABS) {
            return '\t'.repeat(level);
        } else {
            return ' '.repeat(level * this._indentSize);
        }
    }
    
    /**
     * Format code with proper indentation
     */
    public formatCode(code: string): string {
        // Detect and preserve existing indentation
        const lines = code.split('\n');
        const indentMatch = lines.find(l => l.match(/^\s+\w/));
        
        if (indentMatch) {
            const existingIndent = indentMatch.match(/^(\s+)\w/)?.[1] || '';
            
            if (existingIndent.includes('\t')) {
                this._indentStyle = IndentStyle.TABS;
                this._indentSize = 1;
            } else {
                this._indentStyle = IndentStyle.SPACES;
                this._indentSize = existingIndent.length;
            }
        }
        
        return code;
    }
    
    /**
     * Analyze a file to detect its indentation style
     */
    public detectIndentation(fileContent: string): void {
        const lines = fileContent.split('\n');
        
        // Count indented lines using spaces vs tabs
        let spaceIndents = 0;
        let tabIndents = 0;
        let spaceIndentSizes: number[] = [];
        
        for (const line of lines) {
            const match = line.match(/^(\s+)\S/);
            if (!match) continue;
            
            const indent = match[1];
            if (indent.includes('\t')) {
                tabIndents++;
            } else {
                spaceIndents++;
                spaceIndentSizes.push(indent.length);
            }
        }
        
        // Determine most common indent style
        if (tabIndents > spaceIndents) {
            this._indentStyle = IndentStyle.TABS;
            this._indentSize = 1;
        } else if (spaceIndents > 0) {
            this._indentStyle = IndentStyle.SPACES;
            
            // Calculate most common indent size
            const sizeFrequency: Record<number, number> = {};
            for (const size of spaceIndentSizes) {
                sizeFrequency[size] = (sizeFrequency[size] || 0) + 1;
            }
            
            let mostCommonSize = 4;
            let highestFrequency = 0;
            
            for (const [size, frequency] of Object.entries(sizeFrequency)) {
                if (frequency > highestFrequency) {
                    highestFrequency = frequency;
                    mostCommonSize = parseInt(size);
                }
            }
            
            this._indentSize = mostCommonSize;
        }
    }
}

export const indentationHelper = IndentationHelper.getInstance();
export default indentationHelper;
