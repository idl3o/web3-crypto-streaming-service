import { predictContentPopularity, predictInvestmentReturns } from './PrecogEngine';

// Constants for quantum probability calculations
const QUANTUM_UNCERTAINTY_FACTOR = 0.42;
const TEMPORAL_STABILITY_THRESHOLD = 0.137;
const BUTTERFLY_EFFECT_MULTIPLIER = 1.618;
const MAX_TIMELINE_DIVERGENCE = 5;

/**
 * TARDIS-EmDrive Service
 * 
 * Simulates quantum timeline predictions and temporal investment scenarios
 * using theoretical quantum computing models based on temporal mechanics.
 */

// Store calculated timelines to avoid quantum decoherence
const quantumTimelineCache = new Map();

/**
 * Generate alternate timeline projections for an investment
 * @param {Object} investment - Investment details
 * @param {Number} timeHorizon - Days into the future
 * @param {Number} timelineCount - Number of alternate timelines to generate
 * @returns {Array} Alternate investment timelines
 */
export function generateQuantumInvestmentTimelines(investment, timeHorizon = 90, timelineCount = 5) {
  const cacheKey = `investment-${investment.id}-${timeHorizon}-${timelineCount}`;

  if (quantumTimelineCache.has(cacheKey)) {
    return quantumTimelineCache.get(cacheKey);
  }

  // Base prediction from precog engine
  const basePrediction = predictInvestmentReturns(investment);

  // Generate quantum divergent timelines based on key uncertainty points
  const timelines = [];

  // Primary timeline (most probable)
  const primaryTimeline = {
    id: 'prime',
    name: 'Prime Timeline',
    probability: 0.42,
    description: 'Most probable outcome based on current quantum state',
    divergencePoint: null,
    divergenceReason: null,
    outcome: { ...basePrediction },
    stabilityIndex: 0.95,
    events: generateTimelineEvents(timeHorizon, 'prime')
  };

  timelines.push(primaryTimeline);

  // Generate alternate timelines with varying probabilities
  for (let i = 1; i < timelineCount; i++) {
    const divergenceFactor = (Math.random() * BUTTERFLY_EFFECT_MULTIPLIER) - (BUTTERFLY_EFFECT_MULTIPLIER / 2);
    const timelineDivergenceDay = Math.floor(Math.random() * (timeHorizon * 0.7)) + 1;
    const divergenceReason = generateDivergenceReason();

    // Calculate quantum-adjusted ROI values
    const quantumAdjustment = (divergenceFactor * QUANTUM_UNCERTAINTY_FACTOR);
    const expectedROI = parseFloat(basePrediction.roi.expected) * (1 + quantumAdjustment);
    const conservativeROI = parseFloat(basePrediction.roi.conservative) * (1 + quantumAdjustment * 0.7);
    const optimisticROI = parseFloat(basePrediction.roi.optimistic) * (1 + quantumAdjustment * 1.3);

    // Calculate probability based on quantum fluctuation intensity
    const probability = Math.max(0.01, 0.5 - (Math.abs(divergenceFactor) * 0.4));

    // Determine stability index
    const stabilityIndex = calculateStabilityIndex(divergenceFactor, timelineDivergenceDay, timeHorizon);

    // Create timeline
    const timeline = {
      id: `timeline-${i}`,
      name: `Timeline ${String.fromCharCode(64 + i)}`,
      probability: parseFloat(probability.toFixed(2)),
      description: generateTimelineDescription(divergenceFactor),
      divergencePoint: timelineDivergenceDay,
      divergenceReason,
      outcome: {
        ...basePrediction,
        roi: {
          expected: `${expectedROI.toFixed(1)}%`,
          conservative: `${conservativeROI.toFixed(1)}%`,
          optimistic: `${optimisticROI.toFixed(1)}%`
        },
        expectedValue: investment.amount * (1 + (expectedROI / 100)),
        conservativeValue: investment.amount * (1 + (conservativeROI / 100)),
        optimisticValue: investment.amount * (1 + (optimisticROI / 100)),
      },
      stabilityIndex: parseFloat(stabilityIndex.toFixed(2)),
      events: generateTimelineEvents(timeHorizon, `timeline-${i}`, timelineDivergenceDay, divergenceReason)
    };

    timelines.push(timeline);
  }

  // Sort by descending probability (most likely first)
  timelines.sort((a, b) => b.probability - a.probability);

  // Cache the results
  quantumTimelineCache.set(cacheKey, timelines);

  return timelines;
}

