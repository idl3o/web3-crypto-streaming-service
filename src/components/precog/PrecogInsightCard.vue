<template>
  <div class="precog-insight-card" :class="[theme, type]">
    <div class="insight-header">
      <div class="insight-title">
        <i :class="getIconClass"></i>
        {{ title }}
      </div>
      <div class="insight-confidence">
        <div class="confidence-badge" :class="getConfidenceClass">
          {{ confidenceLevel }}% Confidence
        </div>
        
        <button class="refresh-btn" @click="refreshInsight" :disabled="loading">
          <i :class="loading ? 'fas fa-spinner fa-spin' : 'fas fa-sync-alt'"></i>
        </button>
      </div>
    </div>
    
    <div class="insight-body">
      <p v-if="loading" class="loading-text">Analyzing patterns...</p>
      <template v-else>
        <div class="insight-text" v-html="formattedInsight"></div>
        <div v-if="tags.length > 0" class="insight-tags">
          <span class="tag" v-for="tag in tags" :key="tag">{{ tag }}</span>
        </div>
      </template>
    </div>
    
    <div v-if="relatedTopics.length > 0" class="related-topics">
      <h5>Related Topics</h5>
      <div class="topic-chips">
        <span 
          v-for="topic in relatedTopics" 
          :key="topic" 
          class="topic-chip"
          @click="$emit('topic-selected', topic)"
        >
          {{ topic }}
        </span>
      </div>
    </div>
    
    <div class="insight-footer">
      <div class="action-buttons" v-if="actions && actions.length > 0">
        <button 
          v-for="action in actions" 
          :key="action.label" 
          :class="['action-btn', action.type || 'primary']"
          @click="$emit('action', action.action)"
        >
          <i v-if="action.icon" :class="action.icon"></i>
          {{ action.label }}
        </button>
      </div>
      <div class="insight-timestamp">
        Generated {{ formatTimeAgo(generatedAt) }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue';

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  insight: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'general',
    validator: value => [
      'general', 'investment', 'content', 'market', 'user', 'warning'
    ].includes(value)
  },
  confidenceLevel: {
    type: Number,
    default: 85,
    validator: value => value >= 0 && value <= 100
  },
  tags: {
    type: Array,
    default: () => []
  },
  relatedTopics: {
    type: Array,
    default: () => []
  },
  actions: {
    type: Array,
    default: () => []
  },
  generatedAt: {
    type: [Date, String],
    default: () => new Date()
  }
});

const emit = defineEmits(['refresh', 'action', 'topic-selected']);
const theme = inject('currentTheme', 'roman-theme');
const loading = ref(false);

// Computed properties
const getIconClass = computed(() => {
  const iconMap = {
    'general': 'fas fa-brain',
    'investment': 'fas fa-chart-line',
    'content': 'fas fa-film',
    'market': 'fas fa-globe',
    'user': 'fas fa-user',
    'warning': 'fas fa-exclamation-triangle'
  };
  
  return iconMap[props.type] || 'fas fa-lightbulb';
});

const getConfidenceClass = computed(() => {
  if (props.confidenceLevel >= 85) return 'high';
  if (props.confidenceLevel >= 60) return 'medium';
  return 'low';
});

const formattedInsight = computed(() => {
  if (!props.insight) return '';
  
  // Add simple formatting for markdown-like syntax
  let formatted = props.insight
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Emphasis
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Highlight important metrics
    .replace(/(\d+(\.\d+)?%)/g, '<span class="metric">$1</span>')
    // Line breaks
    .replace(/\n/g, '<br>');
    
  return formatted;
});

// Methods
async function refreshInsight() {
  loading.value = true;
  
  try {
    // Emit refresh event so parent can regenerate insight
    emit('refresh');
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
  } finally {
    loading.value = false;
  }
}

function formatTimeAgo(date) {
  const now = new Date();
  const timestamp = new Date(date);
  const diffInSeconds = Math.floor((now - timestamp) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}
</script>

<style scoped>
.precog-insight-card {
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

.precog-insight-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
}

.insight-header {
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
}

.insight-title {
  font-weight: 600;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #333;
}

.insight-confidence {
  display: flex;
  align-items: center;
  gap: 10px;
}

.confidence-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 12px;
}

