<template>
  <div class="hologram-container" :class="theme">
    <div class="hologram-base">
      <div class="hologram-glow"></div>
      
      <div class="hologram-projection" :class="{ 'hologram-rotating': autoRotate }">
        <!-- Content Image Hologram -->
        <template v-if="type === 'content'">
          <div class="hologram-content">
            <img 
              v-if="content.thumbnail" 
              :src="content.thumbnail" 
              :alt="content.title"
              @error="e => e.target.src = 'https://via.placeholder.com/300x180?text=Hologram'"
            >
            <div v-else class="hologram-placeholder">
              <i class="fas fa-photo-video"></i>
            </div>
            <div class="content-info">
              <h3>{{ content.title }}</h3>
              <p>{{ content.creator }}</p>
            </div>
          </div>
        </template>
        
        <!-- Investment Hologram -->
        <template v-else-if="type === 'investment'">
          <div class="hologram-investment">
            <div class="investment-chart">
              <canvas ref="chartCanvas" height="200" width="200"></canvas>
            </div>
            <div class="investment-value">
              <div class="value-label">Current Value</div>
              <div class="value-amount">{{ formatEth(investment.currentValue) }} ETH</div>
              <div :class="['value-change', getChangeClass(investment.roi)]">
                {{ formatChange(investment.roi) }}
              </div>
            </div>
          </div>
        </template>
        
        <!-- Profile Hologram -->
        <template v-else-if="type === 'profile'">
          <div class="hologram-profile">
            <div class="profile-avatar">
              <img 
                v-if="profile.avatar" 
                :src="profile.avatar" 
                :alt="profile.name"
                @error="e => e.target.src = 'https://via.placeholder.com/200x200?text=User'"
              >
              <div v-else class="avatar-placeholder">
                <i class="fas fa-user"></i>
              </div>
            </div>
            <div class="profile-details">
              <div class="profile-name">{{ profile.name }}</div>
              <div class="profile-role">{{ profile.role || 'Member' }}</div>
              <div class="profile-stats">
                <div class="stat">
                  <div class="stat-value">{{ profile.contentCount || 0 }}</div>
                  <div class="stat-label">Streams</div>
                </div>
                <div class="stat">
                  <div class="stat-value">{{ profile.followers || 0 }}</div>
                  <div class="stat-label">Followers</div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
    
    <div class="hologram-controls">
      <button class="control-btn" @click="autoRotate = !autoRotate" :title="autoRotate ? 'Stop rotation' : 'Start rotation'">
        <i class="fas" :class="autoRotate ? 'fa-pause' : 'fa-play'"></i>
      </button>
      <button class="control-btn" @click="toggleFullscreen" :title="isFullscreen ? 'Exit fullscreen' : 'Fullscreen'">
        <i class="fas" :class="isFullscreen ? 'fa-compress' : 'fa-expand'"></i>
      </button>
      <button v-if="interactive" class="control-btn" @click="interactWithHologram" title="Interact">
        <i class="fas fa-hand-pointer"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, inject } from 'vue';
import Chart from 'chart.js/auto';

