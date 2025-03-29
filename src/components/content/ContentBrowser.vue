<template>
  <div class="content-browser">
    <!-- Content filters and search -->
    <div class="mb-4">
      <div class="row g-3 align-items-center">
        <div class="col-md-6">
          <h3 class="mb-0">{{ title }}</h3>
        </div>
        <div class="col-md-6">
          <!-- NEW: Improved search experience -->
          <div class="search-container">
            <div class="input-group">
              <input 
                type="text" 
                class="form-control" 
                placeholder="Search content..." 
                v-model="searchQuery" 
                @input="handleSearch"
                @focus="showSearchSuggestions = true"
              >
              <button class="btn btn-outline-secondary" type="button" @click="executeSearch">
                <i class="fas fa-search"></i>
              </button>
              <button class="btn btn-outline-secondary dropdown-toggle" type="button" 
                    data-bs-toggle="dropdown" aria-expanded="false">
                <i class="fas fa-filter"></i>
              </button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li><h6 class="dropdown-header">Sort By</h6></li>
                <li>
                  <a class="dropdown-item" href="#" @click.prevent="sortBy = 'newest'">
                    <i class="fas fa-calendar-alt me-2"></i> Newest
                  </a>
                </li>
                <li>
                  <a class="dropdown-item" href="#" @click.prevent="sortBy = 'popular'">
                    <i class="fas fa-fire me-2"></i> Most Popular
                  </a>
                </li>
                <li><hr class="dropdown-divider"></li>
                <li><h6 class="dropdown-header">Content Type</h6></li>
                <li>
                  <a class="dropdown-item" href="#" @click.prevent="filterType = 'all'">
                    <i class="fas fa-layer-group me-2"></i> All Types
                  </a>
                </li>
                <li>
                  <a class="dropdown-item" href="#" @click.prevent="filterType = 'video'">
                    <i class="fas fa-video me-2"></i> Videos
                  </a>
                </li>
                <li>
                  <a class="dropdown-item" href="#" @click.prevent="filterType = 'audio'">
                    <i class="fas fa-music me-2"></i> Audio
                  </a>
                </li>
                <li>
                  <a class="dropdown-item" href="#" @click.prevent="filterType = 'text'">
                    <i class="fas fa-file-alt me-2"></i> Articles
                  </a>
                </li>
              </ul>
            </div>
            
            <!-- Search suggestions dropdown -->
            <div v-if="showSearchSuggestions && searchQuery" class="search-suggestions card">
              <div class="list-group list-group-flush">
                <button 
                  v-for="suggestion in searchSuggestions" 
                  :key="suggestion" 
                  class="list-group-item list-group-item-action" 
                  @click="selectSearchSuggestion(suggestion)"
                >
                  <i class="fas fa-search me-2 text-muted"></i>{{ suggestion }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- NEW: Quick filters -->
    <div class="quick-filters mb-4">
      <div class="d-flex flex-wrap gap-2">
        <button 
          class="btn" 
          :class="activeQuickFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'" 
          @click="setQuickFilter('all')"
        >
          All Content
        </button>
        <button 
          class="btn" 
          :class="activeQuickFilter === 'trending' ? 'btn-primary' : 'btn-outline-primary'"
          @click="setQuickFilter('trending')"
        >
          <i class="fas fa-fire me-1"></i> Trending
        </button>
        <button 
          class="btn" 
          :class="activeQuickFilter === 'free' ? 'btn-primary' : 'btn-outline-primary'"
          @click="setQuickFilter('free')"
        >
          <i class="fas fa-gift me-1"></i> Free Content
        </button>
        <button 
          class="btn" 
          :class="activeQuickFilter === 'new' ? 'btn-primary' : 'btn-outline-primary'"
          @click="setQuickFilter('new')"
        >
          <i class="fas fa-clock me-1"></i> New Releases
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-3 text-muted">Loading content...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="alert alert-danger">
      <i class="fas fa-exclamation-triangle me-2"></i> {{ error }}
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredContent.length === 0" class="text-center py-5 bg-light rounded">
      <i class="fas fa-search fa-3x text-muted mb-3"></i>
      <h4>No content found</h4>
      <p class="text-muted">
        {{ searchQuery ? 'Try a different search term' : 'There is no content available at the moment' }}
      </p>
    </div>

    <!-- Content Grid -->
    <div v-else>
      <!-- NEW: Featured content carousel (if available) -->
      <div v-if="hasFeaturedContent" class="featured-content mb-4">
        <h4 class="mb-3 fs-5">Featured Content</h4>
        <div class="featured-carousel">
          <div class="position-relative">
            <button class="carousel-control-prev" @click="prevFeatured">
              <i class="fas fa-chevron-left"></i>
            </button>
            
            <div class="featured-items" ref="featuredItems">
              <div 
                v-for="(item, index) in featuredContent" 
                :key="item.id" 
                class="featured-item" 
                :class="{ 'active': featuredIndex === index }"
              >
                <div class="card border-0 shadow-sm h-100">
                  <div class="row g-0">
                    <div class="col-md-6">
                      <div class="position-relative">
                        <img :src="item.thumbnail" :alt="item.title" class="featured-thumbnail" @error="handleImageError">
                        <span v-if="isLive(item)" class="position-absolute top-0 start-0 bg-danger text-white small p-1 rounded m-2">
                          <i class="fas fa-broadcast-tower me-1"></i> LIVE
                        </span>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="card-body d-flex flex-column h-100">
                        <div>
                          <span class="badge bg-primary mb-2">Featured</span>
                          <h5 class="card-title">{{ item.title }}</h5>
                          <p class="card-text">{{ item.description }}</p>
                        </div>
                        
                        <div class="mt-auto">
                          <div class="d-flex align-items-center mb-3">
                            <img :src="getCreatorAvatar(item)" class="rounded-circle me-2" width="24" height="24" @error="handleAvatarError">
                            <small>{{ item.creator }}</small>
                          </div>
                          
                          <router-link :to="{ name: 'content-view', params: { id: item.id }}" class="btn btn-primary">
                            Watch Now
                          </router-link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <button class="carousel-control-next" @click="nextFeatured">
              <i class="fas fa-chevron-right"></i>
            </button>
            
            <div class="carousel-indicators">
              <button 
                v-for="(item, index) in featuredContent" 
                :key="index" 
                class="carousel-indicator"
                :class="{ 'active': featuredIndex === index }"
                @click="featuredIndex = index"
              ></button>
            </div>
          </div>
        </div>
      </div>
    
      <!-- Regular content grid -->
      <div class="row g-4">
        <!-- NEW: Add recently viewed section if available -->
        <div v-if="hasRecentlyViewed" class="col-12 mb-2">
          <h4 class="h5 mb-3">Continue Watching</h4>
          <div class="d-flex overflow-auto hide-scrollbar pb-2">
            <div v-for="item in recentlyViewed" :key="item.id" class="recent-item me-3">
              <div class="card content-card border-0 shadow-sm">
                <div class="position-relative">
                  <img :src="item.thumbnail" :alt="item.title" class="recent-thumbnail" @error="handleImageError">
                  <!-- Progress bar -->
                  <div class="progress position-absolute bottom-0 w-100" style="height: 3px;">
                    <div class="progress-bar bg-primary" :style="{ width: item.progress + '%' }"></div>
                  </div>
                </div>
                <div class="card-body p-2">
                  <h6 class="card-title small mb-0">{{ truncateTitle(item.title) }}</h6>
                </div>
                <div class="card-footer bg-white border-0 pt-0 pb-2 px-2">
                  <router-link :to="{ name: 'content-view', params: { id: item.id }}" class="btn btn-sm btn-outline-primary w-100">
                    Continue
                  </router-link>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Main content items -->
        <div v-for="item in filteredContent" :key="item.id" class="col-sm-6 col-md-4 col-xl-3">
          <!-- ...existing content card code... -->
          <div class="card content-card h-100 border-0 shadow-sm">
            <!-- Thumbnail -->
            <div class="position-relative">
              <img :src="item.thumbnail" :alt="item.title" class="content-thumbnail card-img-top" 
                   @error="handleImageError">
              <span v-if="item.contentType === 'video'" class="position-absolute bottom-0 end-0 bg-dark text-white small p-1 rounded m-2">
                10:30
              </span>
              <span v-if="isLive(item)" class="position-absolute top-0 start-0 bg-danger text-white small p-1 rounded m-2">
                <i class="fas fa-broadcast-tower me-1"></i> LIVE
              </span>
            </div>
            
            <!-- Content Info -->
            <div class="card-body">
              <h5 class="card-title fs-6">{{ item.title }}</h5>
              <div class="d-flex align-items-center mb-2">
                <img :src="getCreatorAvatar(item)" class="rounded-circle me-2" width="24" height="24" 
                     @error="handleAvatarError">
                <small class="text-muted">{{ item.creator }}</small>
              </div>
              <div class="d-flex justify-content-between align-items-center text-muted small">
                <span><i class="fas fa-eye me-1"></i> {{ formatViews(getViewCount(item)) }}</span>
                <span>{{ formatDate(item.createdAt) }}</span>
              </div>
            </div>
            
            <!-- NEW: Enhanced content card footer with clearer pricing -->
            <div class="card-footer bg-white border-0 pt-0">
              <div class="pricing-info text-center small mb-2">
                <span v-if="item.paymentRate > 0" class="text-muted">
                  {{ formatRate(item.paymentRate) }}/min
                </span>
                <span v-else class="badge bg-success">Free</span>
              </div>
              
              <router-link :to="{ name: 'content-view', params: { id: item.id }}" class="btn btn-primary btn-sm w-100">
                {{ item.paymentRate ? 'Watch Now' : 'Watch Free' }}
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Pagination -->
    <div v-if="hasPagination && filteredContent.length > 0" class="d-flex justify-content-center mt-4">
      <nav aria-label="Content pagination">
        <ul class="pagination">
          <li class="page-item" :class="{ disabled: currentPage === 1 }">
            <a class="page-link" href="#" @click.prevent="prevPage">Previous</a>
          </li>
          <li v-for="page in pageCount" :key="page" class="page-item" :class="{ active: page === currentPage }">
            <a class="page-link" href="#" @click.prevent="currentPage = page">{{ page }}</a>
          </li>
          <li class="page-item" :class="{ disabled: currentPage === pageCount }">
            <a class="page-link" href="#" @click.prevent="nextPage">Next</a>
          </li>
        </ul>
      </nav>
    </div>
    
    <!-- NEW: One-click wallet connect banner for viewers -->
    <div v-if="!isWalletConnected && filteredContent.length > 0" class="wallet-connect-banner mt-4 p-3 rounded text-center">
      <h5>Ready to start watching?</h5>
      <p>Connect your wallet once to access all premium content.</p>
      <button class="btn btn-primary" @click="connectWallet">
        <i class="fas fa-wallet me-2"></i> Quick Connect
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { useStreamingStore } from '@/stores/contentStreaming'
import { useWalletStore } from '@/stores/wallet'

const props = defineProps({
  title: {
    type: String,
    default: 'Browse Content'
  },
  filter: {
    type: Object,
    default: () => ({})
  },
  creatorOnly: {
    type: Boolean,
    default: false
  },
  hasPagination: {
    type: Boolean,
    default: true
  },
  itemsPerPage: {
    type: Number,
    default: 8
  }
})

// Store
const streamingStore = useStreamingStore()

// Local state
const searchQuery = ref('')
const sortBy = ref('newest')
const filterType = ref('all')
const currentPage = ref(1)
const loading = ref(true)
const error = ref(null)

// New state refs
const activeQuickFilter = ref('all')
const showSearchSuggestions = ref(false)
const featuredContent = ref([])
const featuredIndex = ref(0)
const recentlyViewed = ref([])
const featuredItems = ref(null)
const walletStore = useWalletStore()
const isWalletConnected = computed(() => walletStore.isConnected)

// Computed properties
const filteredContent = computed(() => {
  let content = [...streamingStore.contentLibrary]
  
  // Apply creator filter if needed
  if (props.creatorOnly && props.filter.creatorAddress) {
    content = content.filter(item => item.creatorAddress === props.filter.creatorAddress)
  }
  
  // Apply search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    content = content.filter(item => 
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      (item.tags && item.tags.some(tag => tag.toLowerCase().includes(query)))
    )
  }
  
  // Apply content type filter
  if (filterType.value !== 'all') {
    content = content.filter(item => item.contentType === filterType.value)
  }
  
  // Apply sorting
  if (sortBy.value === 'newest') {
    content = content.sort((a, b) => b.createdAt - a.createdAt)
  } else if (sortBy.value === 'popular') {
    content = content.sort((a, b) => getViewCount(b) - getViewCount(a))
  }
  
  // Apply pagination if enabled
  if (props.hasPagination) {
    const start = (currentPage.value - 1) * props.itemsPerPage
    return content.slice(start, start + props.itemsPerPage)
  }
  
  return content
})

