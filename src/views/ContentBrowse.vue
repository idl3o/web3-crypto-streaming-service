<template>
  <div class="content-browse">
    <div class="container py-4">
      <!-- Vision Section -->
      <div class="mb-4">
        <h1 class="h3">Explore the Future of Streaming</h1>
        <p class="text-muted">
          CryptoStream is redefining content streaming with decentralized ownership, transparent payments, and seamless user experiences. 
          Discover how Web3 technologies empower creators and consumers alike.
        </p>
      </div>
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h1 class="h3">Browse Content</h1>
        <router-link to="/create" class="btn btn-primary" v-if="isWalletConnected">
          <i class="fas fa-plus me-1"></i> Create Content
        </router-link>
      </div>

      <!-- Categories nav -->
      <nav class="nav nav-pills flex-nowrap mb-4 overflow-auto hide-scrollbar">
        <a 
          v-for="category in categories" 
          :key="category.id"
          class="nav-link me-2"
          :class="{ active: activeCategory === category.id }"
          href="#"
          @click.prevent="activeCategory = category.id"
        >
          <i :class="`fas fa-${category.icon} me-1`"></i> {{ category.name }}
        </a>
      </nav>

      <!-- Content browser component -->
      <ContentBrowser
        :title="categoryTitle"
        :filter="{ category: activeCategory }"
        :hasPagination="true"
        :itemsPerPage="12"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useWalletStore } from '@/stores/wallet'
import ContentBrowser from '@/components/content/ContentBrowser.vue'

// Stores
const walletStore = useWalletStore()

// State
const activeCategory = ref('all')
const categories = [
  { id: 'all', name: 'All Content', icon: 'layer-group' },
  { id: 'crypto', name: 'Cryptocurrency', icon: 'coins' },
  { id: 'blockchain', name: 'Blockchain', icon: 'link' },
  { id: 'defi', name: 'DeFi', icon: 'chart-line' },
  { id: 'nft', name: 'NFTs', icon: 'image' },
  { id: 'dao', name: 'DAOs', icon: 'users' },
  { id: 'web3', name: 'Web3', icon: 'globe' },
  { id: 'tutorials', name: 'Tutorials', icon: 'graduation-cap' }
]

// Computed
const isWalletConnected = computed(() => walletStore.isConnected)
const categoryTitle = computed(() => {
  const category = categories.find(c => c.id === activeCategory.value)
  return category ? category.name : 'All Content'
})
</script>

<style scoped>
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.hide-scrollbar::-webkit-scrollbar {
  display: none;
}

.nav-pills .nav-link {
  border-radius: 50px;
  padding: 0.5rem 1rem;
  white-space: nowrap;
}

.nav-pills .nav-link.active {
  background-color: var(--primary);
}
</style>
