/**
 * Bitcoin Address Utilities
 * Provides validation and formatting functions for Bitcoin addresses
 */
import { createHash } from 'crypto';

// Address types
export enum BitcoinAddressType {
    P2PKH = 'p2pkh',          // Legacy format (starts with 1)
    P2SH = 'p2sh',            // Script hash format (starts with 3)
    BECH32 = 'bech32',        // Segwit format (starts with bc1)
    BECH32M = 'bech32m',      // Taproot format (starts with bc1p)
    UNKNOWN = 'unknown'
}

/**
 * Validates a Bitcoin address
 * @param address Bitcoin address to validate
 * @returns true if address is valid, false otherwise
 */
export function validateBitcoinAddress(address: string): boolean {
    if (!address) return false;

    // Check basic formatting
    if (address.trim() !== address) return false;

    // Legacy address validation
    if (address.startsWith('1')) {
        return validateLegacyAddress(address);
    }

    // P2SH address validation
    if (address.startsWith('3')) {
        return validateP2SHAddress(address);
    }

    // Bech32 address validation
    if (address.startsWith('bc1')) {
        return validateBech32Address(address);
    }

    return false;
}

/**
 * Determine the type of Bitcoin address
 * @param address Bitcoin address
 * @returns The address type
 */
export function getBitcoinAddressType(address: string): BitcoinAddressType {
    if (!address) return BitcoinAddressType.UNKNOWN;

    if (address.startsWith('1')) {
        return validateLegacyAddress(address) ? BitcoinAddressType.P2PKH : BitcoinAddressType.UNKNOWN;
    }

    if (address.startsWith('3')) {
        return validateP2SHAddress(address) ? BitcoinAddressType.P2SH : BitcoinAddressType.UNKNOWN;
    }

    if (address.startsWith('bc1p')) {
        return validateBech32Address(address) ? BitcoinAddressType.BECH32M : BitcoinAddressType.UNKNOWN;
    }

    if (address.startsWith('bc1')) {
        return validateBech32Address(address) ? BitcoinAddressType.BECH32 : BitcoinAddressType.UNKNOWN;
    }

    return BitcoinAddressType.UNKNOWN;
}

/**
 * Format a Bitcoin address for display
 * @param address Bitcoin address
 * @param maxLength Maximum length to display
 * @returns Formatted address for display
 */
export function formatBitcoinAddressForDisplay(address: string, maxLength: number = 16): string {
    if (!address || address.length <= maxLength) return address;

    const start = address.substring(0, maxLength / 2);
    const end = address.substring(address.length - maxLength / 2);

    return `${start}...${end}`;
}

/**
 * Get block explorer URL for a Bitcoin address
 * @param address Bitcoin address
 * @param network 'mainnet' or 'testnet'
 * @returns URL to view the address on a block explorer
 */
export function getBitcoinAddressExplorerUrl(address: string, network: 'mainnet' | 'testnet' = 'mainnet'): string {
    if (!address) return '';

    if (network === 'mainnet') {
        return `https://www.blockchain.com/btc/address/${address}`;
    } else {
        return `https://www.blockchain.com/btc-testnet/address/${address}`;
    }
}

/**
 * Get color code for address type visualization
 * @param type Bitcoin address type
 * @returns Hex color code
 */
export function getAddressTypeColor(type: BitcoinAddressType): string {
    switch (type) {
        case BitcoinAddressType.P2PKH:
            return '#1a73e8'; // Blue
        case BitcoinAddressType.P2SH:
            return '#e67c00'; // Orange
        case BitcoinAddressType.BECH32:
            return '#0d904f'; // Green
        case BitcoinAddressType.BECH32M:
            return '#8e24aa'; // Purple
        default:
            return '#757575'; // Grey
    }
}

/**
 * Generate QR code data URL for a Bitcoin address
 * @param address Bitcoin address
 * @returns Promise with data URL
 */
export async function generateBitcoinAddressQRCode(address: string): Promise<string> {
    try {
        // Typically you would use a QR code library like qrcode
        // For simplicity, we'll just return the Bitcoin URI
        return `bitcoin:${address}`;
    } catch (error) {
        console.error('Error generating QR code:', error);
        return '';
    }
}

// Private validation methods

/**
 * Validate legacy Bitcoin address (P2PKH)
 * Note: This is a simplified check. In production, use a complete validation library.
 */
function validateLegacyAddress(address: string): boolean {
    // Simple length check
    return address.length >= 26 && address.length <= 35;
}

/**
 * Validate P2SH Bitcoin address
 * Note: This is a simplified check. In production, use a complete validation library.
 */
function validateP2SHAddress(address: string): boolean {
    // Simple length check
    return address.length >= 26 && address.length <= 35;
}

/**
 * Validate Bech32 Bitcoin address
 * Note: This is a simplified check. In production, use a complete validation library.
 */
function validateBech32Address(address: string): boolean {
    // Simple check for valid characters and length
    return /^bc1[a-zA-HJ-NP-Z0-9]{14,74}$/.test(address);
}

/**
 * Analyzes a collection of addresses and returns statistics
 * @param addresses Array of Bitcoin addresses
 * @returns Statistics about the addresses
 */
export function analyzeAddresses(addresses: string[]): {
    total: number;
    valid: number;
    byType: Record<BitcoinAddressType, number>;
} {
    const stats = {
        total: addresses.length,
        valid: 0,
        byType: {
            [BitcoinAddressType.P2PKH]: 0,
            [BitcoinAddressType.P2SH]: 0,
            [BitcoinAddressType.BECH32]: 0,
            [BitcoinAddressType.BECH32M]: 0,
            [BitcoinAddressType.UNKNOWN]: 0
        }
    };

    addresses.forEach(address => {
        if (validateBitcoinAddress(address)) {
            stats.valid++;
            const type = getBitcoinAddressType(address);
            stats.byType[type]++;
        } else {
            stats.byType[BitcoinAddressType.UNKNOWN]++;
        }
    });

    return stats;
}
