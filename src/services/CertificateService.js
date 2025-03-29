/**
 * Certificate Service
 * 
 * Handles the issuance, verification, and management of community certificates,
 * which serve as on-chain credentials for platform participants.
 */

import { ethers } from 'ethers';
import * as MarriageService from './MarriageService';

// Certificate types
export const CERTIFICATE_TYPES = {
  CREATOR: 'creator',       // Certified content creator
  CURATOR: 'curator',       // Community content curator
  CONTRIBUTOR: 'contributor', // Code/platform contributor
  VALIDATOR: 'validator',   // Network validator
  AMBASSADOR: 'ambassador', // Community ambassador
  PARTNER: 'partner',       // Official platform partner
  EDUCATOR: 'educator',     // Educational content provider
  DEVELOPER: 'developer',   // Verified developer
  CUSTOM: 'custom'          // Custom certificate type
};

// Certificate status
export const CERTIFICATE_STATUS = {
  ACTIVE: 'active',
  REVOKED: 'revoked',
  EXPIRED: 'expired',
  PENDING: 'pending'
};

// Certificate badge tiers
export const CERTIFICATE_TIERS = {
  BRONZE: 'bronze',   // Entry level (0-6 months)
  SILVER: 'silver',   // Established (6mo-1yr)
  GOLD: 'gold',       // Distinguished (1-2yrs)
  PLATINUM: 'platinum', // Elite (2+ years)
  DIAMOND: 'diamond'  // Exceptional (invitation only)
};

// Cache for certificates
const certificateCache = new Map();

/**
 * Issue a new community certificate
 * 
 * @param {Object} certificateData Certificate details
 * @returns {Promise<Object>} Issuance result
 */
