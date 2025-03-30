<template>
  <div class="crypto-news-widget" :class="{ 'theme-dark': isDarkMode }">
    <div class="news-widget-header">
      <h3>
        <span class="header-icon">📰</span>
        {{ title }}
      </h3>
      <div class="header-actions">
        <button @click="refreshNews" class="refresh-btn" :disabled="isLoading" :title="'Refresh'">
          <span v-if="isLoading" class="loading-spinner"></span>
          <span v-else>↻</span>
        </button>
        <button @click="toggleExpanded" class="toggle-btn" :title="expanded ? 'Collapse' : 'Expand'">
          {{ expanded ? '▼' : '▲' }}
        </button>
      </div>
    </div>
    
    <div v-if="expanded" class="news-widget-content">
      <div v-if="isLoading" class="news-loading">
        <div class="loading-spinner"></div>
        <p>Loading latest crypto news...</p>
      </div>
      
      <div v-else-if="error" class="news-error">
        <span class="error-icon">⚠️</span>
        <span class="error-message">{{ error }}</span>
      </div>
      
      <div v-else-if="articles.length === 0" class="news-empty">
        <p>No news articles available at the moment</p>
      </div>
      
      <div v-else class="news-list">
        <div 
          v-for="(article, index) in visibleArticles" 
          :key="article.id || index" 
          class="news-item"
          @click="openArticle(article.url)"
        >
          <div 
            v-if="article.image" 
            class="news-image" 
            :style="{ backgroundImage: `url(${article.image})` }"
          ></div>
          <div class="news-content">
            <h4 class="news-title">{{ article.title }}</h4>
            <p v-if="showDescriptions" class="news-description">{{ truncateDescription(article.description) }}</p>
            <div class="news-meta">
              <span class="news-source">{{ article.source }}</span>
              <span class="news-date">{{ formatDate(article.publishedAt) }}</span>
            </div>
          </div>
        </div>
        
        <div v-if="articles.length > initialArticleCount && !showAll" class="show-more">
          <button @click="showAll = true" class="show-more-btn">
            Show {{ articles.length - initialArticleCount }} More Articles
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { newsService, NewsArticle } from '../../services/NewsService';

