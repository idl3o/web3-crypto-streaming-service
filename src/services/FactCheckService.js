/**
 * Fact Check Service for Web3 Crypto Streaming Platform
 * 
 * Provides verification of factual claims, content accuracy analysis,
 * and integration with factual authorities for Web3 and crypto content.
 */

// Cache for verified facts to reduce repeat verification requests
const VERIFIED_FACTS_CACHE = new Map();

// Likelihood classifications
export const LIKELIHOOD_LEVELS = {
  CONFIRMED: 'confirmed',
  LIKELY: 'likely',
  UNVERIFIED: 'unverified',
  DISPUTED: 'disputed',
  FALSE: 'false'
};

// Fact categories
export const FACT_CATEGORIES = {
  TECHNICAL: 'technical',
  MARKET: 'market',
  REGULATORY: 'regulatory',
  SECURITY: 'security',
  HISTORICAL: 'historical'
};

// Authority levels for fact sources
export const AUTHORITY_LEVELS = {
  PRIMARY_SOURCE: 'primary_source',
  OFFICIAL: 'official',
  EXPERT: 'expert',
  CONSENSUS: 'consensus',
  REPORTED: 'reported'
};

/**
 * Analyze content for factual claims
 * @param {Object} content - Content to analyze
 * @returns {Array} Extracted claims with preliminary verification
 */
export async function extractFactualClaims(content) {
  if (!content || (!content.description && !content.transcript)) {
    return [];
  }

  // In a production system, this would use NLP to extract claims
  // For now, we'll use a rule-based approach with key phrases

  const text = (content.transcript || content.description || '').toLowerCase();
  const claims = [];

  // Extract potential claims using pattern recognition
  const claimPatterns = [
    { regex: /(\w+) is (the first|the largest|the most secure)/gi, category: FACT_CATEGORIES.MARKET },
    { regex: /(ethereum|bitcoin|solana|blockchain|nft) (will|is expected to) (reach|hit|achieve) ([0-9.]+)/gi, category: FACT_CATEGORIES.MARKET },
    { regex: /(zero-knowledge proofs|zk-rollups|layer 2|consensus mechanism) (works by|enables|provides)/gi, category: FACT_CATEGORIES.TECHNICAL },
    { regex: /(sec|regulation|government|law) (approved|banned|regulated)/gi, category: FACT_CATEGORIES.REGULATORY },
    { regex: /(hack|exploit|vulnerability) (resulted in|caused|led to)/gi, category: FACT_CATEGORIES.SECURITY },
    { regex: /(in|on|during) ([0-9]{4}), (ethereum|bitcoin|blockchain) (was launched|reached|achieved)/gi, category: FACT_CATEGORIES.HISTORICAL }
  ];

  for (const pattern of claimPatterns) {
    const matches = [...text.matchAll(pattern.regex)];

    for (const match of matches) {
      const claimText = match[0];
      const key = claimText.toLowerCase().trim();

      // Check if we already have this claim cached
      const cachedVerification = VERIFIED_FACTS_CACHE.get(key);

      if (cachedVerification) {
        claims.push({
          ...cachedVerification,
          text: claimText
        });
      } else {
        // Add a new unverified claim for later verification
        claims.push({
          id: `claim-${Date.now()}-${claims.length}`,
          text: claimText,
          category: pattern.category,
          likelihood: LIKELIHOOD_LEVELS.UNVERIFIED,
          needsVerification: true,
          extractedEntities: extractEntitiesFromClaim(claimText)
        });
      }
    }
  }

  // For claims that need verification, process them
  const unverifiedClaims = claims.filter(claim => claim.needsVerification);
  if (unverifiedClaims.length > 0) {
    await batchVerifyClaims(unverifiedClaims);

    // Update the claims array with the verified results
    for (let i = 0; i < claims.length; i++) {
      if (claims[i].needsVerification) {
        const verifiedClaim = unverifiedClaims.find(vc => vc.id === claims[i].id);
        if (verifiedClaim) {
          claims[i] = { ...verifiedClaim, needsVerification: false };

          // Cache this verification for future use
          VERIFIED_FACTS_CACHE.set(claims[i].text.toLowerCase().trim(), {
            id: claims[i].id,
            category: claims[i].category,
            likelihood: claims[i].likelihood,
            verificationSources: claims[i].verificationSources,
            verificationDate: claims[i].verificationDate
          });
        }
      }
    }
  }

  return claims;
}

