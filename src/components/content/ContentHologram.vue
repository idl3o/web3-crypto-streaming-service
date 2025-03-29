<template>
  <div class="content-hologram-gallery" :class="theme">
    <h3 v-if="title" class="gallery-title">{{ title }}</h3>
    
    <div class="hologram-scroll">
      <div 
        v-for="item in contents" 
        :key="item.id" 
        class="hologram-item"
        @click="selectItem(item)"
        :class="{ 'hologram-active': selectedContent?.id === item.id }"
      >
        <div class="item-thumbnail">
          <img 
            v-if="item.thumbnail" 
            :src="item.thumbnail" 
            :alt="item.title"
            @error="e => e.target.src = 'https://via.placeholder.com/100x60?text=Stream'"
          >
          <div v-else class="thumbnail-placeholder">
            <i class="fas fa-photo-video"></i>
          </div>
        </div>
        <div class="item-title">{{ item.title }}</div>
      </div>
    </div>
    
    <div class="hologram-display-area" v-if="selectedContent">
      <HologramViewer 
        type="content"
        :content="selectedContent"
        :interactive="true"
        @interact="viewContent"
      />
      
      <div class="content-actions">
        <button class="action-btn view-btn" @click="viewContent">
          <i class="fas fa-play"></i> View Stream
        </button>
        <button class="action-btn invest-btn" @click="investInContent">
          <i class="fas fa-coins"></i> Invest
        </button>
      </div>
      
      <div class="content-details">
        <h3>{{ selectedContent.title }}</h3>
        <p class="creator">by {{ selectedContent.creator }}</p>
        <p class="description" v-if="selectedContent.description">
          {{ selectedContent.description }}
        </p>
        <div class="content-meta">
          <div class="meta-item">
            <i class="fas fa-eye"></i>
            <span>{{ formatNumber(selectedContent.views || 0) }} views</span>
          </div>
          <div class="meta-item" v-if="selectedContent.paymentRate">
            <i class="fas fa-money-bill-wave"></i>
            <span>{{ formatEth(selectedContent.paymentRate) }} ETH/min</span>
          </div>
          <div class="meta-item" v-if="selectedContent.protocol">
            <i class="fas fa-shield-alt"></i>
            <span>{{ selectedContent.protocol.toUpperCase() }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="empty-selection" v-else>
      <p>Select a stream to view as hologram</p>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue';
import HologramViewer from '../hologram/HologramViewer.vue';

const props = defineProps({
  title: {
    type: String,
    default: 'Featured Content'
  },
  contents: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['view', 'invest']);
const theme = inject('currentTheme', 'roman-theme');

// State
const selectedContent = ref(null);

// Methods
function selectItem(item) {
  selectedContent.value = item;
}

function viewContent() {
  if (selectedContent.value) {
    emit('view', selectedContent.value);
  }
}

function investInContent() {
  if (selectedContent.value) {
    emit('invest', selectedContent.value);
  }
}

function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num;
}

function formatEth(value) {
  if (value === undefined || value === null) return '0.000';
  return parseFloat(value).toFixed(3);
}
</script>

<style scoped>
.content-hologram-gallery {
  margin: 30px 0;
}

.gallery-title {
  margin: 0 0 20px 0;
  font-size: 1.4rem;
}

.hologram-scroll {
  display: flex;
  overflow-x: auto;
  padding: 10px 0;
  margin-bottom: 30px;
}

.hologram-item {
  flex: 0 0 auto;
  width: 120px;
  margin-right: 15px;
  cursor: pointer;
  transition: transform 0.2s;
  position: relative;
}

.hologram-item:hover {
  transform: translateY(-5px);
}

.hologram-active {
  transform: translateY(-5px);
}

.hologram-active::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 20%;
  right: 20%;
  height: 3px;
  background: linear-gradient(90deg, transparent, #3498db, transparent);
  border-radius: 3px;
}

.item-thumbnail {
  width: 120px;
  height: 70px;
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 8px;
}

.item-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  color: #aaa;
}

.item-title {
  font-size: 0.85rem;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hologram-display-area {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.content-actions {
  display: flex;
  gap: 15px;
  margin: 20px 0;
}

.action-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s;
}

.view-btn {
  background-color: #3498db;
  color: white;
}

.view-btn:hover {
  background-color: #2980b9;
}

.invest-btn {
  background-color: #f39c12;
  color: white;
}

.invest-btn:hover {
  background-color: #e67e22;
}

.content-details {
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
}

.content-details h3 {
  margin: 0 0 5px 0;
  font-size: 1.3rem;
}

.content-details .creator {
  margin: 0 0 10px 0;
  color: #666;
}

.content-details .description {
  margin: 0 0 15px 0;
  font-size: 0.95rem;
  line-height: 1.5;
}

.content-meta {
  display: flex;
  justify-content: center;
  gap: 20px;
  font-size: 0.85rem;
  color: #666;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.empty-selection {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
  font-style: italic;
}

/* Roman theme overrides */
.roman-theme .hologram-active::after {
  background: linear-gradient(90deg, transparent, #8B4513, transparent);
}

.roman-theme .view-btn {
  background-color: #8B4513;
}

.roman-theme .view-btn:hover {
  background-color: #A0522D;
}

.roman-theme .invest-btn {
  background-color: #CD853F;
}

.roman-theme .invest-btn:hover {
  background-color: #D2691E;
}

@media (max-width: 768px) {
  .content-actions {
    flex-direction: column;
    width: 80%;
  }
  
  .action-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
