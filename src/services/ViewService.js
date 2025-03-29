/**
 * View Service
 * 
 * Manages content viewing modes, layouts, and user preferences
 * for the Web3 Crypto Streaming Service platform.
 */

// View mode constants
export const VIEW_MODE = {
  GRID: 'grid',           // Grid of content cards
  LIST: 'list',           // Vertical list of content items
  THEATER: 'theater',     // Large content player with minimal UI
  IMMERSIVE: 'immersive', // Full-screen immersive experience
  HOLOGRAM: 'hologram',   // 3D holographic display mode
  GALLERY: 'gallery',     // Image gallery style
  COMPACT: 'compact'      // Compact view for mobile/limited space
};

// Content layout constants
export const LAYOUT = {
  RESPONSIVE: 'responsive', // Adapts to screen size
  FIXED: 'fixed',           // Fixed size elements
  FLUID: 'fluid',           // Fluid width elements
  MASONRY: 'masonry',       // Pinterest-style masonry layout
  TIMELINE: 'timeline'      // Chronological timeline layout
};

// Service state
let initialized = false;
let serviceConfig = {
  defaultViewMode: VIEW_MODE.GRID,
  defaultLayout: LAYOUT.RESPONSIVE,
  rememberUserPreferences: true,
  enableImmersiveMode: true,
  enableHologramMode: true,
  transitionAnimations: true,
  cardAspectRatio: '16:9',
  gridColumns: {
    xs: 1,  // Extra small screens
    sm: 2,  // Small screens
    md: 3,  // Medium screens
    lg: 4,  // Large screens
    xl: 6   // Extra large screens
  },
  gridGap: '1rem',
  preloadNextContent: true,
  useVirtualScrolling: true  // For performance with large content lists
};

// User preferences
let userPreferences = {
  viewMode: null,
  layout: null,
  gridColumns: null,
  cardSize: 'medium',
  showDetails: true,
  showThumbnails: true,
  autoplay: false,
  preferredContent: []
};

/**
 * Initialize the View Service
 * @param {Object} options Configuration options
 * @returns {Promise<boolean>} Success status
 */
export async function initialize(options = {}) {
  if (initialized) {
    return true;
  }
  
  try {
    console.log('Initializing View Service...');
    
    // Apply configuration options
    if (options.config) {
      serviceConfig = {
        ...serviceConfig,
        ...options.config
      };
    }
    
    // Load user preferences from localStorage if available
    if (serviceConfig.rememberUserPreferences) {
      await _loadUserPreferences();
    }
    
    initialized = true;
    console.log('View Service initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize View Service:', error);
    return false;
  }
}

/**
 * Load user preferences from localStorage
 * @private
 * @returns {Promise<void>}
 */
async function _loadUserPreferences() {
  try {
    const savedPrefs = localStorage.getItem('viewPreferences');
    if (savedPrefs) {
      const parsedPrefs = JSON.parse(savedPrefs);
      userPreferences = {
        ...userPreferences,
        ...parsedPrefs
      };
      console.log('Loaded user view preferences');
    }
  } catch (error) {
    console.error('Error loading user preferences:', error);
    // Continue with defaults
  }
}

/**
 * Save user preferences to localStorage
 * @private
 */
function _saveUserPreferences() {
  if (!serviceConfig.rememberUserPreferences) return;
  
  try {
    localStorage.setItem('viewPreferences', JSON.stringify(userPreferences));
  } catch (error) {
    console.error('Error saving user preferences:', error);
  }
}

/**
 * Get current view mode
 * @returns {string} Current view mode
 */
export function getViewMode() {
  return userPreferences.viewMode || serviceConfig.defaultViewMode;
}

/**
 * Set view mode
 * @param {string} mode View mode to set
 * @returns {boolean} Success status
 */
export function setViewMode(mode) {
  if (!Object.values(VIEW_MODE).includes(mode)) {
    console.warn(`Invalid view mode: ${mode}`);
    return false;
  }
  
  // Don't set immersive mode if not enabled
  if (mode === VIEW_MODE.IMMERSIVE && !serviceConfig.enableImmersiveMode) {
    console.warn('Immersive mode is not enabled');
    return false;
  }
  
  // Don't set hologram mode if not enabled
  if (mode === VIEW_MODE.HOLOGRAM && !serviceConfig.enableHologramMode) {
    console.warn('Hologram mode is not enabled');
    return false;
  }
  
  userPreferences.viewMode = mode;
  _saveUserPreferences();
  return true;
}

/**
 * Get current layout
 * @returns {string} Current layout
 */
export function getLayout() {
  return userPreferences.layout || serviceConfig.defaultLayout;
}