/**
 * Extract relevant entities from claim text for verification
 * @param {string} claimText - The text of the claim
 * @returns {Object} Extracted entities
 */
function extractEntitiesFromClaim(claimText) {
  // This would use NER (Named Entity Recognition) in production
  // For now, using simple pattern matching
  const entities = {
    cryptocurrencies: [],
    technologies: [],
    organizations: [],
    metrics: [],
    dates: []
  };

  // Extract cryptocurrencies
  const cryptoRegex = /(bitcoin|ethereum|solana|cardano|polkadot|ripple|xrp|dogecoin|bnb|avalanche|polygon|litecoin)/gi;
  const cryptoMatches = claimText.match(cryptoRegex) || [];
  entities.cryptocurrencies = [...new Set(cryptoMatches.map(m => m.toLowerCase()))];

  // Extract blockchain technologies
  const techRegex = /(blockchain|nft|defi|dao|smart contracts?|layer 2|rollups|zero-knowledge|web3|token|staking|consensus|pow|pos|mining)/gi;
  const techMatches = claimText.match(techRegex) || [];
  entities.technologies = [...new Set(techMatches.map(m => m.toLowerCase()))];

  // Extract organizations
  const orgRegex = /(sec|ethereum foundation|bitcoin core|binance|coinbase|ftx|opensea|metamask|consensys|chainlink|uniswap|aave)/gi;
  const orgMatches = claimText.match(orgRegex) || [];
  entities.organizations = [...new Set(orgMatches.map(m => m.toLowerCase()))];

  // Extract numeric metrics
  const metricRegex = /(\$[0-9,.]+|[0-9,.]+%|[0-9,.]+\s*(btc|eth|sol|usd|dollars))/gi;
  const metricMatches = claimText.match(metricRegex) || [];
  entities.metrics = metricMatches;

  // Extract dates and years
  const dateRegex = /(\b(19|20)\d{2}\b|january|february|march|april|may|june|july|august|september|october|november|december)/gi;
  const dateMatches = claimText.match(dateRegex) || [];
  entities.dates = dateMatches;

  return entities;
}

/**
 * Batch verify a group of claims
 * @param {Array} claims - Claims to verify
 */
async function batchVerifyClaims(claims) {
  // In production, this would call a verification API or database
  // For now, simulate a verification process with realistic results

  for (let claim of claims) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));

    // Determine likelihood based on claim content and entities
    const verificationResult = simulateFactCheck(claim);

    Object.assign(claim, verificationResult);
  }
}

/**
 * Simulate fact checking for a claim
 * @param {Object} claim - Claim to verify
 * @returns {Object} Verification result
 */
