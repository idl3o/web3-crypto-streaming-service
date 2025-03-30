/**
 * Regional Compliance Service
 * Handles region-specific compliance requirements, focusing on USA regulations
 */

export interface ComplianceRequirement {
    id: string;
    name: string;
    description: string;
    region: string;
    requiredDocuments: string[];
    verificationSteps: string[];
    isActive: boolean;
}

export interface TaxDocument {
    type: string;
    name: string;
    region: string;
    description: string;
    required: boolean;
    url: string;
}

export interface RegionalRestriction {
    contentType: string;
    region: string;
    description: string;
    isBlocked: boolean;
    alternativeAction?: string;
}

export class RegionalComplianceService {
    private regionSettings: Map<string, any> = new Map();

    constructor() {
        this.initializeRegionSettings();
    }

    /**
     * Check if a specific feature is available in the user's region
     */
    isFeatureAvailable(featureId: string, region: string): boolean {
        const settings = this.regionSettings.get(region);
        if (!settings || !settings.availableFeatures) {
            return true; // Default to available if no specific restrictions
        }

        return settings.availableFeatures.includes(featureId);
    }

    /**
     * Get compliance requirements for a specific region
     */
    getComplianceRequirements(region: string): ComplianceRequirement[] {
        const settings = this.regionSettings.get(region);
        if (!settings || !settings.complianceRequirements) {
            return [];
        }

        return settings.complianceRequirements;
    }

    /**
     * Get tax documents required for a specific region
     */
    getTaxDocuments(region: string): TaxDocument[] {
        const settings = this.regionSettings.get(region);
        if (!settings || !settings.taxDocuments) {
            return [];
        }

        return settings.taxDocuments;
    }

    /**
     * Check if content is restricted in a specific region
     */
    getContentRestrictions(contentType: string, region: string): RegionalRestriction | null {
        const settings = this.regionSettings.get(region);
        if (!settings || !settings.contentRestrictions) {
            return null;
        }

        return settings.contentRestrictions.find(
            (r: RegionalRestriction) => r.contentType === contentType && r.region === region
        ) || null;
    }

    /**
     * Get payment methods available in a specific region
     */
    getAvailablePaymentMethods(region: string): string[] {
        const settings = this.regionSettings.get(region);
        if (!settings || !settings.paymentMethods) {
            return ['bitcoin', 'ethereum']; // Default payment methods
        }

        return settings.paymentMethods;
    }

    /**
     * Check if a user needs to complete KYC based on region and transaction amount
     */
    requiresKYC(region: string, transactionAmountUSD: number): boolean {
        const settings = this.regionSettings.get(region);
        if (!settings || !settings.kycThresholds) {
            return transactionAmountUSD >= 3000; // Default threshold
        }

        return transactionAmountUSD >= settings.kycThresholds.threshold;
    }

    /**
     * Get region-specific disclosure text
     */
    getRequiredDisclosures(region: string): string[] {
        const settings = this.regionSettings.get(region);
        if (!settings || !settings.requiredDisclosures) {
            return [];
        }

        return settings.requiredDisclosures;
    }

    /**
     * Initialize region-specific settings
     * Focusing on USA compliance requirements
     */
    private initializeRegionSettings(): void {
        // USA settings
        this.regionSettings.set('USA', {
            availableFeatures: [
                'streaming', 'bitcoin-payments', 'ethereum-payments', 'creator-payouts',
                'nft-marketplace', 'content-upload'
            ],
            complianceRequirements: [
                {
                    id: 'usa-kyc',
                    name: 'Know Your Customer (KYC)',
                    description: 'Identity verification required for transactions over $3,000',
                    region: 'USA',
                    requiredDocuments: ['Government ID', 'Proof of Address'],
                    verificationSteps: [
                        'Upload identification documents',
                        'Verify phone number',
                        'Complete facial recognition'
                    ],
                    isActive: true
                },
                {
                    id: 'usa-aml',
                    name: 'Anti-Money Laundering (AML)',
                    description: 'Compliance with AML regulations for digital assets',
                    region: 'USA',
                    requiredDocuments: ['Source of Funds Declaration'],
                    verificationSteps: [
                        'Complete transaction history review',
                        'Provide source of funds information'
                    ],
                    isActive: true
                }
            ],
            taxDocuments: [
                {
                    type: 'W-9',
                    name: 'Request for Taxpayer Identification Number and Certification',
                    region: 'USA',
                    description: 'Required for US creators earning over $600 per year',
                    required: true,
                    url: 'https://www.irs.gov/forms-pubs/about-form-w-9'
                },
                {
                    type: '1099-K',
                    name: 'Payment Card and Third Party Network Transactions',
                    region: 'USA',
                    description: 'Platform will issue this to creators earning over $600 per year',
                    required: true,
                    url: 'https://www.irs.gov/forms-pubs/about-form-1099-k'
                }
            ],
            contentRestrictions: [
                {
                    contentType: 'gambling',
                    region: 'USA',
                    description: 'Gambling content is restricted in some US states',
                    isBlocked: true,
                    alternativeAction: 'Requires state-by-state compliance and licensing'
                },
                {
                    contentType: 'securities',
                    region: 'USA',
                    description: 'Content promoting unregistered securities offerings',
                    isBlocked: true,
                    alternativeAction: 'Consult with SEC compliance team'
                }
            ],
            paymentMethods: [
                'bitcoin', 'ethereum', 'creditCard', 'debitCard', 'ach', 'wire'
            ],
            kycThresholds: {
                threshold: 3000, // USD
                requiresDocuments: true,
                requiresVerification: true
            },
            requiredDisclosures: [
                'Digital assets are not legal tender, are not backed by any government, and accounts and value balances are not subject to FDIC or SIPC protections.',
                'This platform is not a regulated exchange under U.S. securities laws.',
                'Trading in digital assets may be subject to tax in your jurisdiction.',
                'Past performance is not indicative of future results.'
            ]
        });

        // Add other regions as needed...

        // Default global settings for regions not specifically defined
        this.regionSettings.set('DEFAULT', {
            availableFeatures: ['streaming', 'bitcoin-payments', 'ethereum-payments'],
            paymentMethods: ['bitcoin', 'ethereum'],
            kycThresholds: {
                threshold: 10000, // USD
                requiresDocuments: true,
                requiresVerification: true
            }
        });
    }
}

export const regionalComplianceService = new RegionalComplianceService();
export default regionalComplianceService;
