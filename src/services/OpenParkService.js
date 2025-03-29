/**
 * Open Park Service
 * 
 * Provides functionality for the platform's open community space where users
 * can discover content, collaborate, and interact without upfront investments.
 */

import { optimizeComputation } from './OptimizationService';
import { EXECUTION_STRATEGIES, PRIORITY_LEVELS } from './ExecutionEngine';
import { evaluateContent } from './EvaluationService';

// Cache for efficient data retrieval
const dataCache = {
  trendingProjects: null,
  openSourceProjects: null,
  communityEvents: null,
  publicContent: null,
  lastFetch: {
    trendingProjects: 0,
    openSourceProjects: 0,
    communityEvents: 0,
    publicContent: 0
  }
};

// Cache TTL in milliseconds
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get trending community projects
 * @param {Object} options - Filter and pagination options
 * @returns {Promise<Array>} Trending projects
 */
export async function getTrendingProjects(options = {}) {
  // Use cache if available and not expired
  if (dataCache.trendingProjects &&
    (Date.now() - dataCache.lastFetch.trendingProjects) < CACHE_TTL) {
    return filterAndPaginate(dataCache.trendingProjects, options);
  }

  try {
    // Fetch trending projects with optimized execution
    const projects = await optimizeComputation(
      fetchTrendingProjects,
      {
        params: { options },
        strategy: EXECUTION_STRATEGIES.WORKER,
        priority: PRIORITY_LEVELS.LOW
      }
    );

    // Cache the results
    dataCache.trendingProjects = projects;
    dataCache.lastFetch.trendingProjects = Date.now();

    return filterAndPaginate(projects, options);
  } catch (error) {
    console.error('Error fetching trending projects:', error);
    return [];
  }
}

/**
 * Get open source projects
 * @param {Object} options - Filter and pagination options
 * @returns {Promise<Array>} Open source projects
 */
export async function getOpenSourceProjects(options = {}) {
  // Use cache if available and not expired
  if (dataCache.openSourceProjects &&
    (Date.now() - dataCache.lastFetch.openSourceProjects) < CACHE_TTL) {
    return filterAndPaginate(dataCache.openSourceProjects, options);
  }

  try {
    // Fetch open source projects with optimized execution
    const projects = await optimizeComputation(
      fetchOpenSourceProjects,
      {
        params: { options },
        strategy: EXECUTION_STRATEGIES.WORKER,
        priority: PRIORITY_LEVELS.LOW
      }
    );

    // Cache the results
    dataCache.openSourceProjects = projects;
    dataCache.lastFetch.openSourceProjects = Date.now();

    return filterAndPaginate(projects, options);
  } catch (error) {
    console.error('Error fetching open source projects:', error);
    return [];
  }
}

/**
 * Get upcoming community events
 * @param {Object} options - Filter and pagination options
 * @returns {Promise<Array>} Community events
 */
export async function getCommunityEvents(options = {}) {
  // Use cache if available and not expired
  if (dataCache.communityEvents &&
    (Date.now() - dataCache.lastFetch.communityEvents) < CACHE_TTL) {
    return filterAndPaginate(dataCache.communityEvents, options);
  }

  try {
    // Fetch community events with optimized execution
    const events = await optimizeComputation(
      fetchCommunityEvents,
      {
        params: { options },
        strategy: EXECUTION_STRATEGIES.IMMEDIATE,
        priority: PRIORITY_LEVELS.LOW
      }
    );

    // Cache the results
    dataCache.communityEvents = events;
    dataCache.lastFetch.communityEvents = Date.now();

    return filterAndPaginate(events, options);
  } catch (error) {
    console.error('Error fetching community events:', error);
    return [];
  }
}

/**
 * Get free public content
 * @param {Object} options - Filter and pagination options
 * @returns {Promise<Array>} Public content items
 */
export async function getPublicContent(options = {}) {
  // Use cache if available and not expired
  if (dataCache.publicContent &&
    (Date.now() - dataCache.lastFetch.publicContent) < CACHE_TTL) {
    return filterAndPaginate(dataCache.publicContent, options);
  }

  try {
    // Fetch public content with optimized execution
    const content = await optimizeComputation(
      fetchPublicContent,
      {
        params: { options },
        strategy: EXECUTION_STRATEGIES.WORKER,
        priority: PRIORITY_LEVELS.LOW
      }
    );

    // Cache the results
    dataCache.publicContent = content;
    dataCache.lastFetch.publicContent = Date.now();

    return filterAndPaginate(content, options);
  } catch (error) {
    console.error('Error fetching public content:', error);
    return [];
  }
}

