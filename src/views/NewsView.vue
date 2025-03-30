<template>
  <div class="news-view">
    <div class="news-header">
      <h1>Cryptocurrency News</h1>
      <p class="news-subtitle">Stay up-to-date with the latest developments in the cryptocurrency world</p>
    </div>
    
    <div class="news-content">
      <div class="main-content">
        <CryptoNewsWidget 
          title="Latest Crypto News" 
          :initialArticleCount="10"
          :isDarkMode="isDarkTheme"
          @news-loaded="handleNewsLoaded"
        />
      </div>
      
      <div class="sidebar">
        <div class="sidebar-widget market-overview">
          <h3>Market Overview</h3>
          <div class="widget-content">
            <!-- This could be replaced with a proper market overview component -->
            <p>Loading market data...</p>
          </div>
        </div>
        
        <div class="sidebar-widget news-sources">
          <h3>News Sources</h3>
          <ul class="sources-list">
            <li v-for="source in newsSources" :key="source.id" class="source-item">
              <label :class="{ 'disabled': !source.enabled }">
                <input 
                  type="checkbox" 
                  :value="source.id" 
                  v-model="selectedSources"
                  :disabled="!source.enabled"
                >
                {{ source.name }}
              </label>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed } from 'vue';
import { useTheme } from '@/composables/useTheme';
import CryptoNewsWidget from '@/components/news/CryptoNewsWidget.vue';
import { newsService, NewsArticle, NewsSource } from '@/services/NewsService';

export default defineComponent({
  name: 'NewsView',
  
  components: {
    CryptoNewsWidget
  },
  
  setup() {
    const { currentTheme } = useTheme();
    const isDarkTheme = computed(() => {
      return currentTheme.value.includes('dark');
    });
    
    const newsSources = ref<NewsSource[]>([]);
    const selectedSources = ref<string[]>(['cryptodaily']);
    const loadedArticles = ref<NewsArticle[]>([]);
    
    // Load available news sources
    onMounted(() => {
      newsSources.value = newsService.getAvailableNewsSources();
    });
    
    // Handle news loaded event from widget
    const handleNewsLoaded = (articles: NewsArticle[]) => {
      loadedArticles.value = articles;
    };
    
    return {
      isDarkTheme,
      newsSources,
      selectedSources,
      loadedArticles,
      handleNewsLoaded
    };
  }
});
</script>

<style scoped>
.news-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.news-header {
  margin-bottom: 2rem;
  text-align: center;
}

.news-header h1 {
  margin-bottom: 0.5rem;
  font-size: 2rem;
  font-weight: 700;
}

.news-subtitle {
  color: #666;
  font-size: 1.1rem;
  max-width: 600px;
  margin: 0 auto;
}

.news-content {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 2rem;
}

.main-content {
  min-height: 600px;
}

.sidebar-widget {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.sidebar-widget h3 {
  padding: 15px;
  margin: 0;
  background: #f5f7fa;
  border-bottom: 1px solid #e0e4e8;
  font-size: 16px;
}

.widget-content {
  padding: 15px;
}

.sources-list {
  list-style: none;
  padding: 15px;
  margin: 0;
}

.source-item {
  margin-bottom: 10px;
}

.source-item label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.source-item label.disabled {
  color: #999;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .news-content {
    grid-template-columns: 1fr;
  }
  
  .sidebar {
    order: -1;
  }
}
</style>
