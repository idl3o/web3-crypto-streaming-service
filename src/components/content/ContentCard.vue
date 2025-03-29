<template>
  <div 
    class="content-card" 
    :class="[theme, { 'minimal-mode': isMinimalMode }]"
    @click="navigateToContent"
  >
    <div class="thumbnail-container">
      <img 
        v-if="content.thumbnailUrl" 
        :src="content.thumbnailUrl" 
        :alt="content.title" 
        class="thumbnail"
        @error="handleImageError"
      />
      <div v-else class="thumbnail-placeholder">
        <i class="fas fa-photo-video"></i>
      </div>
      <div class="duration" v-if="content.duration">{{ formatDuration(content.duration) }}</div>
      <div class="content-type-badge" :class="content.contentType">
        {{ formatContentType(content.contentType) }}
      </div>
    </div>
    
    <div class="content-info">
      <h3 class="content-title" :title="content.title">{{ content.title }}</h3>
      
      <div class="creator-info">
        <img 
          v-if="content.creatorAvatar" 
          :src="content.creatorAvatar" 
          alt="Creator" 
          class="creator-avatar"
        />
        <span class="creator-name">{{ content.creatorName }}</span>
      </div>
      
      <div class="content-meta">
        <span class="views">{{ formatViews(content.views) }} views</span>
        <span class="dot-separator">•</span>
        <span class="timestamp">{{ formatTimestamp(content.timestamp) }}</span>
      </div>
      
      <div class="content-tags" v-if="content.tags && content.tags.length">
        <span 
          v-for="(tag, index) in displayedTags" 
          :key="index" 
          class="tag"
        >
          #{{ tag }}
        </span>
        <span v-if="content.tags.length > maxDisplayTags" class="more-tags">+{{ content.tags.length - maxDisplayTags }}</span>
      </div>
    </div>
    
    <div class="actions">
      <button @click.stop="toggleFavorite" class="action-btn favorite-btn" :title="isFavorite ? 'Remove from favorites' : 'Add to favorites'">
        <i :class="['fas', isFavorite ? 'fa-heart' : 'fa-heart']" :style="{ color: isFavorite ? '#ff4757' : '#b2bec3' }"></i>
      </button>
      <button @click.stop="showShareOptions" class="action-btn share-btn" title="Share">
        <i class="fas fa-share-alt"></i>
      </button>
      <button v-if="isTokenGated" @click.stop="showTokenRequirements" class="action-btn token-btn" title="Token required">
        <i class="fas fa-lock"></i>
      </button>
      <ContentSafetyBadge v-if="showSafetyBadge" :rating="content.safetyRating" @click.stop />
      <FactualityBadge v-if="showFactualBadge" :score="content.factualityScore" @click.stop />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue';
import { useRouter } from 'vue-router';
import useMinimalMode from '@/composables/useMinimalMode';
import ContentSafetyBadge from '@/components/safety/ContentSafetyBadge.vue';
import FactualityBadge from '@/components/factual/FactualityBadge.vue';

const props = defineProps({
  content: {
    type: Object,
    required: true
  },
  showSafetyBadge: {
    type: Boolean,
    default: true
  },
  showFactualBadge: {
    type: Boolean,
    default: true
  },
  maxDisplayTags: {
    type: Number,
    default: 3
  }
});

const emit = defineEmits([
  'favorite-toggle', 
  'share', 
  'view',
  'token-details'
]);

const router = useRouter();
const theme = inject('currentTheme', 'roman-theme');
const { isMinimalMode } = useMinimalMode();

// State
const isFavorite = ref(false);
const imageError = ref(false);

// Computed
const isTokenGated = computed(() => {
  return props.content.tokenGated === true;
});

const displayedTags = computed(() => {
  if (!props.content.tags) return [];
  return props.content.tags.slice(0, props.maxDisplayTags);
});

