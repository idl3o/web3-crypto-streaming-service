/**
 * Press Release Service
 * 
 * Handles creation, distribution, and management of platform press releases 
 * and news announcements.
 */

import { optimizeComputation } from './OptimizationService';
import { EXECUTION_STRATEGIES, PRIORITY_LEVELS } from './ExecutionEngine';

// Cache for efficient data retrieval
const pressReleaseCache = {
  byId: new Map(),
  allReleases: null,
  featuredReleases: null,
  categoryIndex: new Map(),
  lastFetch: {
    allReleases: 0,
    featuredReleases: 0
  }
};

// Cache TTL in milliseconds
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * Press release categories
 */
export const PRESS_CATEGORIES = {
  PRODUCT_UPDATE: 'product_update',
  PARTNERSHIP: 'partnership',
  MILESTONE: 'milestone',
  COMMUNITY: 'community',
  INVESTOR_NEWS: 'investor_news',
  REGULATORY: 'regulatory',
  EVENT: 'event',
  RESEARCH: 'research'
};

/**
 * Get all press releases with optional filtering
 * 
 * @param {Object} options - Filter and pagination options
 * @returns {Promise<Array>} Array of press releases
 */
export async function getPressReleases(options = {}) {
  // Use cache if available and not expired
  if (pressReleaseCache.allReleases &&
    (Date.now() - pressReleaseCache.lastFetch.allReleases) < CACHE_TTL &&
    !options.bypassCache) {
    return filterAndPaginatePressReleases(pressReleaseCache.allReleases, options);
  }

  try {
    // Fetch press releases with optimized execution
    const releases = await optimizeComputation(
      fetchPressReleases,
      {
        params: { options },
        strategy: EXECUTION_STRATEGIES.WORKER,
        priority: PRIORITY_LEVELS.LOW
      }
    );

    // Cache results
    pressReleaseCache.allReleases = releases;
    pressReleaseCache.lastFetch.allReleases = Date.now();

    // Also cache individual releases and update category index
    releases.forEach(release => {
      pressReleaseCache.byId.set(release.id, release);

      // Update category index
      if (release.category) {
        if (!pressReleaseCache.categoryIndex.has(release.category)) {
          pressReleaseCache.categoryIndex.set(release.category, []);
        }
        pressReleaseCache.categoryIndex.get(release.category).push(release.id);
      }
    });

    return filterAndPaginatePressReleases(releases, options);
  } catch (error) {
    console.error('Error fetching press releases:', error);
    return [];
  }
}

/**
 * Get featured press releases
 * 
 * @param {Object} options - Options including limit
 * @returns {Promise<Array>} Array of featured press releases
 */
export async function getFeaturedPressReleases(options = {}) {
  // Use cache if available and not expired
  if (pressReleaseCache.featuredReleases &&
    (Date.now() - pressReleaseCache.lastFetch.featuredReleases) < CACHE_TTL) {
    if (options.limit && options.limit < pressReleaseCache.featuredReleases.length) {
      return pressReleaseCache.featuredReleases.slice(0, options.limit);
    }
    return pressReleaseCache.featuredReleases;
  }

  try {
    // Fetch featured press releases with optimized execution
    const featuredReleases = await optimizeComputation(
      fetchFeaturedPressReleases,
      {
        params: { options },
        strategy: EXECUTION_STRATEGIES.IMMEDIATE,
        priority: PRIORITY_LEVELS.MEDIUM
      }
    );

    // Cache results
    pressReleaseCache.featuredReleases = featuredReleases;
    pressReleaseCache.lastFetch.featuredReleases = Date.now();

    // Also cache individual releases
    featuredReleases.forEach(release => {
      pressReleaseCache.byId.set(release.id, release);
    });

    if (options.limit && options.limit < featuredReleases.length) {
      return featuredReleases.slice(0, options.limit);
    }
    return featuredReleases;
  } catch (error) {
    console.error('Error fetching featured press releases:', error);
    return [];
  }
}

/**
 * Get a press release by its ID
 * 
 * @param {string} releaseId - ID of the press release to retrieve
 * @param {boolean} fullContent - Whether to fetch the full content
 * @returns {Promise<Object>} Press release object
 */
