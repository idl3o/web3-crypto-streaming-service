<template>
  <div class="stream-player">
    <!-- Video Player -->
    <div class="video-container" :class="{ 'is-buffering': state.isBuffering }">
      <!-- Overlay for buffering indicator -->
      <div v-if="state.isBuffering" class="buffer-overlay">
        <div class="spinner"></div>
        <div class="buffer-text">Buffering...</div>
      </div>
      
      <!-- Stream Error -->
      <div v-if="state.hasError" class="error-overlay">
        <div class="error-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div class="error-message">{{ state.errorMessage }}</div>
        <button class="btn btn-primary" @click="retryStream">Try Again</button>
      </div>
      
      <!-- Video Element -->
      <video
        ref="videoRef"
        class="video-element"
        :src="contentUrl"
        :poster="posterUrl"
        controls
        @pause="handlePause"
        @play="handlePlay"
      ></video>
      
      <!-- Stream Quality Indicator -->
      <div class="stream-quality">
        {{ state.stats.quality }}
      </div>
    </div>
    
    <!-- Stream Control Panel -->
    <div class="stream-control-panel">
      <div class="stream-info">
        <div class="stream-stat">
          <div class="stat-label">Duration</div>
          <div class="stat-value">{{ state.stats.durationFormatted }}</div>
        </div>
        
        <div class="stream-stat">
          <div class="stat-label">Cost</div>
          <div class="stat-value">{{ state.stats.currentCostFormatted }} ETH</div>
        </div>
        
        <div class="stream-stat" :class="{ 'low-buffer': state.stats.bufferHealth < 50 }">
          <div class="stat-label">Buffer</div>
          <div class="stat-value">{{ state.stats.bufferHealth }}%</div>
        </div>
      </div>
      
      <div class="stream-actions">
        <div class="stream-quality-selector">
          <label for="quality-select">Quality:</label>
          <select id="quality-select" v-model="selectedQuality" @change="changeQuality">
            <option value="auto">Auto</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="hd">HD</option>
          </select>
        </div>
        
        <button
          v-if="!state.isStreaming && !state.isPaused"
          class="btn btn-primary start-stream-btn"
          @click="startStream"
          :disabled="isLoading"
        >
          <i class="fas fa-play me-1"></i>
          {{ isLoading ? 'Connecting...' : 'Start Stream' }}
        </button>
        
        <button v-if="state.isStreaming" class="btn btn-danger stop-stream-btn" @click="stopStream">
          <i class="fas fa-stop me-1"></i> End Stream
        </button>
        
        <button v-if="state.isPaused" class="btn btn-primary resume-stream-btn" @click="resumeStream">
          <i class="fas fa-play me-1"></i> Resume
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useStreamingView } from '@/mvc/views/StreamingView';
import { StreamQuality } from '@/mvc/models/StreamingModel';

// Props
const props = defineProps({
  contentId: {
    type: String,
    required: true
  },
  autoplay: {
    type: Boolean,
    default: false
  }
});

// Video player ref
const videoRef = ref(null);

// Local state
const isLoading = ref(false);
const selectedQuality = ref(StreamQuality.AUTO);

// Get the streaming view
const { state, loadContent, startStream, stopStream, pauseStream, resumeStream, changeQuality } = useStreamingView();

// Computed properties
const contentUrl = computed(() => {
  if (state.content) {
    return state.content.getContentUrl();
  }
  return '';
});

const posterUrl = computed(() => {
  if (state.content) {
    return state.content.thumbnail || '';
  }
  return '';
});

// Methods
async function initializeContent() {
  isLoading.value = true;
  
  try {
    const success = await loadContent(props.contentId);
    if (success && props.autoplay) {
      await startStream(selectedQuality.value);
      if (videoRef.value) {
        videoRef.value.play();
      }
    }
  } catch (error) {
    console.error('Failed to initialize content:', error);
  } finally {
    isLoading.value = false;
  }
}

async function retryStream() {
  await startStream(selectedQuality.value);
  if (videoRef.value) {
    videoRef.value.play();
  }
}

function handlePause() {
  if (state.isStreaming) {
    pauseStream();
  }
}

function handlePlay() {
  if (state.isPaused) {
    resumeStream();
  } else if (!state.isStreaming) {
    startStream(selectedQuality.value);
  }
}

function changeQuality() {
  if (state.isStreaming || state.isPaused) {
    changeQuality(selectedQuality.value);
  }
}

// Watch for content changes
watch(() => props.contentId, (newId, oldId) => {
  if (newId !== oldId) {
    initializeContent();
  }
});

// Initialize
onMounted(() => {
  initializeContent();
});
</script>

<style scoped>
.stream-player {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.video-container {
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 aspect ratio */
  background-color: #000;
  overflow: hidden;
}

.video-element {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.buffer-overlay,
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 2;
}

.buffer-overlay .spinner {
  width: 50px;
  height: 50px;
  border: 5px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s infinite linear;
  margin-bottom: 10px;
}

.buffer-text {
  color: white;
  font-size: 16px;
}

.error-overlay {
  color: white;
  text-align: center;
  padding: 20px;
}

.error-icon {
  font-size: 48px;
  color: #ff4757;
  margin-bottom: 16px;
}

.error-message {
  font-size: 16px;
  margin-bottom: 20px;
  max-width: 80%;
}

.stream-quality {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 12px;
  text-transform: uppercase;
}

.stream-control-panel {
  background-color: #f8f9fa;
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.stream-info {
  display: flex;
  gap: 20px;
}

.stream-stat {
  text-align: center;
}

.stat-label {
  font-size: 12px;
  color: #6c757d;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
}

.low-buffer .stat-value {
  color: #dc3545;
}

.stream-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.stream-quality-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stream-quality-selector label {
  font-size: 14px;
  color: #495057;
  margin-bottom: 0;
}

.stream-quality-selector select {
  padding: 5px 10px;
  border-radius: 4px;
  border: 1px solid #ced4da;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .stream-control-panel {
    flex-direction: column;
    gap: 15px;
  }
  
  .stream-info,
  .stream-actions {
    width: 100%;
    justify-content: center;
  }
}
</style>