function simulateFactCheck(claim) {
  const text = claim.text.toLowerCase();
  const entities = claim.extractedEntities;

  // Default result
  const result = {
    likelihood: LIKELIHOOD_LEVELS.UNVERIFIED,
    verificationSources: [],
    verificationDate: new Date().toISOString()
  };

  // Technical claims verification
  if (claim.category === FACT_CATEGORIES.TECHNICAL) {
    // Example: Verify blockchain technology claims
    if (text.includes('zero-knowledge') || text.includes('zk-rollups')) {
      if (text.includes('privacy') || text.includes('scalability')) {
        result.likelihood = LIKELIHOOD_LEVELS.CONFIRMED;
        result.verificationSources = [
          { name: 'Ethereum Foundation', url: 'https://ethereum.org/en/developers/docs/scaling/zk-rollups/', authorityLevel: AUTHORITY_LEVELS.OFFICIAL },
          { name: 'ZK Research Collective', url: 'https://zkreseach.org', authorityLevel: AUTHORITY_LEVELS.EXPERT }
        ];
      }
    }

    if (text.includes('consensus mechanism')) {
      result.likelihood = LIKELIHOOD_LEVELS.LIKELY;
      result.verificationSources = [
        { name: 'Blockchain Technical Documentation', url: 'https://docs.web3.org/consensus', authorityLevel: AUTHORITY_LEVELS.OFFICIAL }
      ];
    }
  }

  // Market claims verification
  else if (claim.category === FACT_CATEGORIES.MARKET) {
    // Check for specific price claims or market size claims
    if (entities.metrics.length > 0) {
      // If it's a future prediction
      if (text.includes('will') || text.includes('expected')) {
        result.likelihood = LIKELIHOOD_LEVELS.UNVERIFIED;
        result.verificationSources = [
          { name: 'Market Analysis Disclaimer', description: 'Future market predictions cannot be factually verified', authorityLevel: AUTHORITY_LEVELS.CONSENSUS }
        ];
      }
      // If it's a claim about current market status
      else if (text.includes('is the largest') || text.includes('has the most')) {
        // Check for common correct market facts
        if (text.includes('bitcoin') && text.includes('largest')) {
          result.likelihood = LIKELIHOOD_LEVELS.CONFIRMED;
          result.verificationSources = [
            { name: 'CoinMarketCap', url: 'https://coinmarketcap.com', authorityLevel: AUTHORITY_LEVELS.CONSENSUS },
            { name: 'Market Analysis Reports', description: 'Multiple independent market analyses confirm this claim', authorityLevel: AUTHORITY_LEVELS.EXPERT }
          ];
        } else {
          result.likelihood = LIKELIHOOD_LEVELS.DISPUTED;
        }
      }
    }
  }

  // Regulatory claims verification
  else if (claim.category === FACT_CATEGORIES.REGULATORY) {
    // Claims about regulation
    if (entities.organizations.includes('sec')) {
      if (text.includes('banned') || text.includes('approved')) {
        // Need to be specific about which asset/technology
        if (entities.cryptocurrencies.length > 0 || entities.technologies.length > 0) {
          if (text.includes('approved') && text.includes('bitcoin etf')) {
            if (text.includes('spot')) {
              result.likelihood = LIKELIHOOD_LEVELS.DISPUTED;
              result.verificationSources = [
                { name: 'SEC Website', url: 'https://www.sec.gov/news', authorityLevel: AUTHORITY_LEVELS.PRIMARY_SOURCE },
                { name: 'Regulatory Analysis', description: 'Recent spot Bitcoin ETF approvals are still pending final decisions', authorityLevel: AUTHORITY_LEVELS.EXPERT }
              ];
            } else {
              result.likelihood = LIKELIHOOD_LEVELS.CONFIRMED;
              result.verificationSources = [
                { name: 'SEC Press Release', url: 'https://www.sec.gov/news/press-release/2021-25', authorityLevel: AUTHORITY_LEVELS.PRIMARY_SOURCE }
              ];
            }
          }
        }
      }
    }
  }

  // Security claims verification
  else if (claim.category === FACT_CATEGORIES.SECURITY) {
    // Claims about hacks and exploits
    if (text.includes('hack') || text.includes('exploit') || text.includes('vulnerability')) {
      // Look for mentions of specific protocols or amounts
      if (entities.cryptocurrencies.length > 0 || entities.organizations.length > 0) {
        result.likelihood = LIKELIHOOD_LEVELS.LIKELY;
        result.verificationSources = [
          { name: 'Blockchain Security Reports', description: 'Security incident documentation available on request', authorityLevel: AUTHORITY_LEVELS.EXPERT }
        ];

        // For known major hacks
        if ((text.includes('wormhole') && text.includes('320 million')) ||
          (text.includes('ronin') && text.includes('600 million'))) {
          result.likelihood = LIKELIHOOD_LEVELS.CONFIRMED;
          result.verificationSources = [
            { name: 'Official Security Advisory', url: 'https://www.blockchain-security-advisories.org', authorityLevel: AUTHORITY_LEVELS.PRIMARY_SOURCE },
            { name: 'On-chain Transaction Evidence', description: 'Blockchain forensics confirm the incident', authorityLevel: AUTHORITY_LEVELS.PRIMARY_SOURCE }
          ];
        }
      }
    }
  }

  // Historical claims verification
  else if (claim.category === FACT_CATEGORIES.HISTORICAL) {
    // Claims about significant dates in crypto history
    if (entities.dates.length > 0 &&
      (entities.cryptocurrencies.length > 0 || entities.technologies.length > 0)) {

      // Bitcoin-related historical facts
      if (text.includes('bitcoin') && text.includes('2009') &&
        (text.includes('launched') || text.includes('created'))) {
        result.likelihood = LIKELIHOOD_LEVELS.CONFIRMED;
        result.verificationSources = [
          { name: 'Bitcoin Whitepaper', url: 'https://bitcoin.org/bitcoin.pdf', authorityLevel: AUTHORITY_LEVELS.PRIMARY_SOURCE },
          { name: 'Genesis Block', description: 'Timestamp on the first Bitcoin block', authorityLevel: AUTHORITY_LEVELS.PRIMARY_SOURCE }
        ];
      }

      // Ethereum-related historical facts
      else if (text.includes('ethereum') && text.includes('2015') &&
        (text.includes('launched') || text.includes('created'))) {
        result.likelihood = LIKELIHOOD_LEVELS.CONFIRMED;
        result.verificationSources = [
          { name: 'Ethereum History', url: 'https://ethereum.org/en/history/', authorityLevel: AUTHORITY_LEVELS.OFFICIAL }
        ];
      }

      // Other historical claims get a more generic response
      else {
        result.likelihood = LIKELIHOOD_LEVELS.LIKELY;
        result.verificationSources = [
          { name: 'Crypto Historical Timeline', description: 'Verified from multiple sources', authorityLevel: AUTHORITY_LEVELS.EXPERT }
        ];
      }
    }
  }

  return result;
}

