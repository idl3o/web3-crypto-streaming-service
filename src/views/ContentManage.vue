<template>
  <div class="content-manage">
    <div class="container py-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h1 class="h3">My Content</h1>
        <div class="d-flex gap-2">
          <div class="d-flex align-items-center me-2">
            <div class="input-group">
              <input type="text" class="form-control" placeholder="Search..."
                     v-model="searchQuery" @input="handleSearch">
              <button class="btn btn-outline-secondary" type="button">
                <i class="fas fa-search"></i>
              </button>
            </div>
          </div>
          <router-link to="/create" class="btn btn-primary">
            <i class="fas fa-plus me-1"></i> New Content
          </router-link>
        </div>
      </div>
      
      <!-- Success Alert -->
      <div v-if="showSuccess" class="alert alert-success alert-dismissible fade show" role="alert">
        <i class="fas fa-check-circle me-2"></i> Content successfully published!
        <button type="button" class="btn-close" @click="dismissSuccess"></button>
      </div>

      <!-- Content Stats Cards -->
      <div class="row g-4 mb-4">
        <div class="col-md-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex align-items-center mb-3">
                <div class="stat-icon bg-primary-subtle rounded-circle me-3">
                  <i class="fas fa-film text-primary"></i>
                </div>
                <h6 class="card-subtitle text-muted mb-0">Total Content</h6>
              </div>
              <h3 class="card-text fw-bold">{{ contentStats.total }}</h3>
              <p class="card-text text-muted mb-0">Videos, audio, and articles</p>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex align-items-center mb-3">
                <div class="stat-icon bg-success-subtle rounded-circle me-3">
                  <i class="fas fa-eye text-success"></i>
                </div>
                <h6 class="card-subtitle text-muted mb-0">Total Views</h6>
              </div>
              <h3 class="card-text fw-bold">{{ formatViews(contentStats.views) }}</h3>
              <p class="card-text text-success mb-0">+{{ contentStats.viewsGrowth }}% <small class="text-muted">from last week</small></p>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex align-items-center mb-3">
                <div class="stat-icon bg-info-subtle rounded-circle me-3">
                  <i class="fas fa-coins text-info"></i>
                </div>
                <h6 class="card-subtitle text-muted mb-0">Total Earned</h6>
              </div>
              <h3 class="card-text fw-bold">{{ contentStats.earned }} ETH</h3>
              <p class="card-text text-info mb-0">≈ ${{ contentStats.earnedUsd }} USD</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Content Tabs -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-header bg-white">
          <ul class="nav nav-tabs card-header-tabs">
            <li class="nav-item" v-for="tab in tabs" :key="tab.value">
              <a class="nav-link" :class="{ active: activeTab === tab.value }" href="#"
                 @click.prevent="activeTab = tab.value">
                {{ tab.label }} ({{ tab.count }})
              </a>
            </li>
          </ul>
        </div>
        <div class="card-body p-0">
          <!-- Loading State -->
          <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading content...</span>
            </div>
            <p class="mt-2 text-muted">Loading your content...</p>
          </div>
          
          <!-- Content List -->
          <div v-else class="content-list">
            <!-- Empty State -->
            <div v-if="filteredContent.length === 0" class="text-center py-5">
              <i class="fas fa-folder-open fa-3x text-muted mb-3"></i>
              <h5>No content found</h5>
              <p class="text-muted mb-4">
                {{ searchQuery ? 'Try a different search term' : 'You have not created any content yet' }}
              </p>
              <router-link to="/create" class="btn btn-primary">
                <i class="fas fa-plus me-1"></i> Create New Content
              </router-link>
            </div>
            
            <!-- Content Items -->
            <template v-else>
              <div v-for="item in filteredContent" :key="item.id" 
                   class="content-item p-3 border-bottom" 
                   :class="{ 'bg-light': item.status === 'draft' }">
                <div class="row align-items-center">
                  <div class="col-md-5">
                    <div class="d-flex align-items-center">
                      <div class="flex-shrink-0 me-3">
                        <img :src="item.thumbnail" alt="Thumbnail" width="120" height="68" class="rounded"
                             @error="handleImageError">
                      </div>
                      <div>
                        <h6 class="mb-1">
                          {{ item.title }}
                          <span v-if="item.status === 'draft'" class="badge bg-secondary">Draft</span>
                          <span v-if="item.isLive" class="badge bg-danger ms-1">LIVE</span>
                        </h6>
                        <div class="small text-muted">
                          <span class="me-2">
                            <i :class="`fas fa-${getContentTypeIcon(item.contentType)} me-1`"></i> 
                            {{ capitalizeFirstLetter(item.contentType) }}
                          </span>
                          <span>
                            <i class="fas fa-calendar me-1"></i> 
                            {{ formatDate(item.createdAt) }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-2 text-center">
                    <div v-if="item.status === 'published'" class="text-muted">{{ formatViews(item.views) }} views</div>
                    <div v-else class="text-muted">—</div>
                  </div>
                  <div class="col-md-2 text-center">
                    <div v-if="item.status === 'published'" class="text-success">{{ item.earned }} ETH earned</div>
                    <div v-else class="text-muted">—</div>
                  </div>
                  <div class="col-md-3 text-md-end mt-2 mt-md-0">
                    <router-link v-if="item.status === 'published'" 
                                :to="{ name: 'content-view', params: { id: item.id }}" 
                                class="btn btn-sm btn-outline-primary me-1">
                      <i class="fas fa-eye me-1"></i> View
                    </router-link>
                    <button class="btn btn-sm btn-outline-secondary me-1">
                      <i class="fas fa-edit me-1"></i> Edit
                    </button>
                    <button v-if="item.status === 'draft'" class="btn btn-sm btn-primary me-1">
                      <i class="fas fa-upload me-1"></i> Publish
                    </button>
                    <button class="btn btn-sm btn-outline-danger" @click="confirmDelete(item)">
                      <i class="fas fa-trash-alt"></i>
                    </button>
                  </div>
                </div>
              </div>
            </template>
            
            <!-- Pagination -->
            <div v-if="paginationInfo.totalPages > 1" class="d-flex justify-content-between align-items-center p-3">
              <div class="small text-muted">Showing {{ paginationInfo.showing }} of {{ paginationInfo.total }} items</div>
              <nav aria-label="Content pagination">
                <ul class="pagination pagination-sm mb-0">
                  <li class="page-item" :class="{ disabled: currentPage === 1 }">
                    <a class="page-link" href="#" @click.prevent="prevPage">Previous</a>
                  </li>
                  <li v-for="page in paginationInfo.totalPages" :key="page" 
                      class="page-item" :class="{ active: currentPage === page }">
                    <a class="page-link" href="#" @click.prevent="goToPage(page)">{{ page }}</a>
                  </li>
                  <li class="page-item" :class="{ disabled: currentPage === paginationInfo.totalPages }">
                    <a class="page-link" href="#" @click.prevent="nextPage">Next</a>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal fade show" style="display: block" tabindex="-1" aria-modal="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Confirm Deletion</h5>
            <button type="button" class="btn-close" @click="cancelDelete"></button>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to delete <strong>{{ itemToDelete?.title }}</strong>?</p>
            <p class="text-danger">This action cannot be undone.</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="cancelDelete">Cancel</button>
            <button type="button" class="btn btn-danger" @click="deleteContent">Delete</button>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useStreamingStore } from '@/stores/contentStreaming'