.confidence-badge.high {
  background-color: #e8f6e8;
  color: #2ecc71;
}

.confidence-badge.medium {
  background-color: #fef8e8;
  color: #f39c12;
}

.confidence-badge.low {
  background-color: #fee8e8;
  color: #e74c3c;
}

.refresh-btn {
  background: none;
  border: none;
  color: #aaa;
  cursor: pointer;
  transition: color 0.2s;
  padding: 5px;
}

.refresh-btn:hover:not(:disabled) {
  color: #555;
}

.refresh-btn:disabled {
  cursor: not-allowed;
}

.insight-body {
  padding: 15px;
  font-size: 0.95rem;
  line-height: 1.5;
  color: #444;
}

.loading-text {
  text-align: center;
  color: #aaa;
  font-style: italic;
}

.insight-text {
  margin-bottom: 10px;
}

.insight-text :deep(.metric) {
  font-weight: 600;
  color: #3498db;
}

.insight-tags {
  margin-top: 15px;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.tag {
  background-color: #f5f5f5;
  color: #666;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
}

.related-topics {
  padding: 0 15px 15px;
}

.related-topics h5 {
  font-size: 0.9rem;
  margin: 0 0 10px 0;
  color: #666;
}

.topic-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.topic-chip {
  background-color: #e8f4fd;
  color: #3498db;
  padding: 3px 10px;
  border-radius: 15px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.topic-chip:hover {
  background-color: #3498db;
  color: white;
}

.insight-footer {
  padding: 10px 15px;
  border-top: 1px dashed #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 4px;
  border: none;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.primary {
  background-color: #3498db;
  color: white;
}

.action-btn.primary:hover {
  background-color: #2980b9;
}

.action-btn.secondary {
  background-color: #f5f5f5;
  color: #555;
}

.action-btn.secondary:hover {
  background-color: #e0e0e0;
}

.action-btn.warning {
  background-color: #f39c12;
  color: white;
}

.action-btn.warning:hover {
  background-color: #e67e22;
}

.insight-timestamp {
  font-size: 0.8rem;
  color: #aaa;
}

/* Type-specific styling */
.precog-insight-card.investment .insight-title {
  color: #3498db;
}

.precog-insight-card.content .insight-title {
  color: #9b59b6;
}

.precog-insight-card.market .insight-title {
  color: #2ecc71;
}

.precog-insight-card.user .insight-title {
  color: #f39c12;
}

.precog-insight-card.warning {
  border-left: 3px solid #e74c3c;
}

.precog-insight-card.warning .insight-title {
  color: #e74c3c;
}

/* Roman theme overrides */
.roman-theme {
  border: 1px solid #d5c3aa;
}

.roman-theme .insight-header {
  border-bottom-color: #d5c3aa;
}

.roman-theme .insight-text :deep(.metric) {
  color: #8B4513;
}

.roman-theme .confidence-badge.high {
  background-color: #f0f5e6;
  color: #6B8E23;
}

.roman-theme .topic-chip {
  background-color: #f5eee6;
  color: #8B4513;
}

.roman-theme .topic-chip:hover {
  background-color: #8B4513;
  color: white;
}

.roman-theme .insight-footer {
  border-top-color: #d5c3aa;
}

.roman-theme .action-btn.primary {
  background-color: #8B4513;
}

.roman-theme .action-btn.primary:hover {
  background-color: #A0522D;
}

/* Type-specific styling for Roman theme */
.roman-theme.investment .insight-title {
  color: #8B4513;
}

.roman-theme.content .insight-title {
  color: #654321;
}

.roman-theme.market .insight-title {
  color: #6B8E23;
}

.roman-theme.user .insight-title {
  color: #CD853F;
}

.roman-theme.warning .insight-title {
  color: #B22222;
}

/* Responsive styles */
@media (max-width: 480px) {
  .insight-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .insight-confidence {
    width: 100%;
    justify-content: space-between;
  }
  
  .insight-footer {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .action-buttons {
    width: 100%;
  }
  
  .action-btn {
    flex: 1;
    justify-content: center;
  }
  
  .insight-timestamp {
    width: 100%;
    text-align: right;
  }
}
</style>
