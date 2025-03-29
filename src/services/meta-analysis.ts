/**
 * Service for handling meta analysis data and transformations
 */
export class MetaAnalysisService {
    /**
     * Parse meta analysis text into structured data
     */
    parseMetaText(text: string): Record<string, any> {
        const lines = text.split('\n');
        const metaData: Record<string, any> = {};
        let currentSection = '';
        let sectionContent: any[] = [];
        let currentItem: Record<string, any> | null = null;

        // Extract header info
        const headerMatch = lines[0].match(/META_ANALYSIS_VERSION: ([\d\.]+)/);
        if (headerMatch) {
            metaData.META_ANALYSIS_VERSION = headerMatch[1];
        }

        const typeMatch = lines.find(l => l.includes('ANALYSIS_TYPE:'))?.match(/ANALYSIS_TYPE: ([A-Z_]+)/);
        if (typeMatch) {
            metaData.ANALYSIS_TYPE = typeMatch[1];
        }

        const categoryMatch = lines.find(l => l.includes('INNOVATION_CATEGORY:'))?.match(/INNOVATION_CATEGORY: ([A-Z0-9_]+)/);
        if (categoryMatch) {
            metaData.INNOVATION_CATEGORY = categoryMatch[1];
        }

        // Process sections
        const sections: Record<string, any[]> = {};

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();

            // Skip empty lines and comments
            if (!line || line.startsWith('//')) {
                continue;
            }

            // Detect section headers
            if (line.startsWith('[') && line.endsWith(']')) {
                // Save previous section if it exists
                if (currentSection && sectionContent.length > 0) {
                    sections[currentSection] = [...sectionContent];
                    sectionContent = [];
                }

                // Set new section
                currentSection = line.substring(1, line.length - 1);
                currentItem = null;
                continue;
            }

            // Skip end section marker or checksum info
            if (line.includes('END_') || line.includes('CHECKSUM:') || line.includes('INTEGRITY:')) {
                continue;
            }

            // Process content based on section format
            if (currentSection) {
                // Numbered items often start with numbers
                const numberedMatch = line.match(/^(\d+)\.\s+([A-Z_]+)/);
                if (numberedMatch) {
                    if (currentItem) {
                        sectionContent.push(currentItem);
                    }

                    currentItem = {
                        id: parseInt(numberedMatch[1]),
                        type: numberedMatch[2]
                    };
                    continue;
                }

                // Property lines with colons
                const propertyMatch = line.match(/^\s*([a-z_]+):\s*(.*)/);
                if (propertyMatch && currentItem) {
                    const [, key, value] = propertyMatch;
                    // Try to parse numeric values
                    const numValue = parseFloat(value);
                    currentItem[key] = isNaN(numValue) ? value : numValue;
                    continue;
                }

                // Handle bullet points with dashes
                const bulletMatch = line.match(/^\s*-\s*(.*)/);
                if (bulletMatch) {
                    sectionContent.push(bulletMatch[1]);
                    continue;
                }

                // If we reach here and have a current item, add it to section
                if (currentItem && (!propertyMatch && !bulletMatch && !numberedMatch)) {
                    sectionContent.push(currentItem);
                    currentItem = null;
                }
            }
        }

        // Add the final section content
        if (currentSection && (sectionContent.length > 0 || currentItem)) {
            if (currentItem) {
                sectionContent.push(currentItem);
            }
            sections[currentSection] = sectionContent;
        }

        return {
            metaData,
            sections
        };
    }

    /**
     * Format structured meta data into text
     */
    formatMetaToText(sections: Record<string, any[]>): string {
        let result = '';

        for (const [section, items] of Object.entries(sections)) {
            result += `[${section}]\n`;

            items.forEach((item, index) => {
                if (typeof item === 'object') {
                    // If item has an id, use it for numbering
                    if ('id' in item && 'type' in item) {
                        result += `${item.id}. ${item.type}\n`;

                        // Add all other properties indented
                        Object.entries(item).forEach(([key, value]) => {
                            if (key !== 'id' && key !== 'type') {
                                result += `   ${key}: ${value}\n`;
                            }
                        });
                    } else {
                        // For objects without id/type, just display all properties
                        result += `${index + 1}.\n`;
                        Object.entries(item).forEach(([key, value]) => {
                            result += `   ${key}: ${value}\n`;
                        });
                    }
                    result += '\n';
                } else {
                    // Simple string items
                    result += `   - ${item}\n`;
                }
            });

            result += '\n';
        }

        return result;
    }

    /**
     * Convert meta data to HTML
     */
    convertToHtml(sections: Record<string, any[]>): string {
        let html = '<div class="meta-analysis">';

        for (const [section, items] of Object.entries(sections)) {
            html += `<section class="meta-section" data-section="${section}">`;
            html += `<h2>${this.formatSectionTitle(section)}</h2>`;

            items.forEach((item) => {
                if (typeof item === 'object') {
                    html += '<div class="meta-object">';

                    if ('id' in item && 'type' in item) {
                        html += `<div class="meta-header">${item.id}. ${item.type}</div>`;

                        html += '<div class="meta-properties">';
                        Object.entries(item).forEach(([key, value]) => {
                            if (key !== 'id' && key !== 'type') {
                                html += `<div class="meta-property">
                  <span class="property-name">${this.formatPropertyName(key)}</span>
                  <span class="property-value">${value}</span>
                </div>`;
                            }
                        });
                        html += '</div>';
                    } else {
                        html += '<div class="meta-properties">';
                        Object.entries(item).forEach(([key, value]) => {
                            html += `<div class="meta-property">
                <span class="property-name">${this.formatPropertyName(key)}</span>
                <span class="property-value">${value}</span>
              </div>`;
                        });
                        html += '</div>';
                    }

                    html += '</div>';
                } else {
                    html += `<div class="meta-item">${item}</div>`;
                }
            });

            html += '</section>';
        }

        html += '</div>';
        return html;
    }

    /**
     * Format section title for display
     */
    private formatSectionTitle(section: string): string {
        return section
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, c => c.toUpperCase());
    }

    /**
     * Format property name for display
     */
    private formatPropertyName(property: string): string {
        return property
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, c => c.toUpperCase());
    }

    /**
     * Generate graph data for visualization
     */
    generateGraphData(metaData: any): any {
        // Extract relationships from component relationships section
        const relationships = metaData.sections?.COMPONENT_RELATIONSHIPS || [];
        const nodes = new Set<string>();
        const edges = [];

        relationships.forEach(rel => {
            const parts = rel.split('->').map(p => p.trim());
            if (parts.length === 2) {
                nodes.add(parts[0]);
                nodes.add(parts[1]);
                edges.push({ source: parts[0], target: parts[1] });
            }
        });

        return {
            nodes: Array.from(nodes).map(id => ({ id })),
            links: edges
        };
    }
}

export default new MetaAnalysisService();