export async function getPressReleaseById(releaseId, fullContent = true) {
  // Check cache first
  if (pressReleaseCache.byId.has(releaseId)) {
    const cachedRelease = pressReleaseCache.byId.get(releaseId);

    // If we need full content and don't have it yet, fetch it
    if (fullContent && !cachedRelease.fullContent) {
      return fetchFullPressRelease(releaseId);
    }

    return cachedRelease;
  }

  // Not in cache, fetch from API
  try {
    const release = await optimizeComputation(
      fetchFullPressRelease,
      {
        params: { releaseId },
        strategy: EXECUTION_STRATEGIES.IMMEDIATE,
        priority: PRIORITY_LEVELS.MEDIUM
      }
    );

    // Cache the result
    pressReleaseCache.byId.set(releaseId, release);

    return release;
  } catch (error) {
    console.error(`Error fetching press release ${releaseId}:`, error);
    throw error;
  }
}

/**
 * Get press releases by category
 * 
 * @param {string} category - Category to filter by
 * @param {Object} options - Filter and pagination options
 * @returns {Promise<Array>} Category-filtered press releases
 */
export async function getPressReleasesByCategory(category, options = {}) {
  // Make sure we have the full list of press releases
  await getPressReleases({ bypassCache: false });

  // Check if we have this category indexed
  if (pressReleaseCache.categoryIndex.has(category)) {
    const releaseIds = pressReleaseCache.categoryIndex.get(category);
    const releases = releaseIds.map(id => pressReleaseCache.byId.get(id)).filter(Boolean);

    return filterAndPaginatePressReleases(releases, options);
  }

  // If not indexed or no releases in cache, fetch directly
  try {
    const releases = await optimizeComputation(
      fetchPressReleasesByCategory,
      {
        params: { category, options },
        strategy: EXECUTION_STRATEGIES.WORKER,
        priority: PRIORITY_LEVELS.LOW
      }
    );

    return releases;
  } catch (error) {
    console.error(`Error fetching press releases for category ${category}:`, error);
    return [];
  }
}

/**
 * Create a new press release
 * 
 * @param {Object} pressReleaseData - Data for the new press release
 * @returns {Promise<Object>} Created press release
 */
export async function createPressRelease(pressReleaseData) {
  // Validate press release data
  const validationResult = validatePressReleaseData(pressReleaseData);
  if (!validationResult.valid) {
    throw new Error(`Invalid press release data: ${validationResult.errors.join(', ')}`);
  }

  try {
    // Create the press release with optimized execution
    const newRelease = await optimizeComputation(
      submitPressRelease,
      {
        params: { pressReleaseData },
        strategy: EXECUTION_STRATEGIES.IMMEDIATE,
        priority: PRIORITY_LEVELS.HIGH
      }
    );

    // Update cache
    pressReleaseCache.byId.set(newRelease.id, newRelease);
    pressReleaseCache.allReleases = null; // Invalidate list cache
    pressReleaseCache.featuredReleases = null; // Invalidate featured cache

    // Update category index
    if (newRelease.category) {
      if (!pressReleaseCache.categoryIndex.has(newRelease.category)) {
        pressReleaseCache.categoryIndex.set(newRelease.category, []);
      }
      pressReleaseCache.categoryIndex.get(newRelease.category).push(newRelease.id);
    }

    return newRelease;
  } catch (error) {
    console.error('Error creating press release:', error);
    throw error;
  }
}

/**
 * Update an existing press release
 * 
 * @param {string} releaseId - ID of the press release to update
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated press release
 */
