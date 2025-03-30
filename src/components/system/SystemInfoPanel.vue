<template>
  <div class="system-info-panel">
    <div class="panel-header">
      <h3>System Information</h3>
      <div class="system-badge" :class="systemInfo.os">
        {{ getOSDisplayName(systemInfo.os) }}
      </div>
    </div>
    
    <div class="panel-content">
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">OS Version</div>
          <div class="info-value">{{ systemInfo.version || 'Unknown' }}</div>
        </div>
        
        <div class="info-item">
          <div class="info-label">Environment</div>
          <div class="info-value">
            <span v-if="systemInfo.isBrowser">Browser</span>
            <span v-else-if="systemInfo.isNode">Node.js</span>
            <span v-else>Unknown</span>
          </div>
        </div>
        
        <div class="info-item" v-if="systemInfo.cpuCores">
          <div class="info-label">CPU Cores</div>
          <div class="info-value">{{ systemInfo.cpuCores }}</div>
        </div>
        
        <div class="info-item" v-if="systemInfo.memoryGB">
          <div class="info-label">Memory</div>
          <div class="info-value">{{ systemInfo.memoryGB }} GB</div>
        </div>
        
        <div class="info-item">
          <div class="info-label">Device Type</div>
          <div class="info-value">
            {{ systemInfo.isDesktop ? 'Desktop' : systemInfo.isMobile ? 'Mobile' : 'Unknown' }}
          </div>
        </div>
      </div>
      
      <div class="system-metrics" v-if="performanceMetrics">
        <h4>System Performance</h4>
        
        <div class="metric-item" v-if="performanceMetrics.memoryUsage !== undefined">
          <div class="metric-label">Memory Usage</div>
          <div class="metric-gauge">
            <div 
              class="gauge-fill" 
              :style="{ width: performanceMetrics.memoryUsage + '%' }"
              :class="getMemoryUsageClass(performanceMetrics.memoryUsage)"
            ></div>
          </div>
          <div class="metric-value">{{ performanceMetrics.memoryUsage }}%</div>
        </div>
        
        <div class="metric-item" v-if="performanceMetrics.cpuUsage !== undefined">
          <div class="metric-label">CPU Usage</div>
          <div class="metric-gauge">
            <div 
              class="gauge-fill"
              :style="{ width: performanceMetrics.cpuUsage + '%' }"
              :class="getCpuUsageClass(performanceMetrics.cpuUsage)"
            ></div>
          </div>
          <div class="metric-value">{{ performanceMetrics.cpuUsage }}%</div>
        </div>
        
        <div class="metric-item" v-if="performanceMetrics.availableMemoryGB !== undefined">
          <div class="metric-label">Available Memory</div>
          <div class="metric-value">{{ performanceMetrics.availableMemoryGB }} GB</div>
        </div>
      </div>
      
      <div class="system-compatibility" v-if="compatibilityInfo">
        <h4>Streaming Compatibility</h4>
        
        <div 
          class="compatibility-status"
          :class="{ compatible: compatibilityInfo.meets, incompatible: !compatibilityInfo.meets }"
        >
          {{ compatibilityInfo.meets ? 'Compatible' : 'Limited Compatibility' }}
        </div>
        
        <div class="compatibility-issues" v-if="compatibilityInfo.issues.length > 0">
          <div class="issue-item" v-for="(issue, index) in compatibilityInfo.issues" :key="index">
            <span class="issue-icon">⚠️</span>
            <span class="issue-text">{{ issue }}</span>
          </div>
        </div>
        
        <div class="compatibility-note" v-if="compatibilityInfo.issues.length > 0">
          Your system may experience limited performance during high-quality streaming.
        </div>
      </div>
    </div>
    
    <div class="panel-actions">
      <button @click="refreshData" class="refresh-button">
        <span v-if="isRefreshing" class="loading-spinner"></span>
        <span v-else>Refresh Data</span>
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue';
import { 
  getSystemInfo, 
  getPerformanceMetrics, 
  meetsMinimumRequirements,
  OSType,
  SystemInfo
} from '../../utils/OSUtils';