export async function issueCertificate(certificateData) {
  try {
    // Validate required fields
    if (!certificateData.recipient || !certificateData.type) {
      throw new Error('Certificate must include recipient and type');
    }

    // Use local network if married, otherwise use main network
    const provider = MarriageService.isMarried() 
      ? MarriageService.getProviderForOperation()
      : new ethers.providers.Web3Provider(window.ethereum);

    // Generate certificate ID
    const certificateId = ethers.utils.id(
      `${certificateData.recipient}-${certificateData.type}-${Date.now()}`
    ).slice(0, 42); // Create unique ID

    // Build certificate object
    const certificate = {
      id: certificateId,
      recipient: certificateData.recipient,
      type: certificateData.type,
      issuer: certificateData.issuer || 'platform', // Default issuer is 'platform'
      issuedAt: certificateData.issuedAt || new Date().toISOString(),
      expiresAt: certificateData.expiresAt || null,
      status: CERTIFICATE_STATUS.ACTIVE,
      tier: certificateData.tier || CERTIFICATE_TIERS.BRONZE,
      metadata: certificateData.metadata || {},
      revocationReason: null,
      signature: null // Will be filled in after signing
    };

    // In production, we would interact with a smart contract
    // For now, we'll simulate the issuance by signing the certificate data
    const signer = provider.getSigner();
    const signerAddress = await signer.getAddress();

    // Create message hash for signing (simplified version)
    const messageHash = ethers.utils.solidityKeccak256(
      ['string', 'string', 'string', 'string'],
      [certificate.id, certificate.recipient, certificate.type, certificate.issuedAt]
    );
    
    // Sign certificate data
    const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));
    certificate.signature = signature;
    certificate.issuer = signerAddress;

    // Store in cache
    certificateCache.set(certificateId, certificate);
    
    // Also store in user certificates
    let userCertificates = JSON.parse(localStorage.getItem(`certificates_${certificate.recipient}`) || '[]');
    userCertificates.push(certificate);
    localStorage.setItem(`certificates_${certificate.recipient}`, JSON.stringify(userCertificates));

    return {
      success: true,
      certificate
    };
  } catch (error) {
    console.error('Failed to issue certificate:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verify a community certificate
 * 
 * @param {string} certificateId ID of certificate to verify
 * @returns {Promise<Object>} Verification result
 */
export async function verifyCertificate(certificateId) {
  try {
    // Check cache first
    if (certificateCache.has(certificateId)) {
      const certificate = certificateCache.get(certificateId);
      
      // Check if expired
      if (certificate.expiresAt && new Date(certificate.expiresAt) < new Date()) {
        return {
          success: false,
          status: CERTIFICATE_STATUS.EXPIRED,
          message: 'Certificate has expired'
        };
      }
      
      // Check if revoked
      if (certificate.status === CERTIFICATE_STATUS.REVOKED) {
        return {
          success: false,
          status: CERTIFICATE_STATUS.REVOKED,
          message: `Certificate revoked: ${certificate.revocationReason || 'No reason provided'}`
        };
      }

      // Verify signature (simplified for demo)
      try {
        const messageHash = ethers.utils.solidityKeccak256(
          ['string', 'string', 'string', 'string'],
          [certificate.id, certificate.recipient, certificate.type, certificate.issuedAt]
        );

        const recoveredAddress = ethers.utils.verifyMessage(
          ethers.utils.arrayify(messageHash),
          certificate.signature
        );

        const signatureValid = recoveredAddress.toLowerCase() === certificate.issuer.toLowerCase();

        if (!signatureValid) {
          return {
            success: false,
            message: 'Invalid certificate signature'
          };
        }

        return {
          success: true,
          status: CERTIFICATE_STATUS.ACTIVE,
          certificate
        };
      } catch (sigError) {
        return {
          success: false,
          message: 'Error verifying certificate signature'
        };
      }
    }

    // If not in cache, query from blockchain or API
    // For demo, we'll check localStorage
    const allAddresses = findAllCertificateAddresses();
    
    for (const address of allAddresses) {
      const userCertificates = JSON.parse(localStorage.getItem(`certificates_${address}`) || '[]');
      const certificate = userCertificates.find(cert => cert.id === certificateId);
      
      if (certificate) {
        // Add to cache
        certificateCache.set(certificateId, certificate);
        
        // Recursive call to verify now that it's in cache
        return verifyCertificate(certificateId);
      }
    }

    // Certificate not found
    return {
      success: false,
      message: 'Certificate not found'
    };
  } catch (error) {
    console.error('Failed to verify certificate:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get all certificates for a user
 * 
 * @param {string} address Wallet address of user
 * @returns {Promise<Array>} User's certificates
 */
export async function getUserCertificates(address) {
  if (!address) return [];
  
  try {
    // In production, we would query a smart contract or database
    // For now, we'll simulate by using localStorage
    const certificates = JSON.parse(localStorage.getItem(`certificates_${address}`) || '[]');
    
    // Update cache with these certificates
    certificates.forEach(cert => {
      certificateCache.set(cert.id, cert);
    });
    
    return certificates;
  } catch (error) {
    console.error(`Error fetching certificates for ${address}:`, error);
    return [];
  }
}

/**
 * Revoke a certificate
 * 
 * @param {string} certificateId ID of certificate to revoke
 * @param {string} reason Reason for revocation
 * @returns {Promise<Object>} Revocation result
 */
export async function revokeCertificate(certificateId, reason = '') {
  try {
    // Check if certificate exists
    const verifyResult = await verifyCertificate(certificateId);
    if (!verifyResult.success || !verifyResult.certificate) {
      return {
        success: false,
        message: 'Certificate not found or invalid'
      };
    }

    const certificate = verifyResult.certificate;

    // Update certificate status
    certificate.status = CERTIFICATE_STATUS.REVOKED;
    certificate.revocationReason = reason;
    certificate.revokedAt = new Date().toISOString();

    // Update in cache
    certificateCache.set(certificateId, certificate);

    // Update in localStorage
    const userCertificates = JSON.parse(localStorage.getItem(`certificates_${certificate.recipient}`) || '[]');
    const updatedCertificates = userCertificates.map(cert => 
      cert.id === certificateId ? certificate : cert
    );
    localStorage.setItem(`certificates_${certificate.recipient}`, JSON.stringify(updatedCertificates));

    return {
      success: true,
      certificate
    };
  } catch (error) {
    console.error('Failed to revoke certificate:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get certificate metadata by ID
 * 
 * @param {string} certificateId Certificate ID
 * @returns {Promise<Object>} Certificate metadata
 */
export async function getCertificateMetadata(certificateId) {
  try {
    const verifyResult = await verifyCertificate(certificateId);
    if (!verifyResult.success) {
      return null;
    }
    
    return verifyResult.certificate.metadata || {};
  } catch (error) {
    console.error('Error fetching certificate metadata:', error);
    return null;
  }
}

/**
 * Get certificate display data (name, icon, description) for each certificate type
 * 
 * @param {string} type Certificate type
 * @returns {Object} Display data
 */
export function getCertificateDisplayData(type) {
  switch (type) {
    case CERTIFICATE_TYPES.CREATOR:
      return {
        name: 'Certified Creator',
        icon: 'fas fa-video',
        color: '#4CAF50',
        description: 'Verified content creator on the platform'
      };
    case CERTIFICATE_TYPES.CURATOR:
      return {
        name: 'Content Curator',
        icon: 'fas fa-edit',
        color: '#2196F3',
        description: 'Community content curator and reviewer'
      };
    case CERTIFICATE_TYPES.CONTRIBUTOR:
      return {
        name: 'Platform Contributor',
        icon: 'fas fa-code',
        color: '#9C27B0',
        description: 'Contributor to platform development'
      };
    case CERTIFICATE_TYPES.VALIDATOR:
      return {
        name: 'Network Validator',
        icon: 'fas fa-shield-alt',
        color: '#FF9800',
        description: 'Validator node operator'
      };
    case CERTIFICATE_TYPES.AMBASSADOR:
      return {
        name: 'Community Ambassador',
        icon: 'fas fa-award',
        color: '#E91E63',
        description: 'Official platform ambassador'
      };
    case CERTIFICATE_TYPES.PARTNER:
      return {
        name: 'Platform Partner',
        icon: 'fas fa-handshake',
        color: '#00BCD4',
        description: 'Official platform partner'
      };
    case CERTIFICATE_TYPES.EDUCATOR:
      return {
        name: 'Educational Creator',
        icon: 'fas fa-graduation-cap',
        color: '#795548',
        description: 'Certified educational content provider'
      };
    case CERTIFICATE_TYPES.DEVELOPER:
      return {
        name: 'Verified Developer',
        icon: 'fas fa-laptop-code',
        color: '#607D8B',
        description: 'Verified platform developer'
      };
    case CERTIFICATE_TYPES.CUSTOM:
    default:
      return {
        name: 'Custom Certificate',
        icon: 'fas fa-certificate',
        color: '#9E9E9E',
        description: 'Custom community certificate'
      };
  }
}

/**
 * Get tier display data
 * 
 * @param {string} tier Certificate tier
 * @returns {Object} Tier display data
 */
export function getTierDisplayData(tier) {
  switch (tier) {
    case CERTIFICATE_TIERS.BRONZE:
      return {
        name: 'Bronze',
        color: '#CD7F32',
        icon: 'B'
      };
    case CERTIFICATE_TIERS.SILVER:
      return {
        name: 'Silver',
        color: '#C0C0C0',
        icon: 'S'
      };
    case CERTIFICATE_TIERS.GOLD:
      return {
        name: 'Gold',
        color: '#FFD700',
        icon: 'G'
      };
    case CERTIFICATE_TIERS.PLATINUM:
      return {
        name: 'Platinum',
        color: '#E5E4E2',
        icon: 'P'
      };
    case CERTIFICATE_TIERS.DIAMOND:
      return {
        name: 'Diamond',
        color: '#B9F2FF',
        icon: 'D'
      };
    default:
      return {
        name: 'Unknown',
        color: '#9E9E9E',
        icon: '?'
      };
  }
}

/**
 * Find all addresses that have certificates
 * (Helper function for demo implementation)
 * 
 * @returns {string[]} Array of addresses
 */
function findAllCertificateAddresses() {
  const addresses = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('certificates_')) {
      addresses.push(key.replace('certificates_', ''));
    }
  }
  return addresses;
}

/**
 * Get certificate issuance costs
 * 
 * @param {string} type Certificate type
 * @param {Object} options Additional options
 * @returns {Promise<Object>} Certificate cost details
 */
export async function getCertificateCosts(type = CERTIFICATE_TYPES.STANDARD, options = {}) {
  try {
    // Base certificate costs
    const baseCosts = {
      [CERTIFICATE_TYPES.STANDARD]: 0.01,     // 0.01 ETH
      [CERTIFICATE_TYPES.COMMUNITY]: 0.02,     // 0.02 ETH
      [CERTIFICATE_TYPES.CREATOR]: 0.05,       // 0.05 ETH
      [CERTIFICATE_TYPES.VALIDATOR]: 0.08,     // 0.08 ETH
      [CERTIFICATE_TYPES.PREMIUM]: 0.15,       // 0.15 ETH
      [CERTIFICATE_TYPES.PERPETUAL]: 0.5       // 0.5 ETH
    };
    
    // Get base cost with slight market factor variation
    const marketFactor = 0.95 + (Math.random() * 0.1); // ±5% market variation
    const baseCost = (baseCosts[type] || baseCosts[CERTIFICATE_TYPES.STANDARD]) * marketFactor;
    
    // Calculate gas estimate
    const gasEstimate = 180000; // Fixed gas estimate for certificate issuance
    const gasPrice = await BlockchainService.getProvider().getGasPrice();
    const gasPriceGwei = parseFloat(ethers.utils.formatUnits(gasPrice, 'gwei'));
    const gasCostEth = gasEstimate * gasPriceGwei * 1e-9;
    
    // Previously had tax calculation - now removed
    const taxAmount = 0; // Tax is now always zero
    
    // Final calculation
    const totalCost = baseCost + gasCostEth;
    
    return {
      baseCost: baseCost,
      gasCost: gasCostEth,
      taxAmount: 0, // Always zero now
      totalCost: totalCost,
      certificateType: type,
      isTaxFree: true,
      gasEstimate: gasEstimate,
      gasPriceGwei: gasPriceGwei,
      breakdown: {
        base: baseCost,
        gas: gasCostEth,
        tax: 0 // Always zero
      }
    };
  } catch (error) {
    console.error('Error calculating certificate costs:', error);
    throw error;
  }
}

export default {
  issueCertificate,
  verifyCertificate,
  getUserCertificates,
  revokeCertificate,
  getCertificateMetadata,
  getCertificateDisplayData,
  getTierDisplayData,
  getCertificateCosts,
  CERTIFICATE_TYPES,
  CERTIFICATE_STATUS,
  CERTIFICATE_TIERS
};
