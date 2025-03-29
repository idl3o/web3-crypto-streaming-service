/**
 * Safety Service for Web3 Crypto Streaming Platform
 * 
 * Provides security assessments, risk calculations, and safety features
 * to protect users from scams, malicious content, and risky investments.
 */

// SafeMode persistent state with default settings
const SAFE_MODE_STORAGE_KEY = 'w3cs_safe_mode_settings';

// Default safety thresholds
const DEFAULT_SAFETY_THRESHOLDS = {
  investment: {
    lowRisk: 10,     // % of wallet balance
    mediumRisk: 25,  // % of wallet balance
    highRisk: 40     // % of wallet balance
  },
  content: {
    minVerifiedScore: 70,        // Minimum trust score for verified content 
    minSafeProtocolScore: 85     // Minimum security score for promoted protocols
  },
  transaction: {
    requireConfirmation: true,   // Require explicit confirmation
    warningDelay: 5000,          // 5 second warning delay for high-risk actions
    simulateFirst: true          // Simulate transactions before executing
  }
};

/**
 * Initializes the safety service
 */
export function initSafety() {
  // Load saved settings or use defaults
  const savedSettings = loadSafetySettings();

  // Check for any critical security updates
  checkSecurityUpdates();

  return savedSettings;
}

/**
 * Get current safety mode settings
 */
export function getSafetySettings() {
  return loadSafetySettings();
}

/**
 * Updates safety mode settings
 * @param {Object} settings - New safety settings
 * @returns {Object} Updated settings
 */
export function updateSafetySettings(settings) {
  const currentSettings = loadSafetySettings();
  const updatedSettings = { ...currentSettings, ...settings };

  localStorage.setItem(SAFE_MODE_STORAGE_KEY, JSON.stringify(updatedSettings));
  return updatedSettings;
}

/**
 * Toggle safe mode on/off
 * @param {boolean} enabled - Whether safe mode should be on
 * @returns {Object} Updated settings
 */
export function toggleSafeMode(enabled) {
  const currentSettings = loadSafetySettings();
  currentSettings.enabled = enabled;

  localStorage.setItem(SAFE_MODE_STORAGE_KEY, JSON.stringify(currentSettings));
  return currentSettings;
}

/**
 * Load saved safety settings or initialize with defaults
 */