/**
 * Verify content against a reliable source
 * @param {Object} content - Content to verify
 * @param {String} sourceUrl - URL of the verification source
 * @returns {Object} Verification result
 */
export async function verifyAgainstSource(content, sourceUrl) {
  // In production, this would fetch the source content and compare
  // For now, we'll simulate the process

  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simple verification result
    return {
      verified: Math.random() > 0.3, // 70% chance of verification
      confidenceScore: Math.random() * 0.5 + 0.5, // Random score between 0.5-1.0
      matchedClaims: Math.floor(Math.random() * 5) + 1, // 1-5 matched claims
      sourceName: new URL(sourceUrl).hostname.replace('www.', ''),
      verificationDate: new Date().toISOString()
    };
  } catch (error) {
    console.error('Source verification error:', error);
    return {
      verified: false,
      error: 'Could not verify against provided source',
      verificationDate: new Date().toISOString()
    };
  }
}

/**
 * Get the overall factual score for content
 * @param {Array} claims - Verified claims from the content
 * @returns {Object} Overall factual assessment
 */
export function getFactualScore(claims) {
  if (!claims || claims.length === 0) {
    return {
      score: null,
      confidence: 0,
      claimCount: 0,
      verifiedCount: 0,
      assessment: 'No factual claims detected'
    };
  }

  // Count claims by likelihood
  const likelihoods = {
    [LIKELIHOOD_LEVELS.CONFIRMED]: 0,
    [LIKELIHOOD_LEVELS.LIKELY]: 0,
    [LIKELIHOOD_LEVELS.UNVERIFIED]: 0,
    [LIKELIHOOD_LEVELS.DISPUTED]: 0,
    [LIKELIHOOD_LEVELS.FALSE]: 0
  };

  claims.forEach(claim => {
    likelihoods[claim.likelihood] = (likelihoods[claim.likelihood] || 0) + 1;
  });

  // Calculate verification percentage
  const verifiedCount = likelihoods[LIKELIHOOD_LEVELS.CONFIRMED] + likelihoods[LIKELIHOOD_LEVELS.LIKELY];
  const unverifiedCount = likelihoods[LIKELIHOOD_LEVELS.UNVERIFIED];
  const problematicCount = likelihoods[LIKELIHOOD_LEVELS.DISPUTED] + likelihoods[LIKELIHOOD_LEVELS.FALSE];

  // Calculate a factual score
  let score = null;
  if (claims.length > 0) {
    score = Math.round(
      ((likelihoods[LIKELIHOOD_LEVELS.CONFIRMED] * 1.0) +
        (likelihoods[LIKELIHOOD_LEVELS.LIKELY] * 0.7) +
        (likelihoods[LIKELIHOOD_LEVELS.UNVERIFIED] * 0.5) +
        (likelihoods[LIKELIHOOD_LEVELS.DISPUTED] * 0.2)) /
      claims.length * 100
    );
  }

  // Calculate confidence in the score
  const confidence = unverifiedCount > claims.length * 0.5 ? 'low' :
    unverifiedCount > claims.length * 0.25 ? 'medium' : 'high';

  // Generate an overall assessment
  let assessment;
  if (problematicCount > claims.length * 0.3) {
    assessment = 'Contains multiple disputed or false claims';
  } else if (problematicCount > 0) {
    assessment = 'Generally factual with some disputed claims';
  } else if (verifiedCount > claims.length * 0.7) {
    assessment = 'Highly factual content';
  } else if (verifiedCount > claims.length * 0.3) {
    assessment = 'Mostly factual content';
  } else {
    assessment = 'Contains many unverified claims';
  }

  return {
    score,
    confidence,
    claimCount: claims.length,
    verifiedCount,
    problematicCount,
    assessment,
    claimsByLikelihood: likelihoods
  };
}
