<template>
  <div class="theater-mode" :class="theme">
    <div class="theater-header">
      <div class="content-info">
        <h2>{{ content.title }}</h2>
        <p class="creator">{{ content.creator }}</p>
      </div>
      <div class="theater-controls">
        <button class="control-btn info-btn" @click="toggleInfo">
          <i class="fas" :class="showInfo ? 'fa-chevron-up' : 'fa-info-circle'"></i>
        </button>
        <button class="control-btn exit-btn" @click="exitTheaterMode">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>

    <div class="player-container">
      <div class="video-player">
        <!-- Placeholder for video player -->
        <div class="player-placeholder" v-if="!isPlaying">
          <img v-if="content.thumbnail" :src="content.thumbnail" :alt="content.title">
          <div v-else class="no-thumbnail">
            <i class="fas fa-photo-video"></i>
          </div>
          <div class="play-overlay" @click="startPlaying">
            <i class="fas fa-play"></i>
          </div>
        </div>
        
        <!-- Actual video player would replace this -->
        <div v-else class="active-player">
          <div class="stream-info">
            <div class="protocol-badge" v-if="content.protocol === 'k80'">
              <i class="fas fa-shield-alt"></i> K80 Protocol
            </div>
            <div class="stream-metrics">
              <div class="metric">
                <i class="fas fa-clock"></i>
                <span>{{ formatDuration(playbackTime) }}</span>
              </div>
              <div class="metric">
                <i class="fas fa-coins"></i>
                <span>{{ formatCost(playbackTime, content.paymentRate) }} ETH</span>
              </div>
            </div>
          </div>
          
          <div class="player-controls">
            <div class="progress-bar">
              <div class="progress" :style="{ width: `${progressPercent}%` }"></div>
            </div>
            <div class="control-buttons">
              <button @click="togglePlayPause">
                <i class="fas" :class="isPaused ? 'fa-play' : 'fa-pause'"></i>
              </button>
              <button @click="rewind10">
                <i class="fas fa-backward"></i> 10s
              </button>
              <button @click="forward10">
                10s <i class="fas fa-forward"></i>
              </button>
              <div class="volume-control">
                <i class="fas" :class="isMuted ? 'fa-volume-mute' : 'fa-volume-up'" @click="toggleMute"></i>
                <input type="range" min="0" max="100" v-model.number="volume" @input="updateVolume">
              </div>
              <button class="fullscreen-btn" @click="toggleFullscreen">
                <i class="fas" :class="isFullscreen ? 'fa-compress' : 'fa-expand'"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <transition name="slide">
      <div class="content-details" v-if="showInfo">
        <div class="details-container">
          <div class="content-description">
            <div class="description-header">
              <h3>About this stream</h3>
              <div class="chain-indicator" v-if="content.chain">
                <img :src="getChainLogo(content.chain)" alt="Chain" class="chain-logo">
                <span>{{ formatChainName(content.chain) }}</span>
              </div>
            </div>
            <p>{{ content.description }}</p>
          </div>
          
          <div class="content-metrics">
            <div class="metric-item">
              <div class="metric-label">Payment Rate</div>
              <div class="metric-value">{{ content.paymentRate }} ETH/min</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">Views</div>
              <div class="metric-value">{{ content.views }}</div>
            </div>
            <div class="metric-item" v-if="content.protocol === 'k80'">
              <div class="metric-label">Distribution Nodes</div>
              <div class="metric-value">{{ content.k80Metrics?.nodes || 0 }}</div>
            </div>
          </div>
          
          <div class="action-buttons">
            <button class="action-btn port-btn" @click="openPortPlanck" v-if="!showPortPlanck">
              <i class="fas fa-broadcast-tower"></i> Bridge to Another Chain
            </button>
            <button class="action-btn fork-btn" @click="forkContent">
              <i class="fas fa-code-branch"></i> Fork Stream
            </button>
            <button class="action-btn testimonial-btn" @click="viewTestimonials">
              <i class="fas fa-comments"></i> Testimonials ({{ content.testimonials?.length || 0 }})
            </button>
            <button class="action-btn dependency-btn" v-if="hasDependencies" @click="viewDependencies">
              <i class="fas fa-cubes"></i> Dependencies ({{ dependencyCount }})
            </button>
          </div>
          
          <!-- Inline Port Planck UI -->
          <div class="inline-port-planck" v-if="showPortPlanck">
            <div class="inline-port-header">
              <h4>Port Planck Bridge</h4>
              <button class="close-inline-port" @click="showPortPlanck = false">
                <i class="fas fa-times"></i>
              </button>
            </div>
            
            <div class="chain-selection">
              <div class="current-chain">
                <div class="chain-label">Current Chain</div>
                <div class="chain-badge">
                  <img :src="getChainLogo(content.chain || 'ethereum')" :alt="content.chain">
                  <span>{{ formatChainName(content.chain || 'ethereum') }}</span>
                </div>
              </div>
              
              <i class="fas fa-arrow-right"></i>
              
              <div class="destination-chain">
                <div class="chain-label">Destination Chain</div>
                <select v-model="bridgeDestination" class="chain-select">
                  <option v-for="chain in availableChains" :key="chain.id" :value="chain.id">
                    {{ chain.name }}
                  </option>
                </select>
              </div>
            </div>
            
            <button class="action-btn open-bridge-btn" @click="initiateFullBridge">
              <i class="fas fa-external-link-alt"></i> Open Full Bridge Interface
            </button>
          </div>
        </div>
      </div>
    </transition>
    
    <div class="theater-chat" v-if="showChat">
      <div class="chat-header">
        <h3>Live Chat</h3>
        <button class="close-chat" @click="showChat = false">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="chat-messages">
        <div v-for="(message, index) in chatMessages" :key="index" class="chat-message">
          <span class="message-author">{{ message.author }}:</span>
          <span class="message-text">{{ message.text }}</span>
        </div>
      </div>
      
      <div class="chat-input">
        <input type="text" v-model="chatInput" placeholder="Type a message..." @keyup.enter="sendChatMessage">
        <button @click="sendChatMessage">
          <i class="fas fa-paper-plane"></i>
        </button>
      </div>
    </div>
    
    <div class="chat-toggle" v-if="!showChat" @click="showChat = true">
      <i class="fas fa-comments"></i>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  content: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['exit', 'fork', 'viewTestimonials', 'viewDependencies', 'openPortPlanck']);