export default defineComponent({
  name: 'CryptoNewsWidget',
  
  props: {
    title: {
      type: String,
      default: 'Crypto News'
    },
    autoRefreshInterval: {
      type: Number,
      default: 15 // minutes
    },
    initialArticleCount: {
      type: Number,
      default: 5
    },
    showDescriptions: {
      type: Boolean,
      default: true
    },
    maxDescriptionLength: {
      type: Number,
      default: 120
    },
    expandedByDefault: {
      type: Boolean,
      default: true
    },
    isDarkMode: {
      type: Boolean,
      default: false
    }
  },
  
  emits: ['news-loaded', 'news-error'],
  
  setup(props, { emit }) {
    const articles = ref<NewsArticle[]>([]);
    const isLoading = ref(true);
    const error = ref<string | null>(null);
    const expanded = ref(props.expandedByDefault);
    const showAll = ref(false);
    const refreshInterval = ref<number | null>(null);
    
    const visibleArticles = computed(() => {
      if (showAll.value) {
        return articles.value;
      }
      return articles.value.slice(0, props.initialArticleCount);
    });
    
    // Refresh news data
    const refreshNews = async () => {
      isLoading.value = true;
      error.value = null;
      
      try {
        articles.value = await newsService.getCryptoDailyNews(true);
        emit('news-loaded', articles.value);
      } catch (err) {
        console.error('Failed to load news:', err);
        error.value = err instanceof Error ? err.message : 'Failed to load news';
        emit('news-error', error.value);
      } finally {
        isLoading.value = false;
      }
    };
    
    // Toggle expanded state
    const toggleExpanded = () => {
      expanded.value = !expanded.value;
    };
    
    // Truncate description to specified length
    const truncateDescription = (description: string) => {
      if (!description || description.length <= props.maxDescriptionLength) {
        return description;
      }
      return description.substring(0, props.maxDescriptionLength) + '...';
    };
    
    // Format publication date
    const formatDate = (dateString: string) => {
      try {
        const date = new Date(dateString);
        const now = new Date();
        
        // If it's today, show time only
        if (date.toDateString() === now.toDateString()) {
          return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        // If it's within the last week, show day name and time
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        
        if (date > oneWeekAgo) {
          return date.toLocaleString([], { 
            weekday: 'short', 
            hour: '2-digit', 
            minute: '2-digit' 
          });
        }
        
        // Otherwise show full date
        return date.toLocaleDateString();
      } catch (error) {
        return dateString;
      }
    };
    
    // Open the article in a new tab
    const openArticle = (url: string) => {
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    };
    
    // Set up automatic refresh
    const setupAutoRefresh = () => {
      if (props.autoRefreshInterval > 0) {
        refreshInterval.value = window.setInterval(() => {
          refreshNews();
        }, props.autoRefreshInterval * 60 * 1000);
      }
    };
    
    // Clean up on component unmount
    onBeforeUnmount(() => {
      if (refreshInterval.value) {
        clearInterval(refreshInterval.value);
      }
    });
    
    // Load news on mount
    onMounted(async () => {
      await refreshNews();
      setupAutoRefresh();
    });
    
    return {
      articles,
      isLoading,
      error,
      expanded,
      showAll,
      visibleArticles,
      refreshNews,
      toggleExpanded,
      truncateDescription,
      formatDate,
      openArticle
    };
  }
});
</script>

<style scoped>
.crypto-news-widget {
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  width: 100%;
  transition: all 0.3s ease;
}

.crypto-news-widget.theme-dark {
  background: #1e1e1e;
  color: #e0e0e0;
  border: 1px solid #333;
}

.news-widget-header {
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f5f7fa;
  border-bottom: 1px solid #e0e4e8;
}

.theme-dark .news-widget-header {
  background: #252525;
  border-bottom-color: #333;
}

.news-widget-header h3 {
  margin: 0;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #333;
}

.theme-dark .news-widget-header h3 {
  color: #e0e0e0;
}

.header-icon {
  font-size: 18px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.refresh-btn,
.toggle-btn {
  background: none;
  border: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #666;
  font-size: 16px;
  transition: all 0.2s;
}

.refresh-btn:hover,
.toggle-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: #333;
}

.theme-dark .refresh-btn,
.theme-dark .toggle-btn {
  color: #aaa;
}

.theme-dark .refresh-btn:hover,
.theme-dark .toggle-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: #e0e0e0;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.news-widget-content {
  padding: 15px 0;
}

.news-loading,
.news-error,
.news-empty {
  padding: 30px 20px;
  text-align: center;
  color: #666;
}

.theme-dark .news-loading,
.theme-dark .news-error,
.theme-dark .news-empty {
  color: #aaa;
}

.loading-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: #666;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

.theme-dark .loading-spinner {
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: #aaa;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon {
  margin-right: 8px;
  font-size: 18px;
}

.news-list {
  display: flex;
  flex-direction: column;
}

.news-item {
  display: flex;
  padding: 15px 20px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.theme-dark .news-item {
  border-bottom-color: #333;
}

.news-item:hover {
  background-color: #f9f9f9;
}

.theme-dark .news-item:hover {
  background-color: #252525;
}

.news-item:last-child {
  border-bottom: none;
}

.news-image {
  width: 80px;
  height: 60px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border-radius: 4px;
  margin-right: 15px;
  flex-shrink: 0;
  background-color: #f0f0f0;
}

.theme-dark .news-image {
  background-color: #333;
}

.news-content {
  flex: 1;
}

.news-title {
  margin: 0 0 6px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
}

.theme-dark .news-title {
  color: #e0e0e0;
}

.news-description {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #666;
  line-height: 1.4;
}

.theme-dark .news-description {
  color: #aaa;
}

.news-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #888;
}

.theme-dark .news-meta {
  color: #777;
}

.show-more {
  padding: 15px 20px;
  text-align: center;
}

.show-more-btn {
  background: none;
  border: 1px solid #e0e4e8;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.show-more-btn:hover {
  background-color: #f5f7fa;
  color: #333;
}

.theme-dark .show-more-btn {
  border-color: #333;
  color: #aaa;
}

.theme-dark .show-more-btn:hover {
  background-color: #252525;
  color: #e0e0e0;
}
</style>