export async function updatePressRelease(releaseId, updateData) {
  try {
    // Update the press release with optimized execution
    const updatedRelease = await optimizeComputation(
      submitPressReleaseUpdate,
      {
        params: { releaseId, updateData },
        strategy: EXECUTION_STRATEGIES.IMMEDIATE,
        priority: PRIORITY_LEVELS.HIGH
      }
    );

    // Update cache
    pressReleaseCache.byId.set(releaseId, updatedRelease);

    // If category changed, update category index
    if (updateData.category) {
      // Remove from old category indices
      for (const [category, ids] of pressReleaseCache.categoryIndex.entries()) {
        const index = ids.indexOf(releaseId);
        if (index !== -1) {
          ids.splice(index, 1);
        }
      }

      // Add to new category index
      if (!pressReleaseCache.categoryIndex.has(updateData.category)) {
        pressReleaseCache.categoryIndex.set(updateData.category, []);
      }
      pressReleaseCache.categoryIndex.get(updateData.category).push(releaseId);
    }

    // Invalidate list caches if needed
    if (pressReleaseCache.allReleases) {
      const index = pressReleaseCache.allReleases.findIndex(r => r.id === releaseId);
      if (index !== -1) {
        pressReleaseCache.allReleases[index] = updatedRelease;
      }
    }

    if (pressReleaseCache.featuredReleases) {
      const featuredIndex = pressReleaseCache.featuredReleases.findIndex(r => r.id === releaseId);
      if (featuredIndex !== -1) {
        // If featured status changed, might need to remove
        if (updateData.hasOwnProperty('featured') && !updateData.featured) {
          pressReleaseCache.featuredReleases.splice(featuredIndex, 1);
        } else {
          pressReleaseCache.featuredReleases[featuredIndex] = updatedRelease;
        }
      } else if (updateData.featured) {
        // If it's now featured but wasn't before, add it
        pressReleaseCache.featuredReleases.push(updatedRelease);
        // Sort by date
        pressReleaseCache.featuredReleases.sort((a, b) =>
          new Date(b.publishDate) - new Date(a.publishDate)
        );
      }
    }

    return updatedRelease;
  } catch (error) {
    console.error(`Error updating press release ${releaseId}:`, error);
    throw error;
  }
}

/**
 * Delete a press release
 * 
 * @param {string} releaseId - ID of the press release to delete
 * @returns {Promise<Object>} Deletion result
 */
export async function deletePressRelease(releaseId) {
  try {
    // Delete the press release with optimized execution
    const result = await optimizeComputation(
      performPressReleaseDeletion,
      {
        params: { releaseId },
        strategy: EXECUTION_STRATEGIES.IMMEDIATE,
        priority: PRIORITY_LEVELS.HIGH
      }
    );

    // Update cache
    pressReleaseCache.byId.delete(releaseId);

    // Remove from category index
    for (const [category, ids] of pressReleaseCache.categoryIndex.entries()) {
      const index = ids.indexOf(releaseId);
      if (index !== -1) {
        ids.splice(index, 1);
      }
    }

    // Update list caches
    if (pressReleaseCache.allReleases) {
      pressReleaseCache.allReleases = pressReleaseCache.allReleases.filter(
        r => r.id !== releaseId
      );
    }

    if (pressReleaseCache.featuredReleases) {
      pressReleaseCache.featuredReleases = pressReleaseCache.featuredReleases.filter(
        r => r.id !== releaseId
      );
    }

    return result;
  } catch (error) {
    console.error(`Error deleting press release ${releaseId}:`, error);
    throw error;
  }
}

/**
 * Generate a press release using AI template assistance
 * 
 * @param {Object} pressReleaseData - Base data for generating the press release
 * @param {string} template - Template name to use
 * @returns {Promise<Object>} Generated press release draft
 */
export async function generatePressRelease(pressReleaseData, template = 'standard') {
  try {
    // Generate press release with optimized execution
    return await optimizeComputation(
      generatePressReleaseContent,
      {
        params: { pressReleaseData, template },
        strategy: EXECUTION_STRATEGIES.WORKER, // Use worker for AI generation
        priority: PRIORITY_LEVELS.MEDIUM
      }
    );
  } catch (error) {
    console.error('Error generating press release:', error);
    throw error;
  }
}

// Helper functions

/**
 * Filter and paginate press releases
 * 
 * @param {Array} releases - Press releases to filter
 * @param {Object} options - Filtering options
 * @returns {Array} Filtered and paginated releases
 */
