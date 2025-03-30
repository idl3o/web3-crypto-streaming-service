import { ethers } from 'ethers';

/**
 * Helper functions for wallet interactions
 */

/**
 * Check if a wallet provider is available in the browser
 */
export function isWalletAvailable(): boolean {
    return typeof window !== 'undefined' &&
        (window.ethereum || window.web3);
}

/**
 * Get all available wallet providers
 */
export function getAvailableWallets(): string[] {
    const wallets: string[] = [];

    if (!isWalletAvailable()) {
        return wallets;
    }

    if (window.ethereum?.isMetaMask) {
        wallets.push('metamask');
    }

    if (window.ethereum?.isCoinbaseWallet) {
        wallets.push('coinbase');
    }

    if (window.ethereum?.isWalletConnect) {
        wallets.push('walletconnect');
    }

    if (window.ethereum?.isTrust) {
        wallets.push('trust');
    }

    return wallets;
}

/**
 * Check if an address is a valid Ethereum address
 */
export function isValidEthereumAddress(address: string): boolean {
    try {
        return ethers.utils.isAddress(address);
    } catch {
        return false;
    }
}

/**
 * Format an Ethereum address for display
 */
export function formatAddress(address: string, prefixLength = 6, suffixLength = 4): string {
    if (!address) return '';

    if (!isValidEthereumAddress(address)) {
        return address;
    }

    return `${address.substring(0, prefixLength)}...${address.substring(address.length - suffixLength)}`;
}

/**
 * Verify message signature
 */
export function verifySignature(message: string, signature: string, address: string): boolean {
    try {
        const recoveredAddress = ethers.utils.verifyMessage(message, signature);
        return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch {
        return false;
    }
}

/**
 * Convert wei to ether
 */
export function weiToEther(wei: string | ethers.BigNumber): string {
    try {
        return ethers.utils.formatEther(wei);
    } catch {
        return '0';
    }
}

/**
 * Convert ether to wei
 */
export function etherToWei(ether: string): ethers.BigNumber {
    try {
        return ethers.utils.parseEther(ether);
    } catch {
        return ethers.BigNumber.from(0);
    }
}

/**
 * Get chain information by chain ID
 */
export function getChainInfo(chainId: number): { name: string, currency: string, explorer: string } | null {
    const chains: Record<number, { name: string, currency: string, explorer: string }> = {
        1: {
            name: 'Ethereum Mainnet',
            currency: 'ETH',
            explorer: 'https://etherscan.io'
        },
        5: {
            name: 'Goerli Testnet',
            currency: 'ETH',
            explorer: 'https://goerli.etherscan.io'
        },
        11155111: {
            name: 'Sepolia Testnet',
            currency: 'ETH',
            explorer: 'https://sepolia.etherscan.io'
        },
        137: {
            name: 'Polygon Mainnet',
            currency: 'MATIC',
            explorer: 'https://polygonscan.com'
        },
        80001: {
            name: 'Mumbai Testnet',
            currency: 'MATIC',
            explorer: 'https://mumbai.polygonscan.com'
        }
    };

    return chains[chainId] || null;
}
