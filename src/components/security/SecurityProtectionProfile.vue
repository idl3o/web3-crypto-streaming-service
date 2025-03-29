<template>
  <div class="security-protection-profile" :class="theme">
    <div class="profile-header">
      <h3 class="profile-title">Security Protection Profile</h3>
      <div class="profile-badge" :class="securityLevelClass">
        {{ currentProfile.name }}
      </div>
    </div>

    <div class="profile-section">
      <div class="profile-selector">
        <h4>Select Protection Profile</h4>
        <div class="profile-options">
          <div 
            v-for="profile in availableProfiles" 
            :key="profile.id"
            class="profile-option"
            :class="{ active: currentProfile.id === profile.id }"
            @click="selectProfile(profile.id)"
          >
            <div class="option-header">
              <span class="option-name">{{ profile.name }}</span>
              <span class="option-badge" :class="getSecurityLevelClass(profile)">
                {{ getSecurityLevelLabel(profile) }}
              </span>
            </div>
            <p class="option-description">{{ profile.description }}</p>
          </div>
        </div>
      </div>

      <div class="profile-details">
        <h4>Profile Details</h4>
        <div class="details-grid">
          <div class="detail-item">
            <div class="detail-label">Protection Mode</div>
            <div class="detail-value">{{ currentProfile.protectionMode }}</div>
          </div>

          <div class="detail-item">
            <div class="detail-label">Auto-Mitigate Threats</div>
            <div class="detail-value">
              <toggle-switch 
                :value="currentProfile.settings.autoMitigate"
                @input="updateSetting('autoMitigate', $event)"
                :disabled="!canCustomize"
              />
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-label">Scan Interval</div>
            <div class="detail-value">
              <select 
                v-model="currentProfile.settings.scanInterval"
                @change="updateSetting('scanInterval', currentProfile.settings.scanInterval)"
                :disabled="!canCustomize"
              >
                <option value="60000">Every Minute</option>
                <option value="300000">Every 5 Minutes</option>
                <option value="600000">Every 10 Minutes</option>
                <option value="1800000">Every 30 Minutes</option>
              </select>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-label">Notification Threshold</div>
            <div class="detail-value">
              <select 
                v-model="currentProfile.settings.notificationThreshold"
                @change="updateSetting('notificationThreshold', currentProfile.settings.notificationThreshold)"
                :disabled="!canCustomize"
              >
                <option value="none">All (None)</option>
                <option value="low">Low & Above</option>
                <option value="medium">Medium & Above</option>
                <option value="high">High & Above</option>
                <option value="critical">Critical Only</option>
              </select>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-label">Quantum Protection</div>
            <div class="detail-value">
              <toggle-switch 
                :value="currentProfile.settings.quantumProtection"
                @input="updateSetting('quantumProtection', $event)"
                :disabled="!canCustomize"
              />
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-label">API Rate Limit</div>
            <div class="detail-value">
              <input 
                type="number" 
                v-model.number="currentProfile.settings.rateLimit"
                @change="updateSetting('rateLimit', currentProfile.settings.rateLimit)"
                min="10" max="500" step="10"
                :disabled="!canCustomize"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="profile-actions">
      <div v-if="canCustomize" class="customizing-notice">
        Customizing the {{ currentProfile.name }} profile
      </div>
      <div v-else class="profile-buttons">
        <button 
          class="action-button customize-btn"
          @click="startCustomizing"
        >
          <i class="fas fa-edit"></i> Customize
        </button>
        <button 
          class="action-button apply-btn"
          @click="applyProfile"
        >
          <i class="fas fa-check"></i> Apply
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject, watch } from 'vue';
import * as SecurityService from '@/services/RiceAdvancedNetworkSecurityService';
import ToggleSwitch from '@/components/common/ToggleSwitch.vue';

const props = defineProps({
  initialProfileId: {
    type: String,
    default: 'balanced'
  }
});

const emit = defineEmits(['profile-changed', 'settings-updated']);
const theme = inject('currentTheme', 'roman-theme');