function filterAndPaginatePressReleases(releases, options = {}) {
  if (!releases || !Array.isArray(releases)) return [];

  let filtered = [...releases];

  // Apply category filter
  if (options.category) {
    filtered = filtered.filter(release => release.category === options.category);
  }

  // Apply date range filter
  if (options.startDate) {
    const startDate = new Date(options.startDate).getTime();
    filtered = filtered.filter(release => {
      const releaseDate = new Date(release.publishDate).getTime();
      return releaseDate >= startDate;
    });
  }

  if (options.endDate) {
    const endDate = new Date(options.endDate).getTime();
    filtered = filtered.filter(release => {
      const releaseDate = new Date(release.publishDate).getTime();
      return releaseDate <= endDate;
    });
  }

  // Apply search filter
  if (options.search) {
    const searchLower = options.search.toLowerCase();
    filtered = filtered.filter(release =>
      (release.title && release.title.toLowerCase().includes(searchLower)) ||
      (release.summary && release.summary.toLowerCase().includes(searchLower)) ||
      (release.content && release.content.toLowerCase().includes(searchLower))
    );
  }

  // Apply tag filter
  if (options.tag) {
    filtered = filtered.filter(release =>
      release.tags && release.tags.includes(options.tag)
    );
  }

  // Apply sorting
  // Default sort is by publish date, newest first
  const sortField = options.sortBy || 'publishDate';
  const sortDirection = options.sortDirection === 'asc' ? 1 : -1;

  filtered.sort((a, b) => {
    // Handle date fields
    if (['publishDate', 'createdAt', 'updatedAt'].includes(sortField)) {
      return sortDirection * (new Date(b[sortField]) - new Date(a[sortField]));
    }

    // Handle other fields
    if (a[sortField] < b[sortField]) return -1 * sortDirection;
    if (a[sortField] > b[sortField]) return 1 * sortDirection;
    return 0;
  });

  // Apply pagination
  if (options.limit) {
    const offset = options.offset || 0;
    filtered = filtered.slice(offset, offset + options.limit);
  }

  return filtered;
}

/**
 * Validate press release data
 * 
 * @param {Object} data - Press release data to validate
 * @returns {Object} Validation result with valid flag and any errors
 */
function validatePressReleaseData(data) {
  const errors = [];

  if (!data.title || data.title.trim().length < 5) {
    errors.push('Title is required and must be at least 5 characters long');
  }

  if (!data.content || data.content.trim().length < 50) {
    errors.push('Content is required and must be at least 50 characters long');
  }

  if (!data.summary || data.summary.trim().length < 10) {
    errors.push('Summary is required and must be at least 10 characters long');
  }

  if (!data.category) {
    errors.push('Category is required');
  } else if (!Object.values(PRESS_CATEGORIES).includes(data.category)) {
    errors.push('Invalid category');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// API simulation functions - these would call a real API in production

async function fetchPressReleases({ options }) {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 100));

  // Return mock data
  return [
    {
      id: 'pr-001',
      title: 'Web3 Crypto Streaming Platform Announces Series A Funding',
      summary: 'Platform secures $10M in Series A funding to expand decentralized content streaming capabilities.',
      content: 'Summary only - full content would be fetched separately',
      publishDate: '2023-10-28T09:00:00Z',
      category: PRESS_CATEGORIES.INVESTOR_NEWS,
      featured: true,
      author: 'Communications Team',
      image: 'https://example.com/press/series-a-funding.jpg',
      tags: ['funding', 'investors', 'growth'],
      createdAt: '2023-10-27T14:30:00Z',
      updatedAt: '2023-10-28T08:45:00Z'
    },
    {
      id: 'pr-002',
      title: 'New Creator Tools Released for Content Monetization',
      summary: 'Platform introduces advanced tools allowing creators to better monetize their content through tokenization.',
      content: 'Summary only - full content would be fetched separately',
      publishDate: '2023-10-15T12:00:00Z',
      category: PRESS_CATEGORIES.PRODUCT_UPDATE,
      featured: true,
      author: 'Product Team',
      image: 'https://example.com/press/creator-tools.jpg',
      tags: ['product', 'creators', 'monetization'],
      createdAt: '2023-10-14T16:20:00Z',
      updatedAt: '2023-10-15T11:45:00Z'
    },
    {
      id: 'pr-003',
      title: 'Strategic Partnership with Decentralized Storage Provider',
      summary: 'Platform partners with leading decentralized storage provider to enhance content distribution capabilities.',
      content: 'Summary only - full content would be fetched separately',
      publishDate: '2023-10-07T10:30:00Z',
      category: PRESS_CATEGORIES.PARTNERSHIP,
      featured: false,
      author: 'Partnerships Team',
      image: 'https://example.com/press/storage-partnership.jpg',
      tags: ['partnership', 'infrastructure', 'decentralized'],
      createdAt: '2023-10-06T15:10:00Z',
      updatedAt: '2023-10-07T09:20:00Z'
    },
    {
      id: 'pr-004',
      title: 'Platform Achieves 100,000 Active Users Milestone',
      summary: 'Web3 Crypto Streaming Service celebrates reaching 100,000 active users, marking significant growth.',
      content: 'Summary only - full content would be fetched separately',
      publishDate: '2023-09-22T14:00:00Z',
      category: PRESS_CATEGORIES.MILESTONE,
      featured: true,
      author: 'Marketing Team',
      image: 'https://example.com/press/100k-users.jpg',
      tags: ['milestone', 'users', 'growth'],
      createdAt: '2023-09-21T17:30:00Z',
      updatedAt: '2023-09-22T13:15:00Z'
    },
    {
      id: 'pr-005',
      title: 'Upcoming Community Hackathon Announced',
      summary: 'Platform to host its first community hackathon with prizes for innovative decentralized streaming applications.',
      content: 'Summary only - full content would be fetched separately',
      publishDate: '2023-09-15T11:00:00Z',
      category: PRESS_CATEGORIES.EVENT,
      featured: false,
      author: 'Community Team',
      image: 'https://example.com/press/hackathon.jpg',
      tags: ['event', 'community', 'development'],
      createdAt: '2023-09-14T16:40:00Z',
      updatedAt: '2023-09-15T10:30:00Z'
    }
  ];
}