import { useWalletStore } from '@/stores/wallet'
import { create } from 'ipfs-http-client'

// IPFS client setup
const ipfs = create({ url: 'https://ipfs.infura.io:5001/api/v0' })

// Route
const route = useRoute()

// Stores
const streamingStore = useStreamingStore()
const walletStore = useWalletStore()

// State
const loading = ref(true)
const activeTab = ref('all')
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(5)
const content = ref([])
const showDeleteModal = ref(false)
const itemToDelete = ref(null)
const showSuccess = ref(false)

// Computed
const contentStats = computed(() => {
  const total = content.value.length
  const published = content.value.filter(item => item.status === 'published').length
  const views = content.value.reduce((sum, item) => sum + (item.views || 0), 0)
  const earned = content.value.reduce((sum, item) => sum + (parseFloat(item.earned) || 0), 0).toFixed(2)
  
  return {
    total,
    published,
    drafts: total - published,
    views,
    viewsGrowth: 12, // Mock data
    earned,
    earnedUsd: (parseFloat(earned) * 2000).toFixed(2) // Mock ETH to USD conversion
  }
})

const tabs = computed(() => [
  { label: 'All Content', value: 'all', count: content.value.length },
  { label: 'Published', value: 'published', count: content.value.filter(item => item.status === 'published').length },
  { label: 'Drafts', value: 'drafts', count: content.value.filter(item => item.status === 'draft').length },
  { label: 'Archived', value: 'archived', count: content.value.filter(item => item.status === 'archived').length }
])

const filteredContent = computed(() => {
  let result = [...content.value]
  
  // Filter by tab
  if (activeTab.value !== 'all') {
    result = result.filter(item => item.status === activeTab.value)
  }
  
  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    result = result.filter(item => 
      item.title.toLowerCase().includes(query) || 
      (item.description && item.description.toLowerCase().includes(query))
    )
  }
  
  // Apply pagination
  const startIndex = (currentPage.value - 1) * itemsPerPage.value
  const endIndex = startIndex + itemsPerPage.value
  return result.slice(startIndex, endIndex)
})