const props = defineProps({
  type: {
    type: String,
    default: 'content',
    validator: (value) => ['content', 'investment', 'profile'].includes(value)
  },
  content: {
    type: Object,
    default: () => ({})
  },
  investment: {
    type: Object,
    default: () => ({})
  },
  profile: {
    type: Object,
    default: () => ({})
  },
  interactive: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['interact']);
const theme = inject('currentTheme', 'roman-theme');

// State
const autoRotate = ref(true);
const isFullscreen = ref(false);
const chartInstance = ref(null);
const chartCanvas = ref(null);

// Initialize chart if investment type
onMounted(() => {
  if (props.type === 'investment' && chartCanvas.value) {
    initInvestmentChart();
  }
  
  // Handle escape key for fullscreen
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  if (chartInstance.value) {
    chartInstance.value.destroy();
  }
  
  window.removeEventListener('keydown', handleKeyDown);
});

// Watch for changes to investment data and update chart
watch(() => props.investment, (newVal) => {
  if (props.type === 'investment' && chartInstance.value) {
    updateInvestmentChart();
  }
}, { deep: true });

// Methods
function formatEth(value) {
  if (value === undefined || value === null) return '0.000';
  return parseFloat(value).toFixed(3);
}

function getChangeClass(change) {
  if (change > 0) return 'positive-change';
  if (change < 0) return 'negative-change';
  return '';
}

function formatChange(change) {
  if (change === undefined || change === null) return '0.00%';
  const prefix = change >= 0 ? '+' : '';
  return `${prefix}${parseFloat(change).toFixed(2)}%`;
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
  
  const container = document.querySelector('.hologram-container');
  
  if (isFullscreen.value) {
    if (container.requestFullscreen) {
      container.requestFullscreen();
    } else if (container.webkitRequestFullscreen) {
      container.webkitRequestFullscreen();
    } else if (container.msRequestFullscreen) {
      container.msRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }
}

function handleKeyDown(e) {
  if (e.key === 'Escape' && isFullscreen.value) {
    isFullscreen.value = false;
  }
}

function interactWithHologram() {
  emit('interact', {
    type: props.type,
    data: props.type === 'content' ? props.content : 
          props.type === 'investment' ? props.investment : props.profile
  });
}

function initInvestmentChart() {
  // Generate some mock historical data
  const labels = [];
  const data = [];
  const today = new Date();
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    labels.push(date.toLocaleDateString());
    
    // Generate investment value data with some randomness
    const value = props.investment.amount || 1;
    const growthFactor = 1 + (props.investment.roi || 0) / 100 * (30 - i) / 30;
    
    // Add some random noise to make it look realistic
    const randomNoise = (Math.random() * 0.1) - 0.05; // -5% to +5% noise
    const dataPoint = value * growthFactor * (1 + randomNoise);
    data.push(parseFloat(dataPoint.toFixed(3)));
  }
  
  // Create the chart
  chartInstance.value = new Chart(chartCanvas.value, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Investment Value',
        data: data,
        borderColor: theme.value.includes('roman') ? '#8B4513' : '#3498db',
        backgroundColor: theme.value.includes('roman') ? 'rgba(139, 69, 19, 0.1)' : 'rgba(52, 152, 219, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: true,
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += context.parsed.y.toFixed(3) + ' ETH';
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          display: false
        },
        y: {
          display: false,
          beginAtZero: false
        }
      },
      animation: {
        duration: 2000,
        easing: 'easeOutQuart'
      }
    }
  });
}

function updateInvestmentChart() {
  if (!chartInstance.value) return;
  
  // Update chart data here
  initInvestmentChart(); // For simplicity we're just recreating the chart
}
</script>

<style scoped>
.hologram-container {
  position: relative;
  width: 300px;
  height: 400px;
  margin: 0 auto;
  perspective: 1000px;
}

.hologram-base {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  transform-style: preserve-3d;
}

.hologram-base::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  height: 10px;
  background: radial-gradient(ellipse at center, rgba(0, 150, 255, 0.5) 0%, transparent 70%);
  border-radius: 50%;
  filter: blur(8px);
}

.hologram-glow {
  position: absolute;
  width: 60%;
  height: 20px;
  bottom: 10px;
  background: radial-gradient(ellipse at center, rgba(0, 150, 255, 0.6) 0%, transparent 70%);
  border-radius: 50%;
  filter: blur(10px);
  animation: pulse 3s infinite alternate;
}

.hologram-projection {
  position: absolute;
  bottom: 20px;
  width: 200px;
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-style: preserve-3d;
  animation: float 6s ease-in-out infinite;
  transform: translateY(-10px);
  opacity: 0.9;
}

.hologram-rotating {
  animation: float 6s ease-in-out infinite, rotate 15s linear infinite;
}

@keyframes pulse {
  0% { opacity: 0.6; transform: scale(0.95); }
  100% { opacity: 0.9; transform: scale(1.05); }
}

@keyframes float {
  0% { transform: translateY(-10px); }
  50% { transform: translateY(-20px); }
  100% { transform: translateY(-10px); }
}

@keyframes rotate {
  0% { transform: rotateY(0deg) translateY(-10px); }
  50% { transform: rotateY(180deg) translateY(-20px); }
  100% { transform: rotateY(360deg) translateY(-10px); }
}

