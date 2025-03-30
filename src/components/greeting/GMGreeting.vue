<template>
  <div class="gm-greeting" :class="{ 'visible': isVisible, 'minimized': isMinimized }">
    <div class="gm-header">
      <div class="gm-title">
        <span class="gm-emoji">☀️</span>
        <h2>{{ greeting }}</h2>
      </div>
      <div class="gm-actions">
        <button @click="minimize" class="minimize-btn" v-if="!isMinimized">_</button>
        <button @click="expand" class="expand-btn" v-else>□</button>
        <button @click="close" class="close-btn">×</button>
      </div>
    </div>
    
    <div class="gm-content" v-if="!isMinimized">
      <div class="gm-message">{{ personalMessage }}</div>
      
      <div class="gm-market-updates">
        <h3>This Morning in Web3</h3>
        
        <div v-if="loading" class="loading-spinner"></div>
        
        <div v-else>
          <div class="market-update-grid">
            <div class="market-item" v-for="(item, index) in marketUpdates" :key="index">
              <div class="market-icon" v-html="item.icon"></div>
              <div class="market-label">{{ item.label }}</div>
              <div class="market-value" :class="{ 'positive': item.change > 0, 'negative': item.change < 0 }">
                {{ item.value }}
                <span class="market-change" v-if="item.change !== undefined">
                  {{ item.change > 0 ? '↑' : '↓' }} {{ Math.abs(item.change).toFixed(2) }}%
                </span>
              </div>
            </div>
          </div>
          
          <div class="block-info">
            <div class="block-stat">
              <span class="block-label">Latest Block:</span>
              <span class="block-value">{{ blockInfo.latestBlock }}</span>
            </div>
            <div class="block-stat">
              <span class="block-label">Gas:</span>
              <span class="block-value">{{ blockInfo.gasPrice }} gwei</span>
            </div>
          </div>
          
          <div class="daily-insight">
            <p>"{{ dailyInsight }}"</p>
          </div>
        </div>
      </div>
    </div>
    
    <div class="gm-footer" v-if="!isMinimized">
      <div class="gm-time">{{ currentTime }}</div>
      <button @click="refresh" class="refresh-btn" :disabled="loading">
        <span v-if="loading" class="btn-loading"></span>
        <span v-else>Refresh</span>
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed, onBeforeUnmount } from 'vue';
import { morningStatsService } from '../../services/MorningStatsService';

export default defineComponent({
  name: 'GMGreeting',
  
  props: {
    username: {
      type: String,
      default: ''
    },
    autoHide: {
      type: Boolean,
      default: true
    },
    hideAfterSeconds: {
      type: Number,
      default: 30
    }
  },
  
  setup(props) {
    const isVisible = ref(false);
    const isMinimized = ref(false);
    const loading = ref(true);
    const marketUpdates = ref<any[]>([]);
    const blockInfo = ref({ latestBlock: 0, gasPrice: 0 });
    const dailyInsight = ref('');
    const hideTimer = ref<number | null>(null);
    const currentTime = ref('');
    const clockInterval = ref<number | null>(null);
    
    const greeting = computed(() => {
      const hour = new Date().getHours();
      
      if (hour < 12) return 'gm';
      if (hour < 17) return 'ga';
      return 'gn';
    });
    
    const personalMessage = computed(() => {
      if (!props.username) {
        return `Welcome to a new day in Web3!`;
      }
      return `Welcome back, ${props.username}! Ready for another day of building?`;
    });
    
    const loadMorningStats = async () => {
      loading.value = true;
      
      try {
        const stats = await morningStatsService.getMorningStats();
        marketUpdates.value = [
          {
            icon: '₿',
            label: 'Bitcoin',
            value: `$${stats.bitcoin.price.toLocaleString()}`,
            change: stats.bitcoin.change24h
          },
          {
            icon: 'Ξ',
            label: 'Ethereum',
            value: `$${stats.ethereum.price.toLocaleString()}`,
            change: stats.ethereum.change24h
          },
          {
            icon: '📊',
            label: 'Market Cap',
            value: `$${(stats.totalMarketCap / 1e12).toFixed(2)}T`,
            change: stats.marketCapChange24h
          },
          {
            icon: '🔥',
            label: 'Gas',
            value: `${stats.gasPrice} gwei`,
          }
        ];
        
        blockInfo.value = {
          latestBlock: stats.latestBlock,
          gasPrice: stats.gasPrice
        };
        
        dailyInsight.value = stats.dailyInsight || getDefaultInsight();
      } catch (error) {
        console.error('Failed to load morning stats:', error);
        marketUpdates.value = getDefaultMarketData();
        dailyInsight.value = getDefaultInsight();
      } finally {
        loading.value = false;
      }
    };
    
    const getDefaultMarketData = () => {
      return [
        { icon: '₿', label: 'Bitcoin', value: '$--,---', change: 0 },
        { icon: 'Ξ', label: 'Ethereum', value: '$-,---', change: 0 },
        { icon: '📊', label: 'Market Cap', value: '$-.--T', change: 0 },
        { icon: '🔥', label: 'Gas', value: '-- gwei' }
      ];
    };
    
    const getDefaultInsight = () => {
      const insights = [
        "Build in the bear, thrive in the bull.",
        "Focus on fundamentals, not just price action.",
        "The best Web3 projects solve real problems.",
        "Decentralization is a journey, not a destination."
      ];
      
      return insights[Math.floor(Math.random() * insights.length)];
    };
    
    const updateClock = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      };
      currentTime.value = now.toLocaleTimeString(undefined, options);
    };
    
    const minimize = () => {
      isMinimized.value = true;
      // Clear auto-hide timer when minimized
      if (hideTimer.value) {
        window.clearTimeout(hideTimer.value);
        hideTimer.value = null;
      }
    };
    
    const expand = () => {
      isMinimized.value = false;
      // Set auto-hide timer again if needed
      if (props.autoHide) {
        startHideTimer();
      }
    };
    
    const close = () => {
      isVisible.value = false;
      if (hideTimer.value) {
        window.clearTimeout(hideTimer.value);
        hideTimer.value = null;
      }
    };
    
    const refresh = () => {
      loadMorningStats();
      
      // Reset auto-hide timer
      if (props.autoHide) {
        if (hideTimer.value) {
          window.clearTimeout(hideTimer.value);
        }
        startHideTimer();
      }
    };
    
    const startHideTimer = () => {
      if (props.autoHide && !isMinimized.value) {
        hideTimer.value = window.setTimeout(() => {
          minimize();
        }, props.hideAfterSeconds * 1000);
      }
    };
    
    onMounted(async () => {
      await loadMorningStats();
      isVisible.value = true;
      startHideTimer();
      
      // Start clock update
      updateClock();
      clockInterval.value = window.setInterval(updateClock, 60000);
    });
    
    onBeforeUnmount(() => {
      if (hideTimer.value) {
        window.clearTimeout(hideTimer.value);
      }
      
      if (clockInterval.value) {
        window.clearInterval(clockInterval.value);
      }
    });
    
    return {
      isVisible,
      isMinimized,
      loading,
      greeting,
      personalMessage,
      marketUpdates,
      blockInfo,
      dailyInsight,
      currentTime,
      minimize,
      expand,
      close,
      refresh
    };
  }
});
</script>