const paginationInfo = computed(() => {
  let filteredTotal = 0
  
  // Count total filtered items
  if (activeTab.value !== 'all') {
    filteredTotal = content.value.filter(item => item.status === activeTab.value).length
  } else {
    filteredTotal = content.value.length
  }
  
  // Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    filteredTotal = content.value.filter(item => 
      (item.status === activeTab.value || activeTab.value === 'all') &&
      (item.title.toLowerCase().includes(query) || 
      (item.description && item.description.toLowerCase().includes(query)))
    ).length
  }
  
  const totalPages = Math.max(1, Math.ceil(filteredTotal / itemsPerPage.value))
  const showing = Math.min(filteredContent.value.length, itemsPerPage.value)
  
  return {
    showing,
    total: filteredTotal,
    totalPages
  }
})

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
  if (currentPage.value < paginationInfo.value.totalPages) {
    currentPage.value++
  }
}

function goToPage(page) {
  currentPage.value = page
}

function formatViews(views) {
  if (!views) return '0'
  
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`
  } else if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K`
  }
  return views.toString()
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function getContentTypeIcon(type) {
  switch (type) {
    case 'video': return 'video'
    case 'audio': return 'music'
    case 'text': return 'file-alt'
    default: return 'file'
  }
}

function capitalizeFirstLetter(string) {
  if (!string) return ''
  return string.charAt(0).toUpperCase() + string.slice(1)
}

function handleImageError(event) {
  event.target.src = 'https://via.placeholder.com/120x68?text=Thumbnail'
}

function confirmDelete(item) {
  itemToDelete.value = item
  showDeleteModal.value = true
}

function cancelDelete() {
  showDeleteModal.value = false
  itemToDelete.value = null
}

async function deleteContent() {
  if (!itemToDelete.value) return
  
  try {
    // In a real app, this would call an API or blockchain function
    // For demo purposes, we'll just remove from local array
    content.value = content.value.filter(item => item.id !== itemToDelete.value.id)
    showDeleteModal.value = false
    itemToDelete.value = null
  } catch (error) {
    console.error('Failed to delete content:', error)
  }
}

function dismissSuccess() {
  showSuccess.value = false
}

async function fetchContentDetails(contentId) {
  try {
    // Fetch metadata from IPFS
    const metadata = await ipfs.cat(contentId)
    const metadataJson = JSON.parse(new TextDecoder().decode(metadata))
    console.log('Fetched metadata:', metadataJson)
    
    // Display metadata in the UI
    // ...existing code to update UI with metadata...
  } catch (error) {
    console.error('Error fetching content details:', error)
  }
}

// Lifecycle hooks
onMounted(async () => {
  // Check for published success message
  if (route.query.published === 'success') {
    showSuccess.value = true
  }

  try {
    // Initialize streaming store
    if (!streamingStore.isInitialized) {
      await streamingStore.initialize()
    }
    
    // Load creator content
    await streamingStore.fetchContentLibrary()
    
    // Get stats for the creator
    await streamingStore.getCreatorStats()
    
    // Set mock content for demo (in a real app, this would come from streamingStore)
    content.value = [
      {
        id: 'content-1',
        title: 'Web3 Development Tutorial Series: Episode 1',
        description: 'Learn how to build decentralized applications on Ethereum.',
        contentType: 'video',
        status: 'published',
        createdAt: Date.now() - 3600000, // 1 hour ago
        views: 1245,
        earned: '0.12',
        thumbnail: 'https://via.placeholder.com/120x68?text=Tutorial'
      },
      {
        id: 'content-2',
        title: 'Smart Contract Security Best Practices',
        description: 'Learn about common security vulnerabilities in smart contracts and how to avoid them.',
        contentType: 'video',
        status: 'published',
        createdAt: Date.now() - 7200000, // 2 hours ago
        views: 2381,
        earned: '0.23',
        thumbnail: 'https://via.placeholder.com/120x68?text=Security'
      },
      {
        id: 'content-3',
        title: 'Introduction to DeFi Protocols',
        description: 'A comprehensive guide to major DeFi protocols and how they work.',
        contentType: 'text',
        status: 'draft',
        createdAt: Date.now() - 86400000, // 1 day ago
        views: 0,
        earned: '0',
        thumbnail: 'https://via.placeholder.com/120x68?text=Draft'
      }
    ]
  } catch (error) {
    console.error('Error loading content:', error)
  } finally {
    loading.value = false
  }
})

// Watch for tab changes to reset pagination
watch(activeTab, () => {
  currentPage.value = 1
})
</script>

<style scoped>
.content-item:hover {
  background-color: #f8f9fa;
}

.stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.bg-primary-subtle {
  background-color: rgba(99, 102, 241, 0.1);
}

.bg-success-subtle {
  background-color: rgba(16, 185, 129, 0.1);
}

.bg-info-subtle {
  background-color: rgba(14, 165, 233, 0.1);
}

.modal-backdrop {
  opacity: 0.5;
}

.pagination {
  margin-bottom: 0;
}
</style>