const theme = inject('currentTheme', 'roman-theme');

// UI state
const showInfo = ref(true);
const showChat = ref(false);
const isPlaying = ref(false);
const isPaused = ref(false);
const isFullscreen = ref(false);
const isMuted = ref(false);
const volume = ref(80);
const chatInput = ref('');
const showPortPlanck = ref(false);
const bridgeDestination = ref('polygon');

// Playback state
const playbackTime = ref(0);
const playbackInterval = ref(null);
const progressPercent = ref(0);

// Mock chat messages
const chatMessages = ref([
  { author: 'CryptoFan', text: 'This stream is amazing!' },
  { author: 'BlockchainDev', text: 'Great explanation of the consensus mechanism.' },
  { author: 'ETHMiner', text: 'How would this work with layer 2 solutions?' },
  { author: 'Web3Newbie', text: 'Is there a resource to learn more about this?' },
]);

// Computed properties
const hasDependencies = computed(() => {
  return props.content.dependencies?.length > 0 || props.content.forkedFrom !== undefined;
});

const dependencyCount = computed(() => {
  let count = 0;
  if (props.content.dependencies) {
    count += props.content.dependencies.length;
  }
  if (props.content.forkedFrom !== undefined) {
    count += 1;
  }
  return count;
});

// Chain data
const availableChains = [
  { id: 'ethereum', name: 'Ethereum' },
  { id: 'polygon', name: 'Polygon' },
  { id: 'avalanche', name: 'Avalanche' },
  { id: 'bsc', name: 'Binance Smart Chain' },
  { id: 'solana', name: 'Solana' },
];

// Lifecycle hooks
onMounted(() => {
  document.addEventListener('keydown', handleKeyPress);
  
  // Auto-hide info panel after 5 seconds
  setTimeout(() => {
    if (isPlaying.value) {
      showInfo.value = false;
    }
  }, 5000);
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeyPress);
  stopPlaybackTimer();
});

