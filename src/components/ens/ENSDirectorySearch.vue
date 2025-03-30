<template>
  <div class="ens-directory-search">
    <div class="search-header">
      <h3>ENS Directory Search</h3>
      <p class="search-description">
        Find ENS names by searching the ENS directory
      </p>
    </div>

    <div class="search-controls">
      <div class="search-input-wrapper">
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Search ENS names (min 3 characters)"
          @input="debouncedSearch"
          @keyup.enter="performSearch"
          :disabled="isLoading"
        />
        <div class="search-icon" :class="{ 'loading': isLoading }">
          <span v-if="isLoading" class="loading-indicator"></span>
          <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
            <path d="M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm-8 6a8 8 0 1 1 16 0c0 1.849-.627 3.551-1.68 4.906l5.385 5.385a1 1 0 0 1-1.414 1.414l-5.385-5.385A7.964 7.964 0 0 1 10 18a8 8 0 0 1-8-8z" fill="currentColor"/>
          </svg>
        </div>
      </div>
      
      <div class="search-filters">
        <label class="filter-label">Search in:</label>
        <select v-model="selectedSource" class="source-select">
          <option value="all">All Sources</option>
          <option value="etherscan">Etherscan</option>
          <option value="openprofile">OpenProfile</option>
        </select>
      </div>
    </div>

    <div v-if="error" class="search-error">
      <p>{{ error }}</p>
    </div>

    <div class="search-results" v-if="searchResults.length > 0">
      <div class="result-count">{{ searchResults.length }} ENS names found</div>
      <div class="result-list">
        <div 
          v-for="result in searchResults" 
          :key="result.name" 
          class="result-item"
          @click="selectResult(result)"
        >
          <div class="result-name">{{ result.name }}</div>
          <div class="result-address">{{ formatAddress(result.address) }}</div>
        </div>
      </div>
    </div>

    <div v-else-if="hasSearched && !isLoading" class="no-results">
      <p>No ENS names found matching your search</p>
    </div>

    <div class="search-footer">
      <a href="https://etherscan.io/name-lookup" target="_blank" rel="noopener noreferrer" class="footer-link">
        Etherscan Name Lookup
      </a>
      <span class="separator">•</span>
      <a href="https://app.ens.domains" target="_blank" rel="noopener noreferrer" class="footer-link">
        ENS App
      </a>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { ensService, ENSDirectorySource, ENSSearchResult } from '../../services/ENSService';

export default defineComponent({
  name: 'ENSDirectorySearch',
  
  props: {
    initialQuery: {
      type: String,
      default: ''
    },
    maxResults: {
      type: Number,
      default: 20
    }
  },
  
  emits: ['result-selected'],
  
  setup(props, { emit }) {
    const searchQuery = ref(props.initialQuery);
    const searchResults = ref<ENSSearchResult[]>([]);
    const isLoading = ref(false);
    const error = ref<string | null>(null);
    const hasSearched = ref(false);
    const selectedSource = ref<ENSDirectorySource>(ENSDirectorySource.ALL);
    
    const isEnsInitialized = computed(() => ensService.initialized);
    
    let searchTimeout: number | null = null;
    
    const debouncedSearch = () => {
      // Clear previous timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      
      // Set new timeout
      searchTimeout = window.setTimeout(() => {
        if (searchQuery.value.length >= 3) {
          performSearch();
        }
      }, 500);
    };
    
    const performSearch = async () => {
      if (searchQuery.value.length < 3) {
        error.value = 'Search query must be at least 3 characters long';
        searchResults.value = [];
        return;
      }
      
      if (!isEnsInitialized.value) {
        error.value = 'ENS service is not initialized';
        return;
      }
      
      error.value = null;
      isLoading.value = true;
      
      try {
        const results = await ensService.searchDirectory(
          searchQuery.value,
          selectedSource.value,
          props.maxResults
        );
        
        searchResults.value = results;
        hasSearched.value = true;
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'An error occurred during search';
        searchResults.value = [];
      } finally {
        isLoading.value = false;
      }
    };
    
    const selectResult = (result: ENSSearchResult) => {
      emit('result-selected', result);
    };
    
    const formatAddress = (address: string): string => {
      if (!address) return '';
      return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    };
    
    return {
      searchQuery,
      searchResults,
      isLoading,
      error,
      hasSearched,
      selectedSource,
      performSearch,
      debouncedSearch,
      selectResult,
      formatAddress
    };
  }
});
</script>

<style scoped>
.ens-directory-search {
  background-color: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  max-width: 600px;
  margin: 0 auto;
}

.search-header {
  margin-bottom: 1.5rem;
}

.search-header h3 {
  margin: 0 0 0.5rem;
  color: #333;
}

.search-description {
  color: #666;
  margin: 0;
  font-size: 0.9rem;
}

.search-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.search-input-wrapper {
  position: relative;
  width: 100%;
}

.search-input-wrapper input {
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
}

.search-input-wrapper input:focus {
  border-color: #5284FF;
  box-shadow: 0 0 0 2px rgba(82, 132, 255, 0.2);
}

.search-icon {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-filters {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.filter-label {
  color: #666;
  font-size: 0.9rem;
}

.source-select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  color: #333;
  flex-grow: 1;
  font-size: 0.9rem;
}

.search-error {
  background-color: #fee2e2;
  color: #ef4444;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}

.search-error p {
  margin: 0;
}

.search-results {
  margin-top: 1rem;
}

.result-count {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}

.result-list {
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
}

.result-item {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  transition: background-color 0.2s;
}

.result-item:last-child {
  border-bottom: none;
}

.result-item:hover {
  background-color: #f9fafb;
}

.result-name {
  color: #5284FF;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.result-address {
  color: #666;
  font-size: 0.85rem;
  font-family: monospace;
}

.no-results {
  text-align: center;
  padding: 2rem 0;
  color: #666;
}

.search-footer {
  margin-top: 1.5rem;
  text-align: center;
  color: #666;
  font-size: 0.85rem;
}

.footer-link {
  color: #5284FF;
  text-decoration: none;
  transition: color 0.2s;
}

.footer-link:hover {
  color: #3b5998;
  text-decoration: underline;
}

.separator {
  margin: 0 0.5rem;
  color: #ccc;
}

.loading-indicator {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(82, 132, 255, 0.3);
  border-radius: 50%;
  border-top-color: #5284FF;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
