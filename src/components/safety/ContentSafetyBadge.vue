<template>
  <div class="safety-badge" :class="[theme, safetyInfo.tier]" @click="showDetails = !showDetails">
    <div class="badge-content">
      <div class="safety-icon">
        <i :class="safetyIcon"></i>
      </div>
      <div v-if="showLabel" class="safety-label">
        <span>{{ safetyLabel }}</span>
      </div>
    </div>
    
    <!-- Safety tooltip/details -->
    <div v-if="showDetails" class="safety-details" :class="safetyInfo.tier">
      <div class="details-header">
        <h4>Safety Rating</h4>
        <button class="close-details" @click="showDetails = false">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="safety-score">
        <div class="score-ring">
          <svg width="60" height="60" viewBox="0 0 60 60">
            <circle 
              cx="30" 
              cy="30" 
              r="25" 
              fill="none" 
              stroke="#e0e0e0" 
              stroke-width="6"
            />
            <circle 
              cx="30" 
              cy="30" 
              r="25" 
              fill="none" 
              :stroke="getScoreColor(safetyInfo.score)" 
              stroke-width="6"
              stroke-dasharray="157"
              :stroke-dashoffset="getScoreDashOffset(safetyInfo.score)"
              transform="rotate(-90 30 30)"
            />
          </svg>
          <div class="score-value">{{ safetyInfo.score }}</div>
        </div>
        <div class="score-label">{{ safetyLabel }}</div>
      </div>
      
      <div v-if="safetyInfo.warningFlags.length > 0" class="warning-flags">
        <div class="flags-label">Warning Flags</div>
        <ul class="flags-list">
          <li v-for="(flag, index) in getWarningMessages(safetyInfo.warningFlags)" :key="index">
            <i class="fas fa-exclamation-triangle"></i>
            <span>{{ flag }}</span>
          </li>
        </ul>
      </div>
      
      <div class="safety-notes">
        <div v-if="safetyInfo.verified" class="verified-note">
          <i class="fas fa-check-circle"></i>
          <span>Content from verified creator</span>
        </div>
        <div v-if="safetyInfo.safeForBeginner" class="beginner-safe">
          <i class="fas fa-user-shield"></i>
          <span>Suitable for beginners</span>
        </div>
      </div>
      
      <div v-if="safetyInfo.tier === 'caution'" class="safety-actions">
        <div class="action-label">Recommended Actions</div>
        <button class="action-btn research">
          <i class="fas fa-search"></i> Research Creator
        </button>
        <button class="action-btn verify">
          <i class="fas fa-check-double"></i> Verify Information
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, inject } from 'vue';
import { evaluateContentSafety } from '@/services/SafetyService';

const props = defineProps({
  content: {
    type: Object,
    required: true
  },
  showLabel: {
    type: Boolean,
    default: true
  },
  size: {
    type: String,
    default: 'medium', // small, medium, large
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  }
});

const theme = inject('currentTheme', 'roman-theme');
const showDetails = ref(false);
const safetyInfo = ref({
  score: 0,
  tier: 'loading',
  safeForBeginner: false,
  warningFlags: [],
  verified: false
});

// Evaluate content safety on mount and when content changes
onMounted(() => {
  evaluateContentSafety();
});

watch(() => props.content, () => {
  evaluateContentSafety();
}, { deep: true });

function evaluateContentSafety() {
  if (!props.content) {
    safetyInfo.value = {
      score: 0,
      tier: 'loading',
      safeForBeginner: false,
      warningFlags: [],
      verified: false
    };
    return;
  }
  
  // Use the safety service to evaluate the content
  safetyInfo.value = evaluateContentSafety(props.content);
}

// Computed properties for the UI
const safetyIcon = computed(() => {
  if (safetyInfo.value.tier === 'loading') {
    return 'fas fa-spinner fa-spin';
  }
  
  const icons = {
    safe: 'fas fa-shield-alt',
    moderate: 'fas fa-shield-alt',
    caution: 'fas fa-exclamation-triangle'
  };
  
  return icons[safetyInfo.value.tier] || 'fas fa-question-circle';
});

const safetyLabel = computed(() => {
  if (safetyInfo.value.tier === 'loading') {
    return 'Evaluating...';
  }
  
  const labels = {
    safe: 'Safe Content',
    moderate: 'Moderate Risk',
    caution: 'Use Caution'
  };
  
  return labels[safetyInfo.value.tier] || 'Unknown';
});

// Helper methods for the UI
function getScoreColor(score) {
  if (score >= 85) return '#2ecc71';  // Green
  if (score >= 70) return '#f39c12';  // Orange
  return '#e74c3c';                   // Red
}

function getScoreDashOffset(score) {
  // Circle circumference is 2*pi*r = 2*pi*25 ≈ 157
  const circumference = 157;
  const offset = circumference - (circumference * score / 100);
  return offset;
}