// State
const availableProfiles = ref([
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Basic protection with minimal performance impact. Suitable for low-value transactions.',
    securityLevel: 'low',
    protectionMode: SecurityService.PROTECTION_MODES.PASSIVE,
    settings: {
      autoMitigate: false,
      scanInterval: 600000,
      notificationThreshold: SecurityService.THREAT_LEVELS.HIGH,
      quantumProtection: false,
      rateLimit: 200
    }
  },
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Moderate protection balancing security and performance. Recommended for most users.',
    securityLevel: 'medium',
    protectionMode: SecurityService.PROTECTION_MODES.REACTIVE,
    settings: {
      autoMitigate: true,
      scanInterval: 300000,
      notificationThreshold: SecurityService.THREAT_LEVELS.MEDIUM,
      quantumProtection: false,
      rateLimit: 100
    }
  },
  {
    id: 'enhanced',
    name: 'Enhanced',
    description: 'Strong protection for high-value transactions and sensitive operations.',
    securityLevel: 'high',
    protectionMode: SecurityService.PROTECTION_MODES.PROACTIVE,
    settings: {
      autoMitigate: true,
      scanInterval: 60000,
      notificationThreshold: SecurityService.THREAT_LEVELS.LOW,
      quantumProtection: false,
      rateLimit: 50
    }
  },
  {
    id: 'maximum',
    name: 'Maximum',
    description: 'Complete protection including quantum-resistant algorithms. May impact performance.',
    securityLevel: 'very-high',
    protectionMode: SecurityService.PROTECTION_MODES.QUANTUM_RESISTANT,
    settings: {
      autoMitigate: true,
      scanInterval: 60000,
      notificationThreshold: SecurityService.THREAT_LEVELS.NONE,
      quantumProtection: true,
      rateLimit: 30
    }
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Customized protection settings tailored to your specific needs.',
    securityLevel: 'custom',
    protectionMode: SecurityService.PROTECTION_MODES.REACTIVE,
    settings: {
      autoMitigate: true,
      scanInterval: 300000,
      notificationThreshold: SecurityService.THREAT_LEVELS.MEDIUM,
      quantumProtection: false,
      rateLimit: 100
    }
  }
]);

const currentProfileId = ref(props.initialProfileId);
const currentProfile = ref(null);
const canCustomize = ref(false);

// Computed properties
const securityLevelClass = computed(() => {
  return `security-level-${currentProfile.value?.securityLevel || 'medium'}`;
});

// Methods
function selectProfile(profileId) {
  if (canCustomize.value) {
    // Confirm before switching while customizing
    if (!confirm('You have unsaved customizations. Switch profiles anyway?')) {
      return;
    }
    canCustomize.value = false;
  }
  
  currentProfileId.value = profileId;
  const profile = availableProfiles.value.find(p => p.id === profileId);
  
  if (profile) {
    currentProfile.value = JSON.parse(JSON.stringify(profile)); // Deep copy
    emit('profile-changed', currentProfile.value);
  }
}

function startCustomizing() {
  // Create a custom profile based on current profile
  if (currentProfile.value.id !== 'custom') {
    // Clone current settings to custom profile
    const customProfile = availableProfiles.value.find(p => p.id === 'custom');
    if (customProfile) {
      customProfile.protectionMode = currentProfile.value.protectionMode;
      customProfile.settings = { ...currentProfile.value.settings };
      
      // Switch to custom profile
      currentProfileId.value = 'custom';
      currentProfile.value = JSON.parse(JSON.stringify(customProfile));
    }
  }
  
  canCustomize.value = true;
}

function updateSetting(key, value) {
  if (!canCustomize.value) return;
  
  if (currentProfile.value.settings) {
    currentProfile.value.settings[key] = value;
    emit('settings-updated', { 
      profileId: currentProfile.value.id,
      settings: currentProfile.value.settings
    });
  }
}

function applyProfile() {
  // Apply the current profile to the security service
  SecurityService.setProtectionMode(currentProfile.value.protectionMode);
  SecurityService.updateProtectionSettings(currentProfile.value.settings);
  
  emit('profile-changed', currentProfile.value);
  
  // Show confirmation
  alert(`${currentProfile.value.name} profile applied successfully`);
}

function getSecurityLevelClass(profile) {
  return `security-level-${profile.securityLevel}`;
}

function getSecurityLevelLabel(profile) {
  switch (profile.securityLevel) {
    case 'low':
      return 'Low Security';
    case 'medium':
      return 'Medium Security';
    case 'high':
      return 'High Security';
    case 'very-high':
      return 'Very High Security';
    case 'custom':
      return 'Custom Security';
    default:
      return 'Unknown';
  }
}