async function fetchFeaturedPressReleases({ options }) {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 50));

  // Get all press releases and filter featured ones
  const allReleases = await fetchPressReleases({ options });
  const featuredReleases = allReleases.filter(release => release.featured);

  // Sort by publish date, newest first
  featuredReleases.sort((a, b) =>
    new Date(b.publishDate) - new Date(a.publishDate)
  );

  return featuredReleases;
}

async function fetchFullPressRelease(releaseId) {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 150));

  // Get the base press release
  const allReleases = await fetchPressReleases({});
  const baseRelease = allReleases.find(release => release.id === releaseId);

  if (!baseRelease) {
    throw new Error(`Press release not found: ${releaseId}`);
  }

  // Add full content
  return {
    ...baseRelease,
    fullContent: true,
    content: `
# ${baseRelease.title}

*${new Date(baseRelease.publishDate).toLocaleDateString()} - Press Release*

${baseRelease.summary}

## Details

Web3 Crypto Streaming Service, the leading platform for decentralized content streaming and monetization, today announced ${baseRelease.title.toLowerCase()}.

This strategic development represents a significant step forward in our mission to revolutionize how content creators monetize their work and engage with audiences in the Web3 ecosystem.

"We're excited to share this news with our community," said Sarah Chen, CEO of Web3 Crypto Streaming Service. "This milestone reflects our ongoing commitment to building the future of decentralized content distribution."

## About Web3 Crypto Streaming Service

Web3 Crypto Streaming Service is a decentralized platform that enables content creators to seamlessly distribute, monetize, and engage with their audiences through blockchain technology. The platform leverages cryptocurrencies and NFTs to create new revenue streams for creators while providing audiences with unique ways to support their favorite content.

For more information, please contact press@web3streaming.example.com.

*End of Press Release*
`,
    relatedReleases: allReleases
      .filter(release => release.id !== releaseId && release.category === baseRelease.category)
      .slice(0, 3)
      .map(({ id, title, publishDate }) => ({ id, title, publishDate })),
    contacts: [
      {
        name: 'Media Relations',
        email: 'press@web3streaming.example.com',
        phone: '+1 (555) 123-4567'
      }
    ]
  };
}

async function fetchPressReleasesByCategory({ category, options }) {
  // Get all press releases and filter by category
  const allReleases = await fetchPressReleases({ options });
  return allReleases.filter(release => release.category === category);
}