/**
 * Join a community project
 * @param {string} projectId - ID of the project to join
 * @param {string} userId - ID of the user
 * @param {Object} options - Join options including role
 * @returns {Promise<Object>} Join result
 */
export async function joinProject(projectId, userId, options = {}) {
  try {
    // This would connect to the backend API in a real implementation
    // For now, simulate the join process
    const result = await optimizeComputation(
      simulateJoinProject,
      {
        params: { projectId, userId, options },
        strategy: EXECUTION_STRATEGIES.IMMEDIATE,
        priority: PRIORITY_LEVELS.HIGH
      }
    );

    // Invalidate cache to reflect the change
    dataCache.trendingProjects = null;
    dataCache.openSourceProjects = null;

    return result;
  } catch (error) {
    console.error('Error joining project:', error);
    throw error;
  }
}

/**
 * Submit feedback or rate a project
 * @param {string} projectId - ID of the project
 * @param {string} userId - ID of the user
 * @param {Object} feedback - Feedback data
 * @returns {Promise<Object>} Submission result
 */
export async function submitProjectFeedback(projectId, userId, feedback) {
  try {
    // Simulate feedback submission
    const result = await optimizeComputation(
      simulateSubmitFeedback,
      {
        params: { projectId, userId, feedback },
        strategy: EXECUTION_STRATEGIES.IMMEDIATE,
        priority: PRIORITY_LEVELS.MEDIUM
      }
    );

    // Invalidate related cache
    dataCache.trendingProjects = null;

    return result;
  } catch (error) {
    console.error('Error submitting feedback:', error);
    throw error;
  }
}

/**
 * Get details about a specific project
 * @param {string} projectId - ID of the project
 * @returns {Promise<Object>} Project details
 */
export async function getProjectDetails(projectId) {
  try {
    // First check if the project is in cache
    const cachedTrending = dataCache.trendingProjects?.find(p => p.id === projectId);
    if (cachedTrending) return cachedTrending;

    const cachedOpenSource = dataCache.openSourceProjects?.find(p => p.id === projectId);
    if (cachedOpenSource) return cachedOpenSource;

    // If not in cache, fetch directly
    return await optimizeComputation(
      fetchProjectDetails,
      {
        params: { projectId },
        strategy: EXECUTION_STRATEGIES.IMMEDIATE,
        priority: PRIORITY_LEVELS.MEDIUM
      }
    );
  } catch (error) {
    console.error('Error fetching project details:', error);
    throw error;
  }
}

/**
 * Create a new community project proposal
 * @param {Object} projectData - Project proposal data
 * @param {string} userId - ID of the proposing user
 * @returns {Promise<Object>} Created project
 */
export async function createProjectProposal(projectData, userId) {
  try {
    // Validate proposal first
    const validationResult = validateProjectProposal(projectData);
    if (!validationResult.valid) {
      return {
        success: false,
        errors: validationResult.errors
      };
    }

    // Submit proposal
    const result = await optimizeComputation(
      simulateCreateProject,
      {
        params: { projectData, userId },
        strategy: EXECUTION_STRATEGIES.IMMEDIATE,
        priority: PRIORITY_LEVELS.HIGH
      }
    );

    // Invalidate cache
    dataCache.openSourceProjects = null;

    return result;
  } catch (error) {
    console.error('Error creating project proposal:', error);
    throw error;
  }
}

/**
 * Get featured opportunities for contribution
 * @param {Object} options - Filter options
 * @returns {Promise<Array>} Contribution opportunities
 */
