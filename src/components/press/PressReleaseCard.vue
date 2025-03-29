<template>
  <div 
    class="press-release-card" 
    :class="[theme, size, { featured: pressRelease.featured, interactive }]"
    @click="handleCardClick"
  >
    <!-- Featured badge -->
    <div class="featured-badge" v-if="pressRelease.featured && showFeaturedBadge">
      <i class="fas fa-star"></i> Featured
    </div>
    
    <!-- Image section -->
    <div class="press-image" v-if="pressRelease.image && showImage">
      <img :src="pressRelease.image" :alt="pressRelease.title" />
      
      <!-- Category label -->
      <div class="category-label">
        {{ formatCategory(pressRelease.category) }}
      </div>
    </div>
    
    <!-- Content section -->
    <div class="press-content">
      <!-- Date -->
      <div class="press-date">
        {{ formatDate(pressRelease.publishDate) }}
      </div>
      
      <!-- Title -->
      <h3 class="press-title">{{ pressRelease.title }}</h3>
      
      <!-- Summary -->
      <p class="press-summary" v-if="showSummary">{{ pressRelease.summary }}</p>
      
      <!-- Tags -->
      <div class="press-tags" v-if="showTags && pressRelease.tags && pressRelease.tags.length > 0">
        <span 
          v-for="tag in limitTags(pressRelease.tags)" 
          :key="tag" 
          class="press-tag"
          @click.stop="$emit('tag-click', tag)"
        >
          {{ tag }}
        </span>
      </div>
      
      <!-- Read more link -->
      <div class="press-read-more" v-if="interactive && showReadMore">
        <button class="read-more-btn" @click.stop="$emit('read-more', pressRelease.id)">
          Read More <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue';
import { PRESS_CATEGORIES } from '@/services/PressReleaseService';

const props = defineProps({
  pressRelease: {
    type: Object,
    required: true
  },
  interactive: {
    type: Boolean,
    default: true
  },
  showImage: {
    type: Boolean,
    default: true
  },
  showSummary: {
    type: Boolean,
    default: true
  },
  showTags: {
    type: Boolean,
    default: true
  },
  showReadMore: {
    type: Boolean,
    default: true
  },
  showFeaturedBadge: {
    type: Boolean,
    default: true
  },
  size: {
    type: String,
    default: 'medium',
    validator: value => ['small', 'medium', 'large'].includes(value)
  },
  maxTags: {
    type: Number,
    default: 3
  }
});

const emit = defineEmits(['read-more', 'tag-click', 'click']);
const theme = inject('currentTheme', 'roman-theme');

// Format a date to a readable string
function formatDate(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

// Format category name from snake_case to Title Case
function formatCategory(category) {
  if (!category) return '';
  
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Limit the number of tags displayed
function limitTags(tags) {
  if (!tags || !Array.isArray(tags)) return [];
  return tags.slice(0, props.maxTags);
}

// Handle card click
function handleCardClick() {
  if (props.interactive) {
    emit('click', props.pressRelease);
  }
}
</script>

<style scoped>
.press-release-card {
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: all 0.2s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

.press-release-card.interactive:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.press-release-card.featured {
  border: 1px solid #e6e6e6;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.featured-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: #f39c12;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 4px;
}

.press-image {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 52%; /* 16:9 aspect ratio */
  overflow: hidden;
}

.press-image img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.category-label {
  position: absolute;
  bottom: 10px;
  left: 10px;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
}

.press-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.press-date {
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 6px;
}

.press-title {
  font-size: 1.1rem;
  margin: 0 0 10px 0;
  color: #333;
  line-height: 1.3;
}

.press-summary {
  font-size: 0.9rem;
  line-height: 1.5;
  color: #555;
  margin: 0 0 12px 0;
  flex-grow: 1;
}

.press-tags {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.press-tag {
  background-color: #f5f5f5;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
  color: #555;
  transition: background-color 0.2s;
  cursor: pointer;
}

.press-tag:hover {
  background-color: #e0e0e0;
}

.press-read-more {
  margin-top: auto;
  padding-top: 12px;
}

.read-more-btn {
  background: none;
  border: none;
  color: #3498db;
  font-size: 0.9rem;
  font-weight: 600;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.read-more-btn:hover {
  color: #2980b9;
}

/* Size variants */
.press-release-card.small .press-image {
  padding-bottom: 40%;
}

.press-release-card.small .press-content {
  padding: 12px;
}

.press-release-card.small .press-title {
  font-size: 0.95rem;
  margin-bottom: 6px;
}

.press-release-card.small .press-summary {
  font-size: 0.8rem;
  margin-bottom: 8px;
}

.press-release-card.large .press-content {
  padding: 20px;
}

.press-release-card.large .press-title {
  font-size: 1.3rem;
  margin-bottom: 12px;
}

.press-release-card.large .press-summary {
  font-size: 1rem;
}

/* Roman theme styling */
.press-release-card.roman-theme {
  border: 1px solid #d5c3aa;
}

.press-release-card.roman-theme.featured {
  border-color: #8B4513;
}

.press-release-card.roman-theme .featured-badge {
  background-color: #8B4513;
}

.press-release-card.roman-theme .category-label {
  background-color: rgba(139, 69, 19, 0.7);
}

.press-release-card.roman-theme .press-date {
  color: #6B4226;
}

.press-release-card.roman-theme .press-tag {
  background-color: rgba(139, 69, 19, 0.1);
  color: #6B4226;
}

.press-release-card.roman-theme .press-tag:hover {
  background-color: rgba(139, 69, 19, 0.2);
}

.press-release-card.roman-theme .read-more-btn {
  color: #8B4513;
}

.press-release-card.roman-theme .read-more-btn:hover {
  color: #6B4226;
}
</style>