export default defineComponent({
  name: 'SystemInfoPanel',
  
  setup() {
    const systemInfo = ref(SystemInfo);
    const performanceMetrics = ref<any>(null);
    const compatibilityInfo = ref<any>(null);
    const isRefreshing = ref(false);
    let metricsInterval: number | null = null;
    
    const getOSDisplayName = (osType: OSType) => {
      switch (osType) {
        case OSType.WINDOWS: return 'Windows';
        case OSType.MACOS: return 'macOS';
        case OSType.LINUX: return 'Linux';
        case OSType.ANDROID: return 'Android';
        case OSType.IOS: return 'iOS';
        default: return 'Unknown';
      }
    };
    
    const getMemoryUsageClass = (usage: number) => {
      if (usage < 60) return 'good';
      if (usage < 85) return 'warning';
      return 'critical';
    };
    
    const getCpuUsageClass = (usage: number) => {
      if (usage < 70) return 'good';
      if (usage < 90) return 'warning';
      return 'critical';
    };
    
    const refreshData = async () => {
      isRefreshing.value = true;
      
      try {
        systemInfo.value = getSystemInfo();
        performanceMetrics.value = await getPerformanceMetrics();
        compatibilityInfo.value = meetsMinimumRequirements();
      } finally {
        isRefreshing.value = false;
      }
    };
    
    onMounted(async () => {
      await refreshData();
      
      // Update metrics every 30 seconds
      metricsInterval = window.setInterval(async () => {
        performanceMetrics.value = await getPerformanceMetrics();
      }, 30000);
    });
    
    onUnmounted(() => {
      if (metricsInterval !== null) {
        clearInterval(metricsInterval);
      }
    });
    
    return {
      systemInfo,
      performanceMetrics,
      compatibilityInfo,
      isRefreshing,
      getOSDisplayName,
      getMemoryUsageClass,
      getCpuUsageClass,
      refreshData
    };
  }
});
</script>

<style scoped>
.system-info-panel {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.panel-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.25rem;
}

.system-badge {
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  color: white;
}

.system-badge.windows {
  background: #0078d7;
}

.system-badge.macos {
  background: #007aff;
}

.system-badge.linux {
  background: #f57900;
}

.system-badge.android {
  background: #3ddc84;
  color: #000;
}

.system-badge.ios {
  background: #000;
}

.system-badge.unknown {
  background: #888;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.info-item {
  padding: 0.75rem;
  border-radius: 8px;
  background: #f7f7f7;
}

.info-label {
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 0.25rem;
}

.info-value {
  font-weight: 600;
  color: #333;
}

.system-metrics {
  margin-bottom: 1.5rem;
}

.system-metrics h4 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1rem;
  color: #555;
}

.metric-item {
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.metric-label {
  width: 120px;
  font-size: 0.9rem;
}

.metric-gauge {
  flex: 1;
  height: 8px;
  background: #eee;
  border-radius: 4px;
  overflow: hidden;
}

.gauge-fill {
  height: 100%;
  border-radius: 4px;
}

.gauge-fill.good {
  background: #4caf50;
}

.gauge-fill.warning {
  background: #ff9800;
}

.gauge-fill.critical {
  background: #f44336;
}

.metric-value {
  width: 60px;
  text-align: right;
  font-weight: 600;
  font-size: 0.9rem;
}

.system-compatibility h4 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1rem;
  color: #555;
}

.compatibility-status {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-weight: 600;
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
}

.compatibility-status.compatible {
  background: #e8f5e9;
  color: #2e7d32;
}

.compatibility-status.incompatible {
  background: #fff8e1;
  color: #f57c00;
}

.compatibility-issues {
  margin-bottom: 0.75rem;
}

.issue-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: #f57c00;
}

.compatibility-note {
  font-size: 0.85rem;
  color: #666;
  font-style: italic;
}

.panel-actions {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
}

.refresh-button {
  background: #f0f0f0;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background 0.2s;
}

.refresh-button:hover {
  background: #e0e0e0;
}

.loading-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: #555;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 600px) {
  .panel-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .metric-item {
    flex-wrap: wrap;
  }
  
  .metric-label {
    width: 100%;
    margin-bottom: 0.25rem;
  }
}
</style>