// Lifecycle hooks
onMounted(() => {
  // Initialize Security Service if not already initialized
  SecurityService.initSecurityService()
    .then(() => {
      // Get current settings from the service
      const currentSettings = SecurityService.getProtectionSettings();
      const currentMode = SecurityService.getSecurityMetrics().protectionMode;
      
      // Find or create matching profile
      selectProfile(currentProfileId.value);
    });
});

// Watch for initial profile changes
watch(() => props.initialProfileId, (newProfileId) => {
  if (newProfileId && !canCustomize.value) {
    selectProfile(newProfileId);
  }
});
</script>

<style scoped>
.security-protection-profile {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.profile-title {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 600;
  color: #333;
}

.profile-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
}

.security-level-low {
  background-color: #e6f7ff;
  color: #0070f3;
}

.security-level-medium {
  background-color: #e6fffb;
  color: #13c2c2;
}

.security-level-high {
  background-color: #fff2e8;
  color: #fa8c16;
}

.security-level-very-high {
  background-color: #fff1f0;
  color: #f5222d;
}

.security-level-custom {
  background-color: #f9f0ff;
  color: #722ed1;
}

.profile-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 25px;
  margin-bottom: 20px;
}

.profile-selector, .profile-details {
  background-color: #f9fafb;
  border-radius: 10px;
  padding: 20px;
}

.profile-selector h4, .profile-details h4 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
}

.profile-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.profile-option {
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.2s;
}

.profile-option:hover {
  border-color: #bfdbfe;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.profile-option.active {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.option-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.option-name {
  font-weight: 600;
  font-size: 1rem;
}

.option-badge {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 10px;
}

.option-description {
  margin: 0;
  font-size: 0.9rem;
  color: #6b7280;
  line-height: 1.4;
}

.details-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: white;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.detail-label {
  font-weight: 500;
  font-size: 0.95rem;
}

.detail-value {
  display: flex;
  align-items: center;
}

.detail-value select, .detail-value input {
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background-color: white;
  font-size: 0.9rem;
}

.detail-value input {
  width: 80px;
  text-align: center;
}

.profile-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-top: 20px;
}

.profile-buttons {
  display: flex;
  gap: 10px;
}

.action-button {
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  transition: all 0.2s;
}

.customize-btn {
  background-color: #f3f4f6;
  color: #4b5563;
}

.customize-btn:hover {
  background-color: #e5e7eb;
}

.apply-btn {
  background-color: #3b82f6;
  color: white;
}

.apply-btn:hover {
  background-color: #2563eb;
}

.customizing-notice {
  font-style: italic;
  color: #6b7280;
  font-size: 0.9rem;
}

/* Roman Theme */
.roman-theme {
  background-color: #f8f5e6;
  border: 1px solid #d3c5a8;
}

.roman-theme .profile-title {
  color: #8B4513;
}

.roman-theme .security-level-low {
  background-color: #ecdfc9;
  color: #8B4513;
}

.roman-theme .security-level-medium {
  background-color: #e8e0d0;
  color: #8B4513;
}

.roman-theme .security-level-high {
  background-color: #f7ebd0;
  color: #8B4513;
}

.roman-theme .security-level-very-high {
  background-color: #f5d0c0;
  color: #8B4513;
}

.roman-theme .security-level-custom {
  background-color: #f0e6d2;
  color: #8B4513;
}

.roman-theme .profile-selector, .roman-theme .profile-details {
  background-color: #f3ece2;
}

.roman-theme .profile-option {
  background-color: #f8f5e6;
  border-color: #e0d5c5;
}

.roman-theme .profile-option:hover {
  border-color: #d3c5a8;
}

.roman-theme .profile-option.active {
  border-color: #8B4513;
  box-shadow: 0 0 0 2px rgba(139, 69, 19, 0.2);
}

.roman-theme .detail-item {
  background-color: #f8f5e6;
  border-color: #e0d5c5;
}

.roman-theme .detail-value select, .roman-theme .detail-value input {
  border-color: #e0d5c5;
  background-color: #f8f5e6;
}

.roman-theme .customize-btn {
  background-color: #e8e0d0;
  color: #8B4513;
}

.roman-theme .customize-btn:hover {
  background-color: #e0d5c5;
}

.roman-theme .apply-btn {
  background-color: #8B4513;
  color: #f8f5e6;
}

.roman-theme .apply-btn:hover {
  background-color: #6b3000;
}

/* Responsive styles */
@media (max-width: 768px) {
  .profile-section {
    grid-template-columns: 1fr;
  }
}
</style>