// Methods
function toggleInfo() {
  showInfo.value = !showInfo.value;
}

function exitTheaterMode() {
  stopPlaybackTimer();
  emit('exit');
}

function startPlaying() {
  isPlaying.value = true;
  isPaused.value = false;
  startPlaybackTimer();
}

function togglePlayPause() {
  isPaused.value = !isPaused.value;
  if (isPaused.value) {
    stopPlaybackTimer();
  } else {
    startPlaybackTimer();
  }
}

function rewind10() {
  playbackTime.value = Math.max(0, playbackTime.value - 10);
  updateProgress();
}

function forward10() {
  playbackTime.value += 10;
  updateProgress();
}

function toggleMute() {
  isMuted.value = !isMuted.value;
}

function updateVolume() {
  // This would connect to actual video player
  console.log(`Volume set to ${volume.value}%`);
  
  // Auto-unmute when volume is changed
  if (volume.value > 0) {
    isMuted.value = false;
  } else {
    isMuted.value = true;
  }
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
  // This would connect to actual fullscreen API
  console.log(`Fullscreen: ${isFullscreen.value}`);
}

function startPlaybackTimer() {
  stopPlaybackTimer(); // Clear any existing timers
  
  playbackInterval.value = setInterval(() => {
    playbackTime.value += 1;
    updateProgress();
  }, 1000);
}

function stopPlaybackTimer() {
  if (playbackInterval.value) {
    clearInterval(playbackInterval.value);
    playbackInterval.value = null;
  }
}

function updateProgress() {
  // Mock progress calculation - in a real player this would be from the video's duration
  const mockDuration = 600; // 10 minutes
  progressPercent.value = Math.min(100, (playbackTime.value / mockDuration) * 100);
}

function handleKeyPress(e) {
  if (!isPlaying.value) return;
  
  switch (e.key) {
    case ' ':
    case 'k':
      togglePlayPause();
      e.preventDefault();
      break;
    case 'f':
      toggleFullscreen();
      e.preventDefault();
      break;
    case 'i':
      toggleInfo();
      e.preventDefault();
      break;
    case 'ArrowLeft':
    case 'j':
      rewind10();
      e.preventDefault();
      break;
    case 'ArrowRight':
    case 'l':
      forward10();
      e.preventDefault();
      break;
    case 'm':
      toggleMute();
      e.preventDefault();
      break;
  }
}