export async function getContributionOpportunities(options = {}) {
  try {
    // Combine trending and open source projects for opportunities
    const trending = await getTrendingProjects();
    const openSource = await getOpenSourceProjects();

    // Extract opportunities from projects
    const opportunities = [];

    for (const project of [...trending, ...openSource]) {
      if (project.opportunities && project.opportunities.length > 0) {
        for (const opportunity of project.opportunities) {
          opportunities.push({
            ...opportunity,
            projectId: project.id,
            projectName: project.name,
            projectLogo: project.logo
          });
        }
      }
    }

    // Sort by priority and recency
    opportunities.sort((a, b) => {
      // High priority first
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }

      // Most recent first
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return opportunities;
  } catch (error) {
    console.error('Error fetching contribution opportunities:', error);
    return [];
  }
}

// Helper functions

function filterAndPaginate(items, options = {}) {
  if (!items) return [];

  let filtered = [...items];

  // Apply filters
  if (options.category) {
    filtered = filtered.filter(item => item.category === options.category);
  }

  if (options.tag) {
    filtered = filtered.filter(item =>
      item.tags && item.tags.includes(options.tag)
    );
  }

  if (options.search) {
    const searchLower = options.search.toLowerCase();
    filtered = filtered.filter(item =>
      (item.name && item.name.toLowerCase().includes(searchLower)) ||
      (item.description && item.description.toLowerCase().includes(searchLower))
    );
  }

  // Apply sorting
  if (options.sortBy) {
    const direction = options.sortDirection === 'desc' ? -1 : 1;

    filtered.sort((a, b) => {
      if (a[options.sortBy] < b[options.sortBy]) return -1 * direction;
      if (a[options.sortBy] > b[options.sortBy]) return 1 * direction;
      return 0;
    });
  }

  // Apply pagination
  if (options.limit) {
    const start = options.offset || 0;
    filtered = filtered.slice(start, start + options.limit);
  }

  return filtered;
}

function validateProjectProposal(projectData) {
  const errors = [];

  if (!projectData.name || projectData.name.trim().length < 3) {
    errors.push('Project name must be at least 3 characters long');
  }

  if (!projectData.description || projectData.description.trim().length < 20) {
    errors.push('Project description must be at least 20 characters long');
  }

  if (!projectData.category) {
    errors.push('Project category is required');
  }

  if (!projectData.license) {
    errors.push('Project license is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Data fetching functions (would call API in real implementation)

function fetchTrendingProjects({ options }) {
  // This would call an API in a real implementation
  // For now, return simulated data

  return [
    {
      id: 'proj-1',
      name: 'Community Governance DAO',
      description: 'A decentralized governance system for community decision making with simplified onboarding for non-technical users.',
      category: 'governance',
      contributors: 34,
      stars: 187,
      trend: 'rising',
      completionPercentage: 72,
      logo: 'https://example.com/project-logos/community-dao.png',
      tags: ['dao', 'governance', 'community'],
      license: 'MIT',
      createdAt: '2023-09-15T10:20:30Z',
      updatedAt: '2023-11-02T15:43:22Z',
      opportunities: [
        {
          id: 'op-1',
          title: 'UI/UX Designer for Voting Interface',
          description: 'We need help designing an intuitive voting interface for non-technical users',
          skills: ['design', 'ui/ux', 'figma'],
          priority: 1,
          reward: 'Community tokens + recognition',
          createdAt: '2023-10-28T09:15:00Z',
        }
      ]
    },
    {
      id: 'proj-2',
      name: 'Web3 Content Scheduler',
      description: 'Open source tool for scheduling and automating content distribution across Web3 platforms.',
      category: 'tools',
      contributors: 12,
      stars: 92,
      trend: 'stable',
      completionPercentage: 45,
      logo: 'https://example.com/project-logos/content-scheduler.png',
      tags: ['scheduling', 'automation', 'content'],
      license: 'Apache 2.0',
      createdAt: '2023-08-07T14:30:10Z',
      updatedAt: '2023-10-28T11:20:15Z',
      opportunities: [
        {
          id: 'op-2',
          title: 'Backend Developer for API Integration',
          description: 'Help us integrate with more content platforms via their APIs',
          skills: ['nodejs', 'apis', 'backend'],
          priority: 2,
          reward: 'Open source contribution recognition',
          createdAt: '2023-10-15T16:30:00Z',
        }
      ]
    },
    {
      id: 'proj-3',
      name: 'Decentralized Education Platform',
      description: 'A platform for creating and sharing educational content with token incentives for educators and learners.',
      category: 'education',
      contributors: 28,
      stars: 215,
      trend: 'rising',
      completionPercentage: 68,
      logo: 'https://example.com/project-logos/edu-platform.png',
      tags: ['education', 'learning', 'incentives'],
      license: 'GPL-3.0',
      createdAt: '2023-05-20T08:45:30Z',
      updatedAt: '2023-11-01T09:30:45Z',
      opportunities: [
        {
          id: 'op-3',
          title: 'Content Creator for Blockchain Basics',
          description: 'Create beginner-friendly educational content about blockchain fundamentals',
          skills: ['content creation', 'education', 'blockchain knowledge'],
          priority: 1,
          reward: 'Educator tokens + platform visibility',
          createdAt: '2023-10-30T14:20:00Z',
        }
      ]
    },
    {
      id: 'proj-4',
      name: 'Open Analytics Dashboard',
      description: 'Privacy-focused analytics dashboard for content creators to understand audience engagement.',
      category: 'analytics',
      contributors: 8,
      stars: 67,
      trend: 'new',
      completionPercentage: 30,
      logo: 'https://example.com/project-logos/analytics.png',
      tags: ['analytics', 'privacy', 'dashboard'],
      license: 'MIT',
      createdAt: '2023-10-10T11:15:00Z',
      updatedAt: '2023-10-30T16:45:10Z',
      opportunities: []
    },
    {
      id: 'proj-5',
      name: 'Community Content Moderation',
      description: 'Decentralized content moderation tools using community consensus and reputation systems.',
      category: 'moderation',
      contributors: 16,
      stars: 124,
      trend: 'stable',
      completionPercentage: 55,
      logo: 'https://example.com/project-logos/moderation.png',
      tags: ['moderation', 'reputation', 'consensus'],
      license: 'MIT',
      createdAt: '2023-07-12T13:25:30Z',
      updatedAt: '2023-10-25T10:10:20Z',
      opportunities: []
    }
  ];
}

function fetchOpenSourceProjects({ options }) {
  // This would call an API in a real implementation
  // For now, return simulated data

  return [
    {
      id: 'os-proj-1',
      name: 'IPFS Content Delivery Framework',
      description: 'Open source framework for optimizing content delivery through IPFS with edge caching.',
      category: 'infrastructure',
      contributors: 42,
      stars: 312,
      githubUrl: 'https://github.com/example/ipfs-content-delivery',
      completionPercentage: 85,
      logo: 'https://example.com/project-logos/ipfs-framework.png',
      tags: ['ipfs', 'content delivery', 'caching'],
      license: 'MIT',
      createdAt: '2023-03-10T09:30:15Z',
      updatedAt: '2023-11-02T08:15:30Z',
      opportunities: [
        {
          id: 'op-4',
          title: 'Performance Optimization Specialist',
          description: 'Help us optimize content delivery speed for large files',
          skills: ['performance', 'ipfs', 'networking'],
          priority: 1,
          reward: 'Open source contribution + community recognition',
          createdAt: '2023-10-25T11:30:00Z',
        }
      ]
    },
    {
      id: 'os-proj-2',
      name: 'Web3 Creator Toolkit',
      description: 'A collection of tools and libraries for content creators to build on decentralized platforms.',
      category: 'development',
      contributors: 26,
      stars: 187,
      githubUrl: 'https://github.com/example/web3-creator-toolkit',
      completionPercentage: 70,
      logo: 'https://example.com/project-logos/creator-toolkit.png',
      tags: ['tools', 'sdk', 'creator economy'],
      license: 'Apache 2.0',
      createdAt: '2023-06-15T14:20:00Z',
      updatedAt: '2023-10-28T15:45:10Z',
      opportunities: []
    },
    {
      id: 'os-proj-3',
      name: 'Decentralized Comments System',
      description: 'Platform-agnostic commenting system that stores comments on-chain with reputation system.',
      category: 'social',
      contributors: 19,
      stars: 143,
      githubUrl: 'https://github.com/example/d-comments',
      completionPercentage: 60,
      logo: 'https://example.com/project-logos/d-comments.png',
      tags: ['comments', 'social', 'reputation'],
      license: 'MIT',
      createdAt: '2023-07-22T10:15:30Z',
      updatedAt: '2023-10-30T13:20:45Z',
      opportunities: [
        {
          id: 'op-5',
          title: 'Smart Contract Developer',
          description: 'Enhance our smart contracts for more gas-efficient comment storage',
          skills: ['solidity', 'optimization', 'blockchain'],
          priority: 2,
          reward: 'Developer tokens + project contributor status',
          createdAt: '2023-10-20T09:45:00Z',
        }
      ]
    },
    {
      id: 'os-proj-4',
      name: 'Multilingual Content Translation',
      description: 'Open source AI-assisted translation system for Web3 content creators to reach global audiences.',
      category: 'localization',
      contributors: 15,
      stars: 78,
      githubUrl: 'https://github.com/example/web3-translate',
      completionPercentage: 40,
      logo: 'https://example.com/project-logos/translation.png',
      tags: ['translation', 'multilingual', 'ai'],
      license: 'GPL-3.0',
      createdAt: '2023-09-05T16:40:20Z',
      updatedAt: '2023-10-29T09:10:15Z',
      opportunities: []
    }
  ];
}

function fetchCommunityEvents({ options }) {
  // This would call an API in a real implementation
  // For now, return simulated data

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);

  return [
    {
      id: 'event-1',
      name: 'Open Park Community Hackathon',
      description: 'A 48-hour virtual hackathon focusing on building tools for the content creator community.',
      category: 'hackathon',
      startDate: nextWeek.toISOString(),
      endDate: new Date(nextWeek.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Virtual',
      attendees: 230,
      tags: ['hackathon', 'development', 'prizes'],
      registrationUrl: 'https://example.com/events/hackathon-registration',
      image: 'https://example.com/event-images/hackathon.png'
    },
    {
      id: 'event-2',
      name: 'Content Creator Workshop',
      description: 'Learn advanced techniques for creating and monetizing Web3 content.',
      category: 'workshop',
      startDate: tomorrow.toISOString(),
      endDate: tomorrow.toISOString(),
      location: 'Virtual',
      attendees: 145,
      tags: ['workshop', 'creators', 'monetization'],
      registrationUrl: 'https://example.com/events/creator-workshop',
      image: 'https://example.com/event-images/workshop.png'
    },
    {
      id: 'event-3',
      name: 'Open Source Contributor Day',
      description: 'A day dedicated to helping new contributors get started with open source Web3 projects.',
      category: 'community',
      startDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Virtual',
      attendees: 98,
      tags: ['open source', 'contribution', 'beginner friendly'],
      registrationUrl: 'https://example.com/events/contributor-day',
      image: 'https://example.com/event-images/contributor-day.png'
    },
    {
      id: 'event-4',
      name: 'Community Governance Call',
      description: 'Monthly call to discuss and vote on community proposals and improvements.',
      category: 'governance',
      startDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Virtual',
      attendees: 87,
      tags: ['governance', 'voting', 'community'],
      registrationUrl: 'https://example.com/events/governance-call',
      image: 'https://example.com/event-images/governance.png'
    }
  ];
}

function fetchPublicContent({ options }) {
  // This would call an API in a real implementation
  // For now, return simulated data

  return [
    {
      id: 'content-1',
      title: 'Getting Started with Web3 Content Creation',
      description: 'A beginner-friendly guide to creating and sharing content on decentralized platforms.',
      creator: 'Web3 Education Collective',
      creatorId: 'creator-123',
      publishedAt: '2023-10-15T14:30:00Z',
      thumbnail: 'https://example.com/thumbnails/web3-guide.jpg',
      contentType: 'article',
      readTime: '8 min',
      category: 'education',
      tags: ['beginner', 'guide', 'web3'],
      views: 3254,
      likes: 187
    },
    {
      id: 'content-2',
      title: 'Introduction to Blockchain for Content Creators',
      description: 'Understanding how blockchain can transform the way we create and share digital content.',
      creator: 'Digital Creator DAO',
      creatorId: 'creator-456',
      publishedAt: '2023-10-20T10:15:30Z',
      thumbnail: 'https://example.com/thumbnails/blockchain-intro.jpg',
      contentType: 'video',
      duration: '15:24',
      category: 'education',
      tags: ['blockchain', 'creators', 'introduction'],
      views: 8721,
      likes: 643
    },
    {
      id: 'content-3',
      title: 'Building Your First dApp: Step-by-Step Tutorial',
      description: 'Learn to build a simple decentralized application from scratch in this hands-on tutorial.',
      creator: 'DeveloperDAO',
      creatorId: 'creator-789',
      publishedAt: '2023-10-25T09:45:15Z',
      thumbnail: 'https://example.com/thumbnails/dapp-tutorial.jpg',
      contentType: 'tutorial',
      readTime: '25 min',
      category: 'development',
      tags: ['dapp', 'tutorial', 'coding'],
      views: 2156,
      likes: 324
    },
    {
      id: 'content-4',
      title: 'The Future of Content Monetization',
      description: 'Exploring new models for sustainable content monetization in Web3.',
      creator: 'Economics Collective',
      creatorId: 'creator-012',
      publishedAt: '2023-10-30T16:20:45Z',
      thumbnail: 'https://example.com/thumbnails/monetization.jpg',
      contentType: 'podcast',
      duration: '42:10',
      category: 'business',
      tags: ['monetization', 'future', 'economics'],
      views: 1876,
      likes: 254
    },
    {
      id: 'content-5',
      title: 'Understanding Token Economics for Communities',
      description: 'A deep dive into designing effective token economies for online communities.',
      creator: 'Web3 Economics Lab',
      creatorId: 'creator-345',
      publishedAt: '2023-11-01T11:30:00Z',
      thumbnail: 'https://example.com/thumbnails/tokenomics.jpg',
      contentType: 'article',
      readTime: '12 min',
      category: 'economics',
      tags: ['tokenomics', 'community', 'design'],
      views: 984,
      likes: 137
    }
  ];
}

function fetchProjectDetails({ projectId }) {
  // In a real implementation, this would fetch from an API
  // For now, simulate finding a project from our mock data

  const allProjects = [
    ...fetchTrendingProjects({}),
    ...fetchOpenSourceProjects({})
  ];

  const project = allProjects.find(p => p.id === projectId);

  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  // Add some additional details that wouldn't be in the list view
  return {
    ...project,
    fullDescription: project.description + ` This project aims to solve key challenges in the ${project.category} space by leveraging decentralized technologies and community collaboration.`,
    roadmap: [
      {
        phase: 'Phase 1',
        title: 'Foundation',
        description: 'Establish core functionality and infrastructure',
        completionPercentage: 100,
        milestones: ['Core architecture', 'Basic functionality', 'Community setup']
      },
      {
        phase: 'Phase 2',
        title: 'Expansion',
        description: 'Expand features and grow community',
        completionPercentage: project.completionPercentage > 50 ? 75 : 50,
        milestones: ['Additional features', 'Community growth', 'Partnership development']
      },
      {
        phase: 'Phase 3',
        title: 'Scaling',
        description: 'Scale the solution to wider adoption',
        completionPercentage: project.completionPercentage > 75 ? 20 : 0,
        milestones: ['Performance optimization', 'Enterprise features', 'Ecosystem integration']
      }
    ],
    team: [
      {
        id: 'team-1',
        name: 'Alex Rivera',
        role: 'Project Lead',
        avatar: 'https://example.com/avatars/alex.jpg',
        github: 'alexr'
      },
      {
        id: 'team-2',
        name: 'Jamie Chen',
        role: 'Tech Lead',
        avatar: 'https://example.com/avatars/jamie.jpg',
        github: 'jamiec'
      },
      {
        id: 'team-3',
        name: 'Taylor Kim',
        role: 'Community Manager',
        avatar: 'https://example.com/avatars/taylor.jpg',
        github: 'taylork'
      }
    ],
    discussions: [
      {
        id: 'disc-1',
        title: 'Implementation approach for feature X',
        author: 'Jamie Chen',
        authorId: 'team-2',
        date: '2023-10-28T15:30:00Z',
        commentCount: 12
      },
      {
        id: 'disc-2',
        title: 'Community feedback on latest release',
        author: 'Taylor Kim',
        authorId: 'team-3',
        date: '2023-10-30T09:15:45Z',
        commentCount: 8
      }
    ]
  };
}

// Simulation functions for actions (would be API calls in a real implementation)

function simulateJoinProject({ projectId, userId, options }) {
  // Simulate backend processing
  return {
    success: true,
    projectId,
    userId,
    role: options.role || 'contributor',
    joinedAt: new Date().toISOString(),
    message: 'Successfully joined the project'
  };
}

function simulateSubmitFeedback({ projectId, userId, feedback }) {
  // Validate feedback
  if (!feedback.rating || feedback.rating < 1 || feedback.rating > 5) {
    throw new Error('Invalid rating. Must be between 1 and 5.');
  }

  // Simulate backend processing
  return {
    success: true,
    feedbackId: `feedback-${Date.now()}`,
    projectId,
    userId,
    submittedAt: new Date().toISOString(),
    message: 'Feedback submitted successfully'
  };
}

function simulateCreateProject({ projectData, userId }) {
  // Simulate backend processing
  const projectId = `proj-${Date.now()}`;

  return {
    success: true,
    project: {
      id: projectId,
      ...projectData,
      creatorId: userId,
      contributors: 1,
      stars: 0,
      trend: 'new',
      completionPercentage: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    message: 'Project proposal created successfully'
  };
}