const pageCount = computed(() => {
  const contentLength = streamingStore.contentLibrary.length
  return Math.ceil(contentLength / props.itemsPerPage) || 1
})

// Search suggestions system
const searchSuggestions = computed(() => {
  if (!searchQuery.value) return []
  
  // Generate search suggestions based on available tags in content library
  const allTags = new Set()
  streamingStore.contentLibrary.forEach(item => {
    if (item.tags) {
      item.tags.forEach(tag => allTags.add(tag))
    }
  })
  
  // Filter tags that match the query
  return Array.from(allTags)
    .filter(tag => tag.toLowerCase().includes(searchQuery.value.toLowerCase()))
    .slice(0, 5) // Limit to 5 suggestions
})

// Get featured content
const hasFeaturedContent = computed(() => featuredContent.value.length > 0)

// Get recently viewed content
const hasRecentlyViewed = computed(() => recentlyViewed.value.length > 0)

// Methods
function handleSearch() {
  // Reset to first page when searching
  currentPage.value = 1
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

function nextPage() {
  if (currentPage.value < pageCount.value) {
    currentPage.value++
  }
}

function formatViews(views) {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`
  } else if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K`
  }
  return views
}

function formatDate(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  
  if (diffDay > 30) {
    return date.toLocaleDateString()
  } else if (diffDay >= 1) {
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`
  } else if (diffHour >= 1) {
    return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`
  } else if (diffMin >= 1) {
    return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`
  } else {
    return 'Just now'
  }
}

function getViewCount(item) {
  // Simulating view counts for the demo
  return Math.floor(Math.random() * 10000)
}

function isLive(item) {
  // Example logic to determine if content is live streaming
  return item.isLive || false
}

function getCreatorAvatar(item) {
  return item.creatorAvatar || 'https://via.placeholder.com/40?text=C'
}

function handleImageError(event) {
  event.target.src = 'https://via.placeholder.com/320x180?text=Content'
}

function handleAvatarError(event) {
  event.target.src = 'https://via.placeholder.com/40?text=User'
}

// New methods
function setQuickFilter(filter) {
  activeQuickFilter.value = filter
  
  // Apply appropriate filters based on the quick filter
  switch(filter) {
    case 'trending':
      sortBy.value = 'popular'
      break
    case 'new':
      sortBy.value = 'newest'
      break
    case 'free':
      // Custom filtering for free content would be implemented here
      break
    default:
      sortBy.value = 'newest'
  }
}

function selectSearchSuggestion(suggestion) {
  searchQuery.value = suggestion
  showSearchSuggestions.value = false
  handleSearch()
}

function executeSearch() {
  showSearchSuggestions.value = false
  // Additional search logic can be implemented here
}

function prevFeatured() {
  featuredIndex.value = featuredIndex.value === 0 ? featuredContent.value.length - 1 : featuredIndex.value - 1
}

function nextFeatured() {
  featuredIndex.value = (featuredIndex.value + 1) % featuredContent.value.length
}

function truncateTitle(title) {
  return title.length > 30 ? title.substring(0, 30) + '...' : title
}

function formatRate(rate) {
  return `${rate} ETH`
}

function connectWallet() {
  walletStore.connectWallet()
}

// Fetch content on component mount
onMounted(async () => {
  loading.value = true
  error.value = null
  
  try {
    // Initialize the streaming store if needed
    if (!streamingStore.isInitialized) {
      await streamingStore.initialize()
    }
    
    // Fetch content library
    await streamingStore.fetchContentLibrary()
  } catch (err) {
    console.error('Error loading content:', err)
    error.value = 'Failed to load content. Please try again later.'
  } finally {
    loading.value = false
  }
  
  // Click outside listener for search suggestions
  document.addEventListener('click', handleClickOutside)
  
  // Initialize featured content
  if (streamingStore.contentLibrary.length > 0) {
    // In a real app, we'd get featured content from the API
    // Here we'll simulate by taking the first 3 items
    featuredContent.value = streamingStore.contentLibrary.slice(0, 3)
  }
  
  // Initialize recently viewed content
  try {
    // In a real app, we'd get this from local storage or user profile
    // Here we'll simulate with random items
    const randomItems = [...streamingStore.contentLibrary]
      .sort(() => 0.5 - Math.random())
      .slice(0, 4)
      .map(item => ({
        ...item,
        progress: Math.floor(Math.random() * 80) // Random progress percentage
      }))
      
    recentlyViewed.value = randomItems
  } catch (err) {
    console.error('Error loading recently viewed content:', err)
  }
})

// Reset pagination when filter changes
watch([sortBy, filterType], () => {
  currentPage.value = 1
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Handle clicks outside the search box
function handleClickOutside(event) {
  if (showSearchSuggestions.value) {
    const searchContainer = document.querySelector('.search-container')
    if (searchContainer && !searchContainer.contains(event.target)) {
      showSearchSuggestions.value = false
    }
  }
}
</script>

<style scoped>
.content-card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  overflow: hidden;
}

.content-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1) !important;
}

.content-thumbnail {
  height: 180px;
  object-fit: cover;
  background-color: #f0f0f0;
}

.card-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  height: 3em;
}

.pagination {
  margin-bottom: 0;
}

/* New styles */
.search-container {
  position: relative;
}

.search-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 10;
  margin-top: 5px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}

.featured-carousel {
  position: relative;
  margin-bottom: 30px;
}

.featured-items {
  overflow: hidden;
}

.featured-item {
  display: none;
}

.featured-item.active {
  display: block;
}

.featured-thumbnail {
  width: 100%;
  height: 250px;
  object-fit: cover;
}

.carousel-control-prev,
.carousel-control-next {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255,255,255,0.8);
  border: none;
  color: #000;
  font-size: 1rem;
  z-index: 2;
  cursor: pointer;
}

.carousel-control-prev {
  left: -20px;
}

.carousel-control-next {
  right: -20px;
}

.carousel-indicators {
  position: absolute;
  bottom: -25px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 8px;
}

.carousel-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ccc;
  border: none;
  padding: 0;
  cursor: pointer;
}

.carousel-indicator.active {
  background: #6366f1;
}

.recent-thumbnail {
  height: 100px;
  object-fit: cover;
  width: 100%;
}

.recent-item {
  width: 180px;
  flex-shrink: 0;
}

.wallet-connect-banner {
  background-color: #f0f7ff;
  border: 1px solid #dee2e6;
}

.quick-filters {
  overflow-x: auto;
  white-space: nowrap;
  padding-bottom: 5px;
}

.hide-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.hide-scrollbar::-webkit-scrollbar {
  display: none;
}

.pricing-info {
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