<style scoped>
.gm-greeting {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: white;
  width: 380px;
  border-radius: 12px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  z-index: 1000;
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.3s ease, transform 0.3s ease;
  border: 1px solid #eaeaea;
}

.gm-greeting.visible {
  opacity: 1;
  transform: translateY(0);
}

.gm-greeting.minimized {
  width: 180px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
}

.gm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f7931a11 0%, #f7931a22 100%);
  border-bottom: 1px solid #f7931a33;
}

.gm-title {
  display: flex;
  align-items: center;
}

.gm-emoji {
  font-size: 1.2rem;
  margin-right: 8px;
}

.gm-title h2 {
  margin: 0;
  font-size: 1.3rem;
  color: #f7931a;
  font-weight: 700;
}

.gm-actions {
  display: flex;
  gap: 8px;
}

.gm-actions button {
  background: transparent;
  border: none;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  color: #666;
  font-size: 1rem;
}

.gm-actions button:hover {
  background: rgba(0, 0, 0, 0.05);
}

.gm-content {
  padding: 16px;
}

.gm-message {
  margin-bottom: 16px;
  font-size: 0.95rem;
  color: #333;
}

.gm-market-updates h3 {
  margin-top: 0;
  margin-bottom: 12px;
  font-size: 1rem;
  color: #444;
}

.market-update-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 15px;
}

.market-item {
  background: #f9f9f9;
  padding: 10px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
}

.market-icon {
  font-size: 1.5rem;
  margin-bottom: 5px;
  color: #666;
}

.market-label {
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 5px;
}

.market-value {
  font-weight: 600;
  font-size: 0.95rem;
  color: #333;
  display: flex;
  justify-content: space-between;
}

.market-change {
  font-size: 0.8rem;
}

.positive {
  color: #4caf50;
}

.negative {
  color: #f44336;
}

.block-info {
  background: #f5f5f5;
  padding: 10px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
}

.block-stat {
  font-size: 0.85rem;
}

.block-label {
  color: #666;
  margin-right: 5px;
}

.block-value {
  font-weight: 600;
  color: #333;
}

.daily-insight {
  background: #f7931a11;
  padding: 12px;
  border-radius: 8px;
  border-left: 3px solid #f7931a;
}

.daily-insight p {
  margin: 0;
  font-size: 0.9rem;
  color: #333;
  font-style: italic;
}

.gm-footer {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f9f9f9;
  border-top: 1px solid #eaeaea;
}

.gm-time {
  font-size: 0.9rem;
  color: #666;
}

.refresh-btn {
  background: #f0f0f0;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  color: #555;
  transition: background 0.2s;
}

.refresh-btn:hover {
  background: #e0e0e0;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-spinner, .btn-loading {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(247, 147, 26, 0.2);
  border-top-color: #f7931a;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.btn-loading {
  width: 12px;
  height: 12px;
  border-width: 1px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