/* Content hologram styles */
.hologram-content {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  color: rgba(0, 210, 255, 0.9);
  text-shadow: 0 0 10px rgba(0, 210, 255, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.hologram-content img,
.hologram-placeholder {
  width: 90%;
  height: 60%;
  object-fit: cover;
  border: 1px solid rgba(0, 210, 255, 0.4);
  border-radius: 10px;
  box-shadow: 0 0 15px rgba(0, 150, 255, 0.5);
  filter: brightness(1.2) contrast(1.1) hue-rotate(10deg);
}

.hologram-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  background: linear-gradient(45deg, rgba(0, 60, 100, 0.3), rgba(0, 150, 255, 0.3));
}

.content-info {
  margin-top: 20px;
  text-align: center;
  width: 90%;
}

.content-info h3 {
  font-size: 1.2rem;
  margin: 0 0 5px 0;
}

.content-info p {
  font-size: 0.9rem;
  margin: 0;
  opacity: 0.8;
}

/* Investment hologram styles */
.hologram-investment {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(0, 210, 255, 0.9);
  text-shadow: 0 0 10px rgba(0, 210, 255, 0.7);
}

.investment-chart {
  width: 90%;
  height: 50%;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(0, 210, 255, 0.4);
  box-shadow: 0 0 15px rgba(0, 150, 255, 0.5);
}

.investment-value {
  margin-top: 20px;
  text-align: center;
  width: 90%;
}

.value-label {
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 5px;
}

.value-amount {
  font-size: 1.6rem;
  font-weight: bold;
  margin-bottom: 5px;
}

.value-change {
  font-size: 1rem;
}

.positive-change {
  color: rgba(0, 255, 150, 0.9);
  text-shadow: 0 0 10px rgba(0, 255, 150, 0.7);
}

.negative-change {
  color: rgba(255, 80, 80, 0.9);
  text-shadow: 0 0 10px rgba(255, 80, 80, 0.7);
}

/* Profile hologram styles */
.hologram-profile {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(0, 210, 255, 0.9);
  text-shadow: 0 0 10px rgba(0, 210, 255, 0.7);
}

.profile-avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid rgba(0, 210, 255, 0.4);
  box-shadow: 0 0 15px rgba(0, 150, 255, 0.5);
  margin-bottom: 20px;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(1.2) contrast(1.1) hue-rotate(10deg);
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  background: linear-gradient(45deg, rgba(0, 60, 100, 0.3), rgba(0, 150, 255, 0.3));
}

.profile-details {
  text-align: center;
  width: 90%;
}

.profile-name {
  font-size: 1.3rem;
  font-weight: bold;
  margin-bottom: 5px;
}

.profile-role {
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 15px;
}

.profile-stats {
  display: flex;
  justify-content: space-around;
  width: 100%;
}

.stat {
  text-align: center;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: bold;
}

.stat-label {
  font-size: 0.8rem;
  opacity: 0.8;
}

/* Controls */
.hologram-controls {
  position: absolute;
  bottom: -40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
}

.control-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(0, 150, 255, 0.4);
  background-color: rgba(0, 30, 60, 0.3);
  color: rgba(0, 210, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 0 10px rgba(0, 150, 255, 0.3);
}

.control-btn:hover {
  background-color: rgba(0, 60, 100, 0.5);
  box-shadow: 0 0 15px rgba(0, 150, 255, 0.5);
}

/* Roman theme overrides */
.roman-theme .hologram-glow {
  background: radial-gradient(ellipse at center, rgba(255, 150, 0, 0.6) 0%, transparent 70%);
}

.roman-theme .hologram-base::after {
  background: radial-gradient(ellipse at center, rgba(255, 150, 0, 0.5) 0%, transparent 70%);
}

.roman-theme .hologram-content,
.roman-theme .hologram-investment,
.roman-theme .hologram-profile {
  color: rgba(255, 200, 100, 0.9);
  text-shadow: 0 0 10px rgba(255, 150, 0, 0.7);
}

.roman-theme .hologram-content img,
.roman-theme .hologram-placeholder,
.roman-theme .investment-chart,
.roman-theme .profile-avatar {
  border-color: rgba(255, 150, 0, 0.4);
  box-shadow: 0 0 15px rgba(255, 150, 0, 0.5);
}

.roman-theme .hologram-placeholder,
.roman-theme .avatar-placeholder {
  background: linear-gradient(45deg, rgba(100, 60, 0, 0.3), rgba(255, 150, 0, 0.3));
}

.roman-theme .positive-change {
  color: rgba(150, 255, 100, 0.9);
  text-shadow: 0 0 10px rgba(150, 255, 0, 0.7);
}

.roman-theme .control-btn {
  border-color: rgba(255, 150, 0, 0.4);
  background-color: rgba(60, 30, 0, 0.3);
  color: rgba(255, 200, 100, 0.9);
  box-shadow: 0 0 10px rgba(255, 150, 0, 0.3);
}

.roman-theme .control-btn:hover {
  background-color: rgba(100, 60, 0, 0.5);
  box-shadow: 0 0 15px rgba(255, 150, 0, 0.5);
}

/* Fullscreen styles */
.hologram-container:fullscreen {
  width: 100%;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.9);
}

.hologram-container:fullscreen .hologram-projection {
  width: 50vh;
  height: 70vh;
  bottom: 15vh;
}

.hologram-container:fullscreen .hologram-glow {
  width: 40vh;
  height: 10vh;
  bottom: 15vh;
}

/* Responsive styles */
@media (max-width: 400px) {
  .hologram-container {
    width: 250px;
    height: 350px;
  }
  
  .hologram-projection {
    width: 180px;
    height: 270px;
  }
}
</style>