/**
 * Calculate quantum stability index for a timeline
 */
function calculateStabilityIndex(divergenceFactor, divergenceDay, timeHorizon) {
  const distanceFactor = 1 - (divergenceDay / timeHorizon);
  const stabilityBase = 1 - (Math.abs(divergenceFactor) * QUANTUM_UNCERTAINTY_FACTOR);
  const temporalDecay = distanceFactor * 0.3;

  return Math.max(0.1, Math.min(0.99, stabilityBase - temporalDecay));
}

/**
 * Generate quantum timeline descriptions based on the divergence factor
 */
function generateTimelineDescription(divergenceFactor) {
  if (divergenceFactor > 0.5) {
    return "Highly optimistic outcome due to unexpected positive market shifts";
  } else if (divergenceFactor > 0.2) {
    return "Positive deviation with better-than-expected adoption rates";
  } else if (divergenceFactor > -0.2) {
    return "Moderate variation with minor changes to projected outcomes";
  } else if (divergenceFactor > -0.5) {
    return "Challenging conditions with unexpected market resistance";
  } else {
    return "Significant negative deviation due to unforeseen market disruption";
  }
}

/**
 * Generate reason for timeline divergence
 */
function generateDivergenceReason() {
  const divergenceReasons = [
    "Unexpected regulatory announcement",
    "Viral social media attention",
    "Key developer announcement",
    "Community governance decision",
    "Market liquidity shift",
    "New technology breakthrough",
    "Competing protocol launch",
    "Macroeconomic event impact",
    "Cross-chain integration opportunity",
    "Security vulnerability discovery",
    "Major partnership announcement",
    "Shift in investor sentiment"
  ];

  return divergenceReasons[Math.floor(Math.random() * divergenceReasons.length)];
}

/**
 * Generate events that happen in a timeline
 */
function generateTimelineEvents(timeHorizon, timelineId, divergenceDay = null, divergenceReason = null) {
  const events = [];

  // Add divergence event if this is an alternate timeline
  if (divergenceDay && divergenceReason) {
    events.push({
      day: divergenceDay,
      type: 'divergence',
      title: 'Timeline Divergence',
      description: divergenceReason,
      impact: 'critical'
    });
  }

  // Generate 2-5 random events
  const eventCount = Math.floor(Math.random() * 4) + 2;
  const usedDays = divergenceDay ? [divergenceDay] : [];

  for (let i = 0; i < eventCount; i++) {
    // Find an unused day
    let day;
    do {
      day = Math.floor(Math.random() * timeHorizon) + 1;
    } while (usedDays.includes(day));

    usedDays.push(day);

    // Create event
    events.push({
      day,
      type: getRandomEventType(),
      title: generateEventTitle(timelineId, day),
      description: generateEventDescription(),
      impact: getRandomImpact()
    });
  }

  // Sort events chronologically
  events.sort((a, b) => a.day - b.day);

  return events;
}

/**
 * Get a random event type
 */
function getRandomEventType() {
  const types = ['market', 'technical', 'social', 'regulatory', 'partnership'];
  return types[Math.floor(Math.random() * types.length)];
}

/**
 * Get a random impact level
 */
function getRandomImpact() {
  const impacts = ['low', 'medium', 'high', 'critical'];
  return impacts[Math.floor(Math.random() * impacts.length)];
}