async function submitPressRelease({ pressReleaseData }) {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 200));

  // Create new press release
  return {
    id: `pr-${Date.now()}`,
    ...pressReleaseData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function submitPressReleaseUpdate({ releaseId, updateData }) {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 150));

  // Get the original release
  const allReleases = await fetchPressReleases({});
  const originalRelease = allReleases.find(release => release.id === releaseId);

  if (!originalRelease) {
    throw new Error(`Press release not found: ${releaseId}`);
  }

  // Update the release
  return {
    ...originalRelease,
    ...updateData,
    updatedAt: new Date().toISOString()
  };
}

async function performPressReleaseDeletion({ releaseId }) {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 100));

  // Return success response
  return {
    success: true,
    deletedId: releaseId,
    message: `Press release ${releaseId} successfully deleted`
  };
}

async function generatePressReleaseContent({ pressReleaseData, template }) {
  // Simulate AI generation delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Generate content based on template and data
  let content;

  switch (template) {
    case 'product_launch':
      content = generateProductLaunchTemplate(pressReleaseData);
      break;
    case 'partnership':
      content = generatePartnershipTemplate(pressReleaseData);
      break;
    case 'milestone':
      content = generateMilestoneTemplate(pressReleaseData);
      break;
    case 'standard':
    default:
      content = generateStandardTemplate(pressReleaseData);
      break;
  }

  return {
    ...pressReleaseData,
    content,
    summary: generateSummary(content),
    generatedWith: template
  };
}

function generateStandardTemplate(data) {
  return `
# ${data.title || 'Press Release Title'}

*${new Date().toLocaleDateString()} - Press Release*

${data.summary || 'Brief summary of the announcement.'}

## Details

Web3 Crypto Streaming Service, the leading platform for decentralized content streaming and monetization, today announced ${(data.title || 'important news').toLowerCase()}.

This development represents a significant advancement in our mission to revolutionize how content creators monetize their work and engage with audiences in the Web3 ecosystem.

"${data.quote || 'We\'re excited about this important development and its implications for our community.'}" said ${data.spokesperson || 'Sarah Chen, CEO of Web3 Crypto Streaming Service'}. "${data.quoteSecondary || 'This reflects our commitment to innovation and growth in the decentralized content space.'}

${data.additionalParagraphs || ''}

## About Web3 Crypto Streaming Service

Web3 Crypto Streaming Service is a decentralized platform that enables content creators to seamlessly distribute, monetize, and engage with their audiences through blockchain technology. The platform leverages cryptocurrencies and NFTs to create new revenue streams for creators while providing audiences with unique ways to support their favorite content.

For more information, please contact press@web3streaming.example.com.

*End of Press Release*
`;
}

function generateProductLaunchTemplate(data) {
  const productName = data.productName || '[Product Name]';
  const productDescription = data.productDescription || 'a new product/feature';

  return `
# Web3 Crypto Streaming Service Announces Launch of ${productName}

*${new Date().toLocaleDateString()} - Press Release*

${data.summary || `Web3 Crypto Streaming Service today announced the launch of ${productName}, ${productDescription}.`}

## Details

Web3 Crypto Streaming Service, the leading platform for decentralized content streaming and monetization, today announced the launch of ${productName}, ${productDescription}.

This new offering enables content creators to ${data.productBenefit || 'enhance their content creation and monetization capabilities'} through innovative blockchain technology.

"${data.quote || `We're thrilled to introduce ${productName} to our community`}" said ${data.spokesperson || 'Sarah Chen, CEO of Web3 Crypto Streaming Service'}. "${data.quoteSecondary || 'This launch represents a significant step forward in our product roadmap and addresses key needs we\'ve heard from our users.'}

Key features of ${productName} include:

* ${data.featureOne || 'Enhanced creator monetization options'}
* ${data.featureTwo || 'Improved user engagement capabilities'}
* ${data.featureThree || 'Seamless integration with existing platform features'}

${productName} is available to all users starting ${data.availabilityDate || 'today'}.

${data.additionalParagraphs || ''}

## About Web3 Crypto Streaming Service

Web3 Crypto Streaming Service is a decentralized platform that enables content creators to seamlessly distribute, monetize, and engage with their audiences through blockchain technology. The platform leverages cryptocurrencies and NFTs to create new revenue streams for creators while providing audiences with unique ways to support their favorite content.

For more information, please contact press@web3streaming.example.com.