/**
 * Set layout
 * @param {string} layout Layout to set
 * @returns {boolean} Success status
 */
export function setLayout(layout) {
  if (!Object.values(LAYOUT).includes(layout)) {
    console.warn(`Invalid layout: ${layout}`);
    return false;
  }
  
  userPreferences.layout = layout;
  _saveUserPreferences();
  return true;
}

/**
 * Get number of grid columns for current screen size
 * @param {string} screenSize Screen size (xs, sm, md, lg, xl)
 * @returns {number} Number of columns
 */
export function getGridColumns(screenSize) {
  if (userPreferences.gridColumns && userPreferences.gridColumns[screenSize]) {
    return userPreferences.gridColumns[screenSize];
  }
  return serviceConfig.gridColumns[screenSize] || 1;
}

/**
 * Set grid columns for given screen size
 * @param {string} screenSize Screen size (xs, sm, md, lg, xl)
 * @param {number} columns Number of columns
 * @returns {boolean} Success status
 */
export function setGridColumns(screenSize, columns) {
  if (!serviceConfig.gridColumns.hasOwnProperty(screenSize)) {
    console.warn(`Invalid screen size: ${screenSize}`);
    return false;
  }
  
  if (!userPreferences.gridColumns) {
    userPreferences.gridColumns = {};
  }
  
  userPreferences.gridColumns[screenSize] = columns;
  _saveUserPreferences();
  return true;
}

/**
 * Get card size preference
 * @returns {string} Card size preference
 */
export function getCardSize() {
  return userPreferences.cardSize || 'medium';
}

/**
 * Set card size preference
 * @param {string} size Card size
 * @returns {boolean} Success status
 */
export function setCardSize(size) {
  if (!['small', 'medium', 'large'].includes(size)) {
    console.warn(`Invalid card size: ${size}`);
    return false;
  }
  
  userPreferences.cardSize = size;
  _saveUserPreferences();
  return true;
}

/**
 * Get all user preferences
 * @returns {Object} User preferences
 */
export function getUserPreferences() {
  return { ...userPreferences };
}

/**
 * Update user preferences
 * @param {Object} preferences New preferences
 * @returns {Object} Updated preferences
 */
export function updateUserPreferences(preferences = {}) {
  userPreferences = {
    ...userPreferences,
    ...preferences
  };
  
  _saveUserPreferences();
  return { ...userPreferences };
}

/**
 * Reset user preferences to defaults
 * @returns {Object} Default preferences
 */
export function resetUserPreferences() {
  userPreferences = {
    viewMode: serviceConfig.defaultViewMode,
    layout: serviceConfig.defaultLayout,
    gridColumns: null,
    cardSize: 'medium',
    showDetails: true,
    showThumbnails: true,
    autoplay: false,
    preferredContent: []
  };
  
  _saveUserPreferences();
  return { ...userPreferences };
}

/**
 * Add content to preferred content list
 * @param {string} contentId Content ID
 * @returns {boolean} Success status
 */
export function addPreferredContent(contentId) {
  if (!contentId) return false;
  
  if (!userPreferences.preferredContent.includes(contentId)) {
    userPreferences.preferredContent.push(contentId);
    _saveUserPreferences();
  }
  
  return true;
}

/**
 * Remove content from preferred content list
 * @param {string} contentId Content ID
 * @returns {boolean} Success status
 */
export function removePreferredContent(contentId) {
  const index = userPreferences.preferredContent.indexOf(contentId);
  
  if (index !== -1) {
    userPreferences.preferredContent.splice(index, 1);
    _saveUserPreferences();
    return true;
  }
  
  return false;
}

/**
 * Check if content is in preferred content list
 * @param {string} contentId Content ID
 * @returns {boolean} Whether content is preferred
 */
export function isPreferredContent(contentId) {
  return userPreferences.preferredContent.includes(contentId);
}

/**
 * Get service configuration
 * @returns {Object} Current configuration
 */
export function getConfiguration() {
  return { ...serviceConfig };
}

/**
 * Update service configuration
 * @param {Object} newConfig New configuration
 * @returns {Object} Updated configuration
 */
export function updateConfiguration(newConfig = {}) {
  serviceConfig = {
    ...serviceConfig,
    ...newConfig
  };
  
  return { ...serviceConfig };
}

export default {
  initialize,
  getViewMode,
  setViewMode,
  getLayout,
  setLayout,
  getGridColumns,
  setGridColumns,
  getCardSize,
  setCardSize,
  getUserPreferences,
  updateUserPreferences,
  resetUserPreferences,
  addPreferredContent,
  removePreferredContent,
  isPreferredContent,
  getConfiguration,
  updateConfiguration,
  VIEW_MODE,
  LAYOUT
};