// Methods
function navigateToContent() {
  emit('view', props.content.id);
  router.push({ name: 'ContentView', params: { id: props.content.id } });
}

function toggleFavorite() {
  isFavorite.value = !isFavorite.value;
  emit('favorite-toggle', {
    contentId: props.content.id,
    isFavorite: isFavorite.value
  });
}

function showShareOptions() {
  emit('share', props.content);
}

function showTokenRequirements() {
  emit('token-details', props.content);
}

function handleImageError() {
  imageError.value = true;
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

function formatViews(views) {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`;
  } else if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K`;
  } else {
    return views;
  }
}

function formatTimestamp(timestamp) {
  const now = new Date();
  const contentDate = new Date(timestamp);
  const diffMs = now - contentDate;
  const diffSec = Math.floor(diffMs / 1000);
  
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minutes ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} days ago`;
  if (diffSec < 2592000) return `${Math.floor(diffSec / 604800)} weeks ago`;
  if (diffSec < 31536000) return `${Math.floor(diffSec / 2592000)} months ago`;
  return `${Math.floor(diffSec / 31536000)} years ago`;
}

function formatContentType(type) {
  if (!type) return '';
  switch (type) {
    case 'video': return 'Video';
    case 'audio': return 'Audio';
    case 'hologram': return 'Hologram';
    case 'mixed_media': return 'Mixed';
    default: return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

// Lifecycle hooks
onMounted(() => {
  // Check if content is already favorited
  if (props.content.isFavorite) {
    isFavorite.value = true;
  }
});
</script>

<style scoped>
.content-card {
  border-radius: 12px;
  overflow: hidden;
  background-color: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
  position: relative;
  width: 100%;
  max-width: 360px;
  margin-bottom: 20px;
}

.content-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.thumbnail-container {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  overflow: hidden;
  background-color: #f8f9fa;
}

.thumbnail {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  color: #b2bec3;
}

.duration {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background-color: rgba(0, 0, 0, 0.75);
  color: #ffffff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.content-type-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.content-type-badge.video {
  background-color: #3498db;
  color: white;
}

.content-type-badge.audio {
  background-color: #9b59b6;
  color: white;
}

.content-type-badge.hologram {
  background-color: #f39c12;
  color: white;
}

.content-type-badge.mixed_media {
  background-color: #2ecc71;
  color: white;
}

.content-info {
  padding: 16px;
}

.content-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  color: #333333;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.creator-info {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.creator-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  margin-right: 8px;
}

.creator-name {
  font-size: 14px;
  color: #555555;
  font-weight: 500;
}

.content-meta {
  font-size: 13px;
  color: #777777;
  margin-bottom: 8px;
}

.dot-separator {
  margin: 0 6px;
}

.content-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  font-size: 12px;
  color: #3498db;
}

.more-tags {
  font-size: 12px;
  color: #777777;
}

.actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
}

.action-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.9);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.action-btn:hover {
  background-color: #ffffff;
}

.token-btn {
  background-color: rgba(255, 215, 0, 0.9); /* Gold background */
}

.token-btn:hover {
  background-color: rgba(255, 215, 0, 1);
}

/* Roman Theme */
.roman-theme.content-card {
  background-color: #fcf9f0;
  box-shadow: 0 4px 12px rgba(139, 69, 19, 0.1);
}

.roman-theme .content-title {
  color: #8B4513;
}

.roman-theme .creator-name {
  color: #654321;
}

.roman-theme .content-meta {
  color: #6b5c4d;
}

.roman-theme .tag {
  color: #7d5a24;
}

/* Minimal Mode */
.content-card.minimal-mode {
  box-shadow: none;
  border: 1px solid #e0e0e0;
  transition: none;
}

.content-card.minimal-mode:hover {
  transform: none;
  box-shadow: none;
}

.minimal-mode .actions {
  opacity: 0.7;
}

.minimal-mode .thumbnail-container {
  background-color: #f0f0f0;
}
</style>