*End of Press Release*
`;
}

function generatePartnershipTemplate(data) {
  const partnerName = data.partnerName || '[Partner Name]';

  return `
# Web3 Crypto Streaming Service Announces Strategic Partnership with ${partnerName}

*${new Date().toLocaleDateString()} - Press Release*

${data.summary || `Web3 Crypto Streaming Service today announced a strategic partnership with ${partnerName} to enhance its platform offerings.`}

## Details

Web3 Crypto Streaming Service, the leading platform for decentralized content streaming and monetization, today announced a strategic partnership with ${partnerName}, ${data.partnerDescription || 'a leading company in the blockchain space'}.

This partnership will ${data.partnershipBenefit || 'enable both companies to leverage their respective strengths to deliver enhanced value to creators and users'}.

"${data.quote || `We're excited to partner with ${partnerName} on this initiative`}" said ${data.spokesperson || 'Sarah Chen, CEO of Web3 Crypto Streaming Service'}. "${data.quoteSecondary || 'This collaboration represents a perfect strategic fit that will accelerate our mission to revolutionize content creation and distribution.'}

"${data.partnerQuote || 'We see tremendous potential in working with Web3 Crypto Streaming Service'}" added ${data.partnerSpokesperson || `Alex Rivera, CEO of ${partnerName}`}. "${data.partnerQuoteSecondary || 'Together, we can create more value for the creator economy while advancing the adoption of decentralized technologies.'}

${data.additionalParagraphs || ''}

## About Web3 Crypto Streaming Service

Web3 Crypto Streaming Service is a decentralized platform that enables content creators to seamlessly distribute, monetize, and engage with their audiences through blockchain technology. The platform leverages cryptocurrencies and NFTs to create new revenue streams for creators while providing audiences with unique ways to support their favorite content.

## About ${partnerName}

${data.aboutPartner || `${partnerName} is a leading provider of blockchain solutions focused on advancing the adoption of decentralized technologies across industries.`}

For more information, please contact press@web3streaming.example.com.

*End of Press Release*
`;
}

function generateMilestoneTemplate(data) {
  const milestone = data.milestone || '[Milestone]';

  return `
# Web3 Crypto Streaming Service Achieves ${milestone} Milestone

*${new Date().toLocaleDateString()} - Press Release*

${data.summary || `Web3 Crypto Streaming Service today celebrated reaching the ${milestone} milestone, marking significant growth for the platform.`}

## Details

Web3 Crypto Streaming Service, the leading platform for decentralized content streaming and monetization, today announced it has achieved ${milestone}. This achievement represents a significant milestone in the company's growth journey.

"${data.quote || `Reaching ${milestone} is a testament to the value our platform provides creators and users`}" said ${data.spokesperson || 'Sarah Chen, CEO of Web3 Crypto Streaming Service'}. "${data.quoteSecondary || 'We\'re grateful to our community for their support and excited about continuing this growth trajectory.'}

Key factors contributing to this achievement include:

* ${data.factorOne || 'Rapid adoption by content creators seeking decentralized monetization options'}
* ${data.factorTwo || 'Growing user community embracing Web3 technologies'}
* ${data.factorThree || 'Continuous platform improvements and feature additions'}

${data.additionalParagraphs || ''}

## About Web3 Crypto Streaming Service

Web3 Crypto Streaming Service is a decentralized platform that enables content creators to seamlessly distribute, monetize, and engage with their audiences through blockchain technology. The platform leverages cryptocurrencies and NFTs to create new revenue streams for creators while providing audiences with unique ways to support their favorite content.

For more information, please contact press@web3streaming.example.com.

*End of Press Release*
`;
}

function generateSummary(content) {
  // Simple summary generation by extracting first paragraph after Details heading
  const detailsSection = content.split('## Details')[1] || '';
  const firstParagraph = detailsSection.split('\n\n')[1] || '';

  if (firstParagraph && firstParagraph.length > 20) {
    // Return first sentence if paragraph is long
    const firstSentence = firstParagraph.split('.')[0];
    if (firstSentence.length > 20) {
      return firstSentence + '.';
    }
    return firstParagraph;
  }

  // Fallback
  return 'Press release from Web3 Crypto Streaming Service.';
}