function sendChatMessage() {
  if (!chatInput.value.trim()) return;
  
  chatMessages.value.push({
    author: 'You',
    text: chatInput.value.trim()
  });
  
  chatInput.value = '';
  
  // Auto-scroll chat to bottom
  setTimeout(() => {
    const chatContainer = document.querySelector('.chat-messages');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, 50);
}

function forkContent() {
  emit('fork', props.content);
}

function viewTestimonials() {
  emit('viewTestimonials', props.content);
}

function viewDependencies() {
  emit('viewDependencies', props.content);
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatCost(seconds, rate) {
  if (!rate) return '0.000';
  const minutes = seconds / 60;
  const cost = minutes * rate;
  return cost.toFixed(5);
}

function getChainLogo(chainId) {
  // In a real implementation, we'd use actual logos
  // For now, return a placeholder
  return `https://via.placeholder.com/24x24/3498db/ffffff?text=${chainId[0].toUpperCase()}`;
}

function formatChainName(chainId) {
  if (!chainId) return 'Unknown Chain';
  
  switch(chainId.toLowerCase()) {
    case 'ethereum': return 'Ethereum';
    case 'polygon': return 'Polygon';
    case 'avalanche': return 'Avalanche';
    case 'bsc': return 'Binance Smart Chain';
    case 'solana': return 'Solana';
    default: return chainId;
  }
}

function openPortPlanck() {
  showPortPlanck.value = true;
}

function initiateFullBridge() {
  emit('openPortPlanck', props.content);
  showPortPlanck.value = false;
}
</script>

<style scoped>
.theater-mode {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #000;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  color: #fff;
}

.theater-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background-color: rgba(0, 0, 0, 0.8);
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1110;
  transition: opacity 0.3s;
}

.content-info h2 {
  margin: 0;
  font-size: 1.3rem;
}

.creator {
  margin: 0;
  font-size: 0.9rem;
  color: #ccc;
}

.theater-controls {
  display: flex;
  gap: 10px;
}

.control-btn {
  background: none;
  border: none;
  color: #fff;
  padding: 6px;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.control-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.exit-btn:hover {
  background-color: rgba(255, 0, 0, 0.3);
}

.player-container {
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.video-player {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #000;
}

.player-placeholder {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.player-placeholder img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.no-thumbnail {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.no-thumbnail i {
  font-size: 5rem;
  color: #555;
}

.play-overlay {
  position: absolute;
  width: 80px;
  height: 80px;
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s, background-color 0.2s;
}

.play-overlay i {
  font-size: 2rem;
  color: white;
}

.play-overlay:hover {
  transform: scale(1.1);
  background-color: rgba(25, 118, 210, 0.8);
}

.active-player {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #000;
}

.stream-info {
  position: absolute;
  top: 70px;
  right: 20px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  z-index: 1105;
}

.protocol-badge {
  background-color: rgba(25, 118, 210, 0.8);
  color: white;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.stream-metrics {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: rgba(0, 0, 0, 0.6);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.9rem;
}

.player-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  overflow: hidden;
  cursor: pointer;
}

.progress {
  height: 100%;
  background-color: #1976d2;
  transition: width 0.1s linear;
}

.control-buttons {
  display: flex;
  align-items: center;
  gap: 15px;
}

.control-buttons button {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 0.95rem;
  padding: 5px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: background-color 0.2s;
}

.control-buttons button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.volume-control i {
  cursor: pointer;
  width: 24px;
  text-align: center;
}

.volume-control input[type="range"] {
  width: 80px;
  cursor: pointer;
}

.fullscreen-btn {
  margin-left: 10px;
}

.content-details {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.85);
  color: white;
  transition: transform 0.3s ease-out;
  z-index: 1105;
  max-height: 40%;
}

.details-container {
  padding: 20px;
  max-height: calc(40vh - 40px);
  overflow-y: auto;
}

.content-description h3 {
  margin: 0 0 10px 0;
  font-size: 1.1rem;
}

.content-description p {
  margin: 0 0 15px 0;
  line-height: 1.5;
  font-size: 0.95rem;
  color: #ddd;
}

.content-metrics {
  display: flex;
  gap: 20px;
  margin: 15px 0;
  flex-wrap: wrap;
}

.metric-item {
  padding: 10px 15px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  min-width: 120px;
}

.metric-label {
  color: #bbb;
  font-size: 0.8rem;
  margin-bottom: 4px;
}

.metric-value {
  font-size: 1.1rem;
  font-weight: 500;
}

.action-buttons {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.action-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background-color 0.2s;
  font-size: 0.9rem;
}

.fork-btn {
  background-color: #64b5f6;
  color: white;
}

.fork-btn:hover {
  background-color: #42a5f5;
}

.testimonial-btn {
  background-color: #4CAF50;
  color: white;
}

.testimonial-btn:hover {
  background-color: #43A047;
}

.dependency-btn {
  background-color: #FF9800;
  color: white;
}

.dependency-btn:hover {
  background-color: #F57C00;
}

.port-btn {
  background-color: #3498db;
  color: white;
}

.port-btn:hover {
  background-color: #2980b9;
}

.inline-port-planck {
  margin-top: 15px;
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 15px;
}

.inline-port-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.inline-port-header h4 {
  margin: 0;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.close-inline-port {
  background: none;
  border: none;
  color: #ccc;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.close-inline-port:hover {
  opacity: 1;
  color: white;
}

.chain-selection {
  display: flex;
  align-items: center;
  justify-content: space-around;
  margin-bottom: 15px;
  gap: 15px;
}

.chain-selection .fas {
  color: #3498db;
}

.chain-label {
  font-size: 0.85rem;
  color: #bbb;
  margin-bottom: 5px;
}

.chain-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: rgba(255, 255, 255, 0.1);
  padding: 6px 12px;
  border-radius: 6px;
}

.chain-select {
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 6px 8px;
  color: white;
  border-radius: 6px;
  width: 100%;
  cursor: pointer;
}

.chain-select option {
  background-color: #333;
  color: white;
}

.open-bridge-btn {
  width: 100%;
  padding: 8px;
  background-color: #3498db;
  margin-top: 10px;
}

.open-bridge-btn:hover {
  background-color: #2980b9;
}

.theater-chat {
  position: absolute;
  top: 70px;
  right: 0;
  bottom: 0;
  width: 300px;
  background-color: rgba(0, 0, 0, 0.85);
  z-index: 1106;
  display: flex;
  flex-direction: column;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.chat-header {
  padding: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-header h3 {
  margin: 0;
  font-size: 1rem;
}

.close-chat {
  background: none;
  border: none;
  color: #ccc;
  cursor: pointer;
  font-size: 0.9rem;
}

.close-chat:hover {
  color: white;
}

.chat-messages {
  flex-grow: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.chat-message {
  margin-bottom: 8px;
  line-height: 1.4;
  font-size: 0.9rem;
}

.message-author {
  font-weight: bold;
  color: #64b5f6;
}

.message-text {
  color: #eee;
}

.chat-input {
  display: flex;
  padding: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.chat-input input {
  flex-grow: 1;
  padding: 8px 10px;
  border: none;
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 4px 0 0 4px;
}

.chat-input button {
  padding: 8px 12px;
  border: none;
  background-color: #1976d2;
  color: white;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
}

.chat-input button:hover {
  background-color: #1565C0;
}

.chat-toggle {
  position: absolute;
  bottom: 80px;
  right: 20px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: rgba(25, 118, 210, 0.8);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  z-index: 1106;
  transition: transform 0.2s;
}

.chat-toggle:hover {
  transform: scale(1.1);
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateY(100%);
}

/* Roman theme overrides */
.roman-theme .protocol-badge {
  background-color: rgba(139, 69, 19, 0.85);
}

.roman-theme .progress {
  background-color: #8B4513;
}

.roman-theme .play-overlay:hover {
  background-color: rgba(139, 69, 19, 0.85);
}

.roman-theme .fork-btn {
  background-color: #CD853F;
}

.roman-theme .fork-btn:hover {
  background-color: #D2B48C;
}

.roman-theme .testimonial-btn {
  background-color: #8B4513;
}

.roman-theme .testimonial-btn:hover {
  background-color: #A0522D;
}

.roman-theme .dependency-btn {
  background-color: #A0522D;
}

.roman-theme .dependency-btn:hover {
  background-color: #CD853F;
}

.roman-theme .message-author {
  color: #CD853F;
}

.roman-theme .chat-input button,
.roman-theme .chat-toggle {
  background-color: #8B4513;
}

.roman-theme .chat-input button:hover {
  background-color: #A0522D;
}

.roman-theme .chain-selection .fas {
  color: #8B4513;
}

.roman-theme .port-btn,
.roman-theme .open-bridge-btn {
  background-color: #6B8E23;
}

.roman-theme .port-btn:hover,
.roman-theme .open-bridge-btn:hover {
  background-color: #556B2F;
}

@media (max-width: 768px) {
  .theater-chat {
    width: 100%;
    bottom: 70px;
    top: auto;
    height: 300px;
    border-left: none;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .content-metrics {
    flex-direction: column;
    gap: 10px;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 10px;
  }
  
  .volume-control input[type="range"] {
    width: 60px;
  }
  
  .control-buttons {
    gap: 10px;
  }
}

@media (max-width: 480px) {
  .theater-header {
    padding: 8px 10px;
  }
  
  .content-info h2 {
    font-size: 1rem;
  }
  
  .creator {
    font-size: 0.8rem;
  }
  
  .player-controls {
    padding: 10px;
  }
  
  .control-buttons button {
    font-size: 0.85rem;
    padding: 3px;
  }
}
</style>