function loadSafetySettings() {
  try {
    const savedSettings = localStorage.getItem(SAFE_MODE_STORAGE_KEY);

    if (savedSettings) {
      return JSON.parse(savedSettings);
    }
  } catch (error) {
    console.error('Error loading safety settings:', error);
  }

  // Return default settings if none found or error
  return {
    enabled: true,  // Safe mode on by default
    thresholds: DEFAULT_SAFETY_THRESHOLDS,
    notifications: true,
    blockRisky: true,
    advancedProtection: false,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Check for critical security updates
 */
function checkSecurityUpdates() {
  // In a real app, this would call an API to check for security advisories
  console.log('Checking for security updates...');
}

/**
 * Evaluate investment risk level
 * @param {Object} investment - Investment details
 * @param {number} walletBalance - User's wallet balance
 * @param {Object} settings - Optional safety settings
 * @returns {Object} Risk assessment
 */
export function evaluateInvestmentRisk(investment, walletBalance, settings) {
  const safetySettings = settings || getSafetySettings();
  const thresholds = safetySettings.thresholds.investment;

  // Calculate investment as percentage of wallet
  const investmentPercentage = (investment.amount / walletBalance) * 100;

  // Calculate additional risk factors
  const additionalRiskScore = calculateAdditionalRiskFactors(investment);

  // Determine risk level
  let riskLevel;
  if (investmentPercentage <= thresholds.lowRisk) {
    riskLevel = 'low';
  } else if (investmentPercentage <= thresholds.mediumRisk) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'high';
  }

  // Modify based on additional risk factors
  if (additionalRiskScore >= 70 && riskLevel === 'low') {
    riskLevel = 'medium';
  } else if (additionalRiskScore >= 90) {
    riskLevel = 'high';
  }

  return {
    riskLevel,
    riskScore: Math.min(100, Math.round(investmentPercentage + additionalRiskScore * 0.5)),
    percentOfWallet: investmentPercentage.toFixed(1),
    additionalRiskScore,
    warnings: generateWarnings(investment, investmentPercentage, additionalRiskScore),
    requiresConfirmation: riskLevel !== 'low' && safetySettings.thresholds.transaction.requireConfirmation,
    warningDelay: riskLevel === 'high' ? safetySettings.thresholds.transaction.warningDelay : 0
  };
}

/**
 * Calculate additional risk factors for an investment
 */
function calculateAdditionalRiskFactors(investment) {
  let riskScore = 0;

  // New content with no proven record
  if (investment.content?.views < 100) {
    riskScore += 20;
  }

  // Unknown creator
  if (!investment.content?.creatorVerified) {
    riskScore += 25;
  }

  // Suspicious promises in title or description
  if (investment.content?.title?.toLowerCase().includes('guaranteed') ||
    investment.content?.description?.toLowerCase().includes('guaranteed')) {
    riskScore += 30;
  }

  // Unrealistic ROI claims
  if (investment.expectedROI && investment.expectedROI > 50) {
    riskScore += 30;
  }

  // Short investment lock period
  if (investment.lockPeriod < 7) {
    riskScore += 10;
  }

  return Math.min(100, riskScore);
}

/**
 * Generate warnings based on risk factors
 */
function generateWarnings(investment, percentageOfWallet, riskScore) {
  const warnings = [];

  if (percentageOfWallet > 20) {
    warnings.push('This investment represents a significant portion of your wallet balance.');
  }

  if (investment.content?.views < 100) {
    warnings.push('This content has low viewership and may be higher risk.');
  }

  if (!investment.content?.creatorVerified) {
    warnings.push('This creator is not verified on the platform.');
  }

  if (investment.expectedROI && investment.expectedROI > 50) {
    warnings.push('The projected returns appear unrealistically high.');
  }

  return warnings;
}

/**
 * Evaluate content safety
 * @param {Object} content - Content metadata
 * @returns {Object} Safety assessment
 */
export function evaluateContentSafety(content) {
  // In a real implementation, this would use content analysis APIs
  // and community safety reports

  let safetyScore = 85; // Default reasonably safe
  let warningFlags = [];
  let safeForBeginner = true;

  // K80 protocol is safer by default
  if (content.protocol === 'k80') {
    safetyScore += 10;
  }

  // Check for verified creator
  if (!content.creatorVerified) {
    safetyScore -= 15;
    warningFlags.push('unverified_creator');
    safeForBeginner = false;
  }

  // Check content age
  if (content.publishedDate) {
    const contentAge = Date.now() - new Date(content.publishedDate).getTime();
    const daysOld = contentAge / (1000 * 60 * 60 * 24);

    if (daysOld < 2) {
      safetyScore -= 10;
      warningFlags.push('very_new_content');
    }
  }

  // Check engagement metrics
  if (content.views && content.views < 50) {
    safetyScore -= 5;
    warningFlags.push('low_engagement');
  }

  // Title/description red flag detection (simulated)
  const redFlagTerms = ['guaranteed', 'risk-free', '100%', 'get rich', 'quick money'];

  for (const term of redFlagTerms) {
    if (content.title?.toLowerCase().includes(term) || content.description?.toLowerCase().includes(term)) {
      safetyScore -= 20;
      warningFlags.push('suspicious_claims');
      safeForBeginner = false;
      break;
    }
  }

  // Ensure score is within bounds
  safetyScore = Math.min(100, Math.max(0, safetyScore));

  // Generate safety tier
  let safetyTier;
  if (safetyScore >= 85) {
    safetyTier = 'safe';
  } else if (safetyScore >= 70) {
    safetyTier = 'moderate';
  } else {
    safetyTier = 'caution';
    safeForBeginner = false;
  }

  return {
    score: safetyScore,
    tier: safetyTier,
    safeForBeginner,
    warningFlags,
    verified: safetyScore >= 80 && !warningFlags.includes('unverified_creator')
  };
}

/**
 * Analyze transaction for safety
 * @param {Object} transaction - Transaction details
 * @returns {Object} Safety assessment and recommendations
 */
export function analyzeSafetyForTransaction(transaction) {
  const safetySettings = getSafetySettings();

  // Skip detailed analysis if safe mode is disabled
  if (!safetySettings.enabled) {
    return {
      safe: true,
      requireConfirmation: false
    };
  }

  // Analyze transaction details - in a real app this would be much more comprehensive
  const isHighValue = transaction.amount > 0.5; // ETH
  const isUnknownRecipient = !transaction.recipientKnown;
  const hasUnusualActivity = false; // Would check for suspicious patterns

  const requiresExtraConfirmation =
    isHighValue || isUnknownRecipient || hasUnusualActivity;

  const recommendations = [];

  if (isHighValue) {
    recommendations.push('Consider splitting this into smaller transactions');
  }

  if (isUnknownRecipient) {
    recommendations.push('Verify the recipient address carefully before proceeding');
  }

  if (safetySettings.thresholds.transaction.simulateFirst) {
    recommendations.push('Simulate this transaction before sending');
  }

  return {
    safe: !hasUnusualActivity,
    requireConfirmation: requiresExtraConfirmation,
    recommendations,
    requiresDelay: isHighValue && safetySettings.thresholds.transaction.warningDelay > 0,
    delayTimeMs: safetySettings.thresholds.transaction.warningDelay
  };
}

/**
 * Generate overall security report for user
 * @param {Object} userData - User wallet and activity data
 * @returns {Object} Security assessment and recommendations
 */
export function generateSecurityReport(userData) {
  // This would be more comprehensive in a real implementation

  const securityScore = calculateSecurityScore(userData);
  const vulnerabilities = identifyVulnerabilities(userData);
  const recommendations = generateSecurityRecommendations(vulnerabilities);

  return {
    securityScore,
    vulnerabilities,
    recommendations,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Calculate security score based on user practices
 */
function calculateSecurityScore(userData) {
  let score = 70; // Start with a neutral score

  // Has enabled 2FA
  if (userData.has2FA) {
    score += 15;
  } else {
    score -= 15;
  }

  // Uses hardware wallet
  if (userData.walletType === 'hardware') {
    score += 15;
  }

  // Has recovery phrase stored securely
  if (userData.recoveryPhraseVerified) {
    score += 10;
  } else {
    score -= 10;
  }

  // Uses safe mode
  if (getSafetySettings().enabled) {
    score += 5;
  }

  // Recent suspicious activity 
  if (userData.recentSuspiciousActivity) {
    score -= 20;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Identify security vulnerabilities in user's setup
 */
function identifyVulnerabilities(userData) {
  const vulnerabilities = [];

  if (!userData.has2FA) {
    vulnerabilities.push({
      id: 'missing_2fa',
      severity: 'high',
      title: 'Two-factor authentication not enabled',
      description: 'Enable 2FA to add an extra layer of security to your account.'
    });
  }

  if (userData.walletType !== 'hardware') {
    vulnerabilities.push({
      id: 'software_wallet',
      severity: 'medium',
      title: 'Using software wallet',
      description: 'Consider using a hardware wallet for improved security.'
    });
  }

  if (!userData.recoveryPhraseVerified) {
    vulnerabilities.push({
      id: 'recovery_phrase',
      severity: 'high',
      title: 'Recovery phrase not verified',
      description: 'Verify that your recovery phrase is stored securely offline.'
    });
  }

  if (userData.recentSuspiciousActivity) {
    vulnerabilities.push({
      id: 'suspicious_activity',
      severity: 'high',
      title: 'Recent suspicious activity detected',
      description: 'Review recent activity and secure your account immediately.'
    });
  }

  if (userData.investmentRiskLevel === 'high') {
    vulnerabilities.push({
      id: 'high_risk_investments',
      severity: 'medium',
      title: 'High-risk investment profile',
      description: 'Consider diversifying your investments to reduce risk.'
    });
  }

  return vulnerabilities;
}

/**
 * Generate security recommendations based on identified vulnerabilities
 */
function generateSecurityRecommendations(vulnerabilities) {
  const recommendations = [];

  // Map vulnerabilities to specific recommendations
  for (const vulnerability of vulnerabilities) {
    switch (vulnerability.id) {
      case 'missing_2fa':
        recommendations.push({
          id: 'enable_2fa',
          title: 'Enable two-factor authentication',
          priority: 'high',
          actionable: true,
          actionLink: '/profile/security/2fa'
        });
        break;
      case 'software_wallet':
        recommendations.push({
          id: 'get_hardware_wallet',
          title: 'Upgrade to a hardware wallet',
          priority: 'medium',
          actionable: true,
          actionLink: '/learn/hardware-wallets'
        });
        break;
      case 'recovery_phrase':
        recommendations.push({
          id: 'verify_recovery',
          title: 'Verify your recovery phrase',
          priority: 'high',
          actionable: true,
          actionLink: '/profile/security/recovery'
        });
        break;
      case 'suspicious_activity':
        recommendations.push({
          id: 'secure_account',
          title: 'Secure your account',
          priority: 'urgent',
          actionable: true,
          actionLink: '/profile/security/lockdown'
        });
        break;
      case 'high_risk_investments':
        recommendations.push({
          id: 'diversify',
          title: 'Diversify your investments',
          priority: 'medium',
          actionable: true,
          actionLink: '/learn/investment-strategies'
        });
        break;
    }
  }

  // Add general recommendations
  recommendations.push({
    id: 'regular_security_check',
    title: 'Perform regular security checks',
    priority: 'low',
    actionable: false
  });

  return recommendations;
}