function getWarningMessages(flags) {
  const messages = {
    unverified_creator: 'Content creator is not verified',
    very_new_content: 'This content was published very recently',
    low_engagement: 'This content has very low engagement',
    suspicious_claims: 'Contains potentially misleading claims'
  };
  
  return flags.map(flag => messages[flag] || flag);
}
</script>

<style scoped>
.safety-badge {
  position: relative;
  display: inline-block;
  cursor: pointer;
}

.badge-content {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 12px;
  white-space: nowrap;
  transition: all 0.2s;
}

.safety-badge:hover .badge-content {
  transform: translateY(-2px);
}

.safety-badge.small .badge-content {
  padding: 2px 6px;
}

.safety-badge.large .badge-content {
  padding: 5px 10px;
}

.safety-icon {
  font-size: 0.9rem;
}

.safety-badge.small .safety-icon {
  font-size: 0.8rem;
}

.safety-badge.large .safety-icon {
  font-size: 1rem;
}

.safety-label {
  font-size: 0.85rem;
  font-weight: 500;
}

.safety-badge.small .safety-label {
  font-size: 0.75rem;
}

.safety-badge.large .safety-label {
  font-size: 0.9rem;
}

/* Safety tiers styling */
.safety-badge.safe .badge-content {
  background-color: rgba(46, 204, 113, 0.15);
  color: #27ae60;
}

.safety-badge.moderate .badge-content {
  background-color: rgba(243, 156, 18, 0.15);
  color: #e67e22;
}

.safety-badge.caution .badge-content {
  background-color: rgba(231, 76, 60, 0.15);
  color: #c0392b;
}

.safety-badge.loading .badge-content {
  background-color: rgba(189, 195, 199, 0.15);
  color: #7f8c8d;
}

/* Safety details */
.safety-details {
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  width: 260px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 3px 15px rgba(0, 0, 0, 0.15);
  z-index: 100;
  overflow: hidden;
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
}

.details-header h4 {
  margin: 0;
  font-size: 1rem;
}

.close-details {
  background: none;
  border: none;
  font-size: 0.9rem;
  cursor: pointer;
  color: #777;
}

.safety-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px 0;
}

.score-ring {
  position: relative;
  width: 60px;
  height: 60px;
  margin-bottom: 10px;
}

.score-value {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.2rem;
  font-weight: bold;
}

.score-label {
  font-size: 0.9rem;
  font-weight: 500;
}

.warning-flags {
  padding: 15px;
  border-top: 1px solid #eee;
}

.flags-label {
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 8px;
}

.flags-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.flags-list li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.85rem;
  margin-bottom: 5px;
  color: #e74c3c;
}

.flags-list li i {
  margin-top: 3px;
}

.safety-notes {
  padding: 0 15px 15px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.verified-note, .beginner-safe {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: #2ecc71;
}

.safety-actions {
  padding: 15px;
  border-top: 1px solid #eee;
}

.action-label {
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 10px;
}

.action-btn {
  width: 100%;
  padding: 8px;
  margin-bottom: 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.85rem;
  transition: background-color 0.2s;
}

.action-btn.research {
  background-color: #3498db;
  color: white;
}

.action-btn.research:hover {
  background-color: #2980b9;
}

.action-btn.verify {
  background-color: #f39c12;
  color: white;
}

.action-btn.verify:hover {
  background-color: #e67e22;
}

/* Safety tier-specific styling for details */
.safety-details.safe .details-header {
  border-bottom: 3px solid #2ecc71;
}

.safety-details.moderate .details-header {
  border-bottom: 3px solid #f39c12;
}

.safety-details.caution .details-header {
  border-bottom: 3px solid #e74c3c;
}

/* Roman theme overrides */
.roman-theme .safety-badge.safe .badge-content {
  background-color: rgba(107, 142, 35, 0.15);
  color: #6B8E23;
}

.roman-theme .safety-badge.moderate .badge-content {
  background-color: rgba(205, 133, 63, 0.15);
  color: #CD853F;
}

.roman-theme .safety-badge.caution .badge-content {
  background-color: rgba(178, 34, 34, 0.15);
  color: #B22222;
}

.roman-theme .safety-details {
  border: 1px solid #d5c3aa;
}

.roman-theme .safety-details.safe .details-header {
  border-bottom-color: #6B8E23;
}

.roman-theme .safety-details.moderate .details-header {
  border-bottom-color: #CD853F;
}

.roman-theme .safety-details.caution .details-header {
  border-bottom-color: #B22222;
}

.roman-theme .warning-flags,
.roman-theme .safety-actions {
  border-top-color: #d5c3aa;
}

.roman-theme .flags-list li {
  color: #B22222;
}

.roman-theme .verified-note, 
.roman-theme .beginner-safe {
  color: #6B8E23;
}

.roman-theme .action-btn.research {
  background-color: #8B4513;
}

.roman-theme .action-btn.research:hover {
  background-color: #A0522D;
}

.roman-theme .action-btn.verify {
  background-color: #CD853F;
}

.roman-theme .action-btn.verify:hover {
  background-color: #D2691E;
}
</style>