/**
 * Generate an event title
 */
function generateEventTitle(timelineId, day) {
  const marketEvents = [
    "Price momentum shift",
    "Volume spike",
    "Market correction",
    "Trading pattern change",
    "Liquidity event"
  ];

  const technicalEvents = [
    "Protocol upgrade",
    "Feature release",
    "Security enhancement",
    "Performance optimization",
    "Integration milestone"
  ];

  const socialEvents = [
    "Community milestone",
    "Social media trend",
    "Influencer coverage",
    "Viral content spread",
    "Forum activity spike"
  ];

  const regulatoryEvents = [
    "Regulatory clarification",
    "Compliance update",
    "Legal framework shift",
    "Jurisdiction announcement",
    "Governance voting"
  ];

  const partnershipEvents = [
    "Strategic partnership",
    "Integration announcement",
    "Collaborative launch",
    "Ecosystem expansion",
    "Cross-chain bridge"
  ];

  const eventLists = [marketEvents, technicalEvents, socialEvents, regulatoryEvents, partnershipEvents];
  const selectedList = eventLists[Math.floor(Math.random() * eventLists.length)];

  return selectedList[Math.floor(Math.random() * selectedList.length)];
}

/**
 * Generate an event description
 */
function generateEventDescription() {
  const descriptions = [
    "A significant shift that impacts value trajectory.",
    "An unexpected development with implications for growth.",
    "Market participants react strongly to this event.",
    "Creates ripple effects throughout the ecosystem.",
    "Opens new opportunities for development and expansion.",
    "Changes fundamental assumptions about performance.",
    "Solidifies position within the competitive landscape.",
    "Resolves previous uncertainty about direction.",
    "Accelerates adoption and integration timeline.",
    "Shifts perception among key stakeholder groups."
  ];

  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

/**
 * Generate content evolution across quantum timelines
 * @param {Object} content - Content details
 * @param {Number} timeHorizon - Days into the future
 * @param {Number} timelineCount - Number of alternate timelines
 * @returns {Array} Alternate content timelines
 */
export function generateQuantumContentTimelines(content, timeHorizon = 30, timelineCount = 3) {
  const cacheKey = `content-${content.id}-${timeHorizon}-${timelineCount}`;

  if (quantumTimelineCache.has(cacheKey)) {
    return quantumTimelineCache.get(cacheKey);
  }

  // Base prediction from precog engine
  const basePrediction = predictContentPopularity(content);

  // Generate quantum divergent timelines
  const timelines = [];

  // Primary timeline (most probable)
  const primaryTimeline = {
    id: 'prime',
    name: 'Prime Timeline',
    probability: 0.45,
    viewTrajectory: calculateViewTrajectory(basePrediction.predictedViews, timeHorizon),
    engagementPath: calculateEngagementPath(parseFloat(basePrediction.predictedEngagement), timeHorizon),
    outcome: { ...basePrediction },
    divergencePoint: null,
    events: generateContentEvents(timeHorizon, 'prime')
  };

  timelines.push(primaryTimeline);

  // Generate alternate timelines
  for (let i = 1; i < timelineCount; i++) {
    const divergenceFactor = (Math.random() * BUTTERFLY_EFFECT_MULTIPLIER) - (BUTTERFLY_EFFECT_MULTIPLIER / 2);
    const timelineDivergenceDay = Math.floor(Math.random() * (timeHorizon * 0.6)) + 1;

    // Calculate quantum-adjusted metrics
    const viewsAdjustment = 1 + (divergenceFactor * QUANTUM_UNCERTAINTY_FACTOR);
    const predictedViews = Math.round(basePrediction.predictedViews * viewsAdjustment);

    const engagementBase = parseFloat(basePrediction.predictedEngagement);
    const engagementAdjustment = 1 + (divergenceFactor * QUANTUM_UNCERTAINTY_FACTOR * 0.7);
    const predictedEngagement = Math.min(100, engagementBase * engagementAdjustment).toFixed(1) + '%';

    // Calculate probability based on quantum variance
    const probability = Math.max(0.05, 0.4 - (Math.abs(divergenceFactor) * 0.3));

    const timeline = {
      id: `timeline-${i}`,
      name: `Timeline ${String.fromCharCode(64 + i)}`,
      probability: parseFloat(probability.toFixed(2)),
      viewTrajectory: calculateViewTrajectory(predictedViews, timeHorizon, divergenceFactor, timelineDivergenceDay),
      engagementPath: calculateEngagementPath(parseFloat(predictedEngagement), timeHorizon, divergenceFactor, timelineDivergenceDay),
      outcome: {
        ...basePrediction,
        predictedViews,
        predictedEngagement,
        trend: getTrendFromFactor(divergenceFactor),
        viralPotential: basePrediction.viralPotential || divergenceFactor > 0.3
      },
      divergencePoint: timelineDivergenceDay,
      divergenceReason: generateContentDivergenceReason(),
      events: generateContentEvents(timeHorizon, `timeline-${i}`, timelineDivergenceDay)
    };

    timelines.push(timeline);
  }

  // Sort by descending probability
  timelines.sort((a, b) => b.probability - a.probability);

  // Cache the results
  quantumTimelineCache.set(cacheKey, timelines);

  return timelines;
}

/**
 * Calculate view trajectory for the full timeline
 */
function calculateViewTrajectory(targetViews, timeHorizon, divergenceFactor = 0, divergenceDay = null) {
  const trajectory = [];
  const currentViews = targetViews / (1 + (Math.random() * 0.5));

  // Create daily data points
  for (let day = 1; day <= timeHorizon; day++) {
    // Calculate progress percentage with a slightly S-curved growth
    let progressPercent = day / timeHorizon;
    const growthFactor = 1 + Math.sin(progressPercent * Math.PI - Math.PI / 2) * 0.5;

    // Apply divergence if applicable
    let divergenceMultiplier = 1;
    if (divergenceFactor && divergenceDay && day >= divergenceDay) {
      // Gradually increase the influence of the divergence factor
      const divergenceInfluence = Math.min(1, (day - divergenceDay) / (timeHorizon - divergenceDay));
      divergenceMultiplier = 1 + (divergenceFactor * divergenceInfluence);
    }

    // Calculate views for this day with some randomness
    const dailyProgress = progressPercent * growthFactor * divergenceMultiplier;
    const viewsGrowth = (targetViews - currentViews) * dailyProgress;
    const dailyViews = Math.round(currentViews + viewsGrowth);

    // Add random noise (+/- 5%)
    const noise = 1 + ((Math.random() * 0.1) - 0.05);
    const finalViews = Math.round(dailyViews * noise);

    trajectory.push({ day, views: finalViews });
  }

  return trajectory;
}

/**
 * Calculate engagement path over time
 */
function calculateEngagementPath(targetEngagement, timeHorizon, divergenceFactor = 0, divergenceDay = null) {
  const path = [];
  // Start around 80% of the target
  const startEngagement = targetEngagement * 0.8;

  for (let day = 1; day <= timeHorizon; day++) {
    // Engagement tends to peak in the middle then stabilize
    let normalizedDay = day / timeHorizon;
    let engagementFactor;

    if (normalizedDay < 0.4) {
      // Ramp up
      engagementFactor = 0.8 + (normalizedDay * 0.5);
    } else if (normalizedDay < 0.7) {
      // Peak
      engagementFactor = 1.0;
    } else {
      // Slight decline and stabilization
      engagementFactor = 1.0 - ((normalizedDay - 0.7) * 0.1);
    }

    // Apply divergence if applicable
    if (divergenceFactor && divergenceDay && day >= divergenceDay) {
      const divergenceInfluence = Math.min(1, (day - divergenceDay) / (timeHorizon - divergenceDay)) * 0.8;
      engagementFactor *= (1 + (divergenceFactor * divergenceInfluence));
    }

    // Apply some randomness
    const randomFactor = 1 + ((Math.random() * 0.1) - 0.05);
    const dailyEngagement = startEngagement * engagementFactor * randomFactor;

    path.push({
      day,
      engagement: Math.min(100, Math.max(1, parseFloat(dailyEngagement.toFixed(1))))
    });
  }

  return path;
}

/**
 * Get trend description based on divergence factor
 */
function getTrendFromFactor(factor) {
  if (factor > 0.3) return 'rapidly-increasing';
  if (factor > 0) return 'increasing';
  if (factor > -0.3) return 'stable';
  return 'decreasing';
}

/**
 * Generate content-specific divergence reason
 */
function generateContentDivergenceReason() {
  const reasons = [
    "Featured on popular social media channel",
    "Mentioned by industry influencer",
    "Content picked up by recommendation algorithm",
    "Topic suddenly trending due to external event",
    "Related technology breakthrough announcement",
    "Community spotlight feature",
    "Controversial discussion in comments section",
    "Referenced in popular external content",
    "Mentioned in news coverage",
    "Shared by influential community member"
  ];

  return reasons[Math.floor(Math.random() * reasons.length)];
}

/**
 * Generate events specific to content performance
 */
function generateContentEvents(timeHorizon, timelineId, divergenceDay = null) {
  const events = [];

  // Add divergence event if applicable
  if (divergenceDay) {
    events.push({
      day: divergenceDay,
      type: 'divergence',
      title: 'Content Timeline Divergence',
      description: generateContentDivergenceReason()
    });
  }

  // Generate 1-4 additional events
  const eventCount = Math.floor(Math.random() * 4) + 1;
  const usedDays = divergenceDay ? [divergenceDay] : [];

  for (let i = 0; i < eventCount; i++) {
    // Find an unused day
    let day;
    do {
      day = Math.floor(Math.random() * timeHorizon) + 1;
    } while (usedDays.includes(day));

    usedDays.push(day);

    // Generate event data
    events.push({
      day,
      type: getRandomContentEventType(),
      title: getRandomContentEventTitle(),
      description: getRandomContentEventDescription()
    });
  }

  // Sort events by day
  events.sort((a, b) => a.day - b.day);

  return events;
}

/**
 * Get random content event type
 */
function getRandomContentEventType() {
  const types = ['engagement', 'comment', 'share', 'recommendation', 'milestone'];
  return types[Math.floor(Math.random() * types.length)];
}

/**
 * Get random content event title
 */
function getRandomContentEventTitle() {
  const titles = [
    "Engagement spike",
    "Viral sharing moment",
    "Comment section activity",
    "Recommendation boost",
    "View count milestone",
    "Featured in collections",
    "Peak concurrent viewers",
    "Audience demographic shift",
    "Cross-platform sharing",
    "Extended watch time average"
  ];

  return titles[Math.floor(Math.random() * titles.length)];
}

/**
 * Get random content event description
 */
function getRandomContentEventDescription() {
  const descriptions = [
    "A notable increase in viewer engagement metrics.",
    "Content shared across multiple platforms simultaneously.",
    "Discussion in comments section drives additional views.",
    "Recommendation algorithm boosts content visibility.",
    "Content reaches significant view count threshold.",
    "Engagement patterns show increased viewer retention.",
    "New audience segments discover the content.",
    "Related content recommendations create feedback loop.",
    "Extended average view duration indicates quality.",
    "Content featured in curated collections."
  ];

  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

/**
 * Calculate the time displacement paradox quotient
 * This estimates how much altering one timeline could affect others
 * @param {Array} timelines - Collection of quantum timelines
 * @returns {Number} Paradox quotient (0-1)
 */
export function calculateParadoxQuotient(timelines) {
  if (!timelines || timelines.length <= 1) return 0;

  // Calculate timeline entropy
  let totalDivergence = 0;
  let timelineCount = 0;

  for (let i = 1; i < timelines.length; i++) {
    const timeline = timelines[i];
    if (timeline.divergencePoint && timeline.probability) {
      // Weight by probability (more likely timelines create more paradox potential)
      totalDivergence += (Math.abs(timeline.probability) * (1 / timeline.divergencePoint));
      timelineCount++;
    }
  }

  if (timelineCount === 0) return 0;

  // Normalize to 0-1 scale with TEMPORAL_STABILITY_THRESHOLD
  const rawQuotient = (totalDivergence / timelineCount) * QUANTUM_UNCERTAINTY_FACTOR;
  return Math.min(1, rawQuotient / TEMPORAL_STABILITY_THRESHOLD);
}

/**
 * Calculate the quantum entanglement score between two timelines
 * @param {Object} timeline1 - First timeline
 * @param {Object} timeline2 - Second timeline
 * @returns {Number} Entanglement score (0-1)
 */
export function calculateTimelineEntanglement(timeline1, timeline2) {
  if (!timeline1 || !timeline2) return 0;

  // If one is the prime timeline and other is alternate
  const isPrimeAndAlternate =
    (timeline1.id === 'prime' && timeline2.id !== 'prime') ||
    (timeline2.id === 'prime' && timeline1.id !== 'prime');

  // Base entanglement on divergence points
  let entanglementBase = 0.5;

  if (isPrimeAndAlternate) {
    const alternateTL = timeline1.id === 'prime' ? timeline2 : timeline1;
    // Earlier divergence = less entanglement with prime
    entanglementBase = Math.min(0.8, 0.4 + (alternateTL.divergencePoint / 100));
  } else if (timeline1.id !== 'prime' && timeline2.id !== 'prime') {
    // Two alternate timelines - check if they diverged at similar points
    const divergenceDiff = Math.abs(
      (timeline1.divergencePoint || 0) - (timeline2.divergencePoint || 0)
    );
    entanglementBase = Math.max(0.2, 1 - (divergenceDiff / 30));
  }

  // Probability affects entanglement - similar probabilities = more entangled
  const probabilityDiff = Math.abs(
    (timeline1.probability || 0.5) - (timeline2.probability || 0.5)
  );

  const probabilityFactor = 1 - (probabilityDiff * 1.5);

  // Calculate final entanglement score
  const entanglementScore = entanglementBase * probabilityFactor * QUANTUM_UNCERTAINTY_FACTOR;

  return Math.min(1, Math.max(0, entanglementScore));
}

/**
 * Calculate a "reality anchoring" score for a timeline
 * Higher means more firmly anchored to our reality, lower means more ephemeral
 * @param {Object} timeline - Timeline to analyze
 * @returns {Number} Reality anchoring score (0-1)
 */
export function calculateRealityAnchoring(timeline) {
  if (!timeline) return 0;

  if (timeline.id === 'prime') {
    // Prime timeline is most anchored to reality
    return 0.95;
  }

  // For alternate timelines, anchoring depends on:
  // - Higher probability = more anchored
  // - Earlier divergence = less anchored
  // - Stability index = directly affects anchoring

  const probabilityFactor = timeline.probability || 0.5;

  // Earlier divergence point means less anchoring
  const divergenceDayFactor = timeline.divergencePoint
    ? Math.min(0.9, timeline.divergencePoint / 60)
    : 0.5;

  // Use stability index if available, otherwise estimate
  const stabilityFactor = timeline.stabilityIndex || 0.7;

  // Calculate anchoring score with weighted factors
  const anchoringScore = (
    (probabilityFactor * 0.4) +
    (divergenceDayFactor * 0.3) +
    (stabilityFactor * 0.3)
  );

  return Math.min(1, Math.max(0, anchoringScore));
}
