/**
 * USA Tax Reporting Utilities
 * Handles tax calculation and reporting requirements for USA users
 */

export interface EarningsRecord {
    creatorId: string;
    year: number;
    totalEarnings: number; // In USD
    transactions: TransactionRecord[];
    reportable: boolean;
}

interface TransactionRecord {
    id: string;
    date: Date;
    amount: number; // In USD
    type: 'payment' | 'tip' | 'subscription' | 'sale';
    description: string;
    currency: string;
    exchangeRate?: number;
}

/**
 * Check if creator earnings are reportable (require 1099-K)
 * Current threshold is $600 per year as of 2022 IRS regulations
 */
export function isReportableEarnings(totalEarningsUSD: number): boolean {
    const REPORTING_THRESHOLD = 600; // $600 USD threshold for 1099-K
    return totalEarningsUSD >= REPORTING_THRESHOLD;
}

/**
 * Calculate estimated self-employment tax for creators
 * This is a simplified estimation for informational purposes
 */
export function estimateSelfEmploymentTax(netEarningsUSD: number): number {
    // Self-employment tax rate is 15.3% (12.4% for Social Security, 2.9% for Medicare)
    const SE_TAX_RATE = 0.153;

    // Only 92.35% of net earnings are subject to SE tax
    const taxableEarnings = netEarningsUSD * 0.9235;

    return taxableEarnings * SE_TAX_RATE;
}

/**
 * Format a taxpayer identification number for display
 * Masks the TIN/SSN for security
 */
export function formatTIN(tin: string): string {
    // Ensure TIN is valid format
    if (!tin || tin.length !== 9) {
        return 'Invalid TIN';
    }

    // Mask all but last 4 digits
    return `XXX-XX-${tin.substring(5)}`;
}

/**
 * Generate a tax summary for creators
 */
export function generateTaxSummary(earnings: EarningsRecord): {
    reportable: boolean;
    totalEarnings: number;
    estimatedTax: number;
    documents: string[];
} {
    const isReportable = isReportableEarnings(earnings.totalEarnings);
    const estimatedTax = estimateSelfEmploymentTax(earnings.totalEarnings);

    const documents = [];
    if (isReportable) {
        documents.push('W-9 (Required)');
        documents.push('1099-K (Will be issued by platform)');
    }

    return {
        reportable: isReportable,
        totalEarnings: earnings.totalEarnings,
        estimatedTax,
        documents
    };
}

/**
 * Basic validation for a US Social Security Number or Tax ID
 */
export function validateUSTaxId(taxId: string): boolean {
    // Remove any dashes or spaces
    const cleanId = taxId.replace(/[-\s]/g, '');

    // Check if it's 9 digits
    if (!/^\d{9}$/.test(cleanId)) {
        return false;
    }

    // Ensure it's not all the same digit (common invalid pattern)
    if (/^(\d)\1{8}$/.test(cleanId)) {
        return false;
    }

    // Check if it starts with valid SSN prefix (not 000, 666, or 900-999)
    const firstThree = parseInt(cleanId.substring(0, 3), 10);
    if (firstThree === 0 || firstThree === 666 || (firstThree >= 900 && firstThree <= 999)) {
        return false;
    }

    // Check if middle two or last four are all zeros (invalid for SSN)
    const middle = parseInt(cleanId.substring(3, 5), 10);
    const last = parseInt(cleanId.substring(5, 9), 10);
    if (middle === 0 || last === 0) {
        return false;
    }

    return true;
}

/**
 * Format a USD value for tax reporting
 */
export function formatUSDForTaxes(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

/**
 * Get the current tax year
 */
export function getCurrentTaxYear(): number {
    const currentDate = new Date();
    return currentDate.getFullYear();
}
