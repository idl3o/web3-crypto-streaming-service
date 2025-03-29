<template>
  <div class="factuality-badge" :class="[theme, badgeClass]" @click="showDetails = !showDetails">
    <div class="badge-content">
      <div class="factuality-icon">
        <i :class="factualityIcon"></i>
      </div>
      <div v-if="showLabel" class="factuality-label">
        <span>{{ factualityLabel }}</span>
      </div>
      <div v-if="score !== null" class="factuality-score">{{ score }}</div>
    </div>
    
    <div v-if="showDetails" class="factuality-details">
      <div class="details-header">
        <h4>Factuality Assessment</h4>
        <button class="close-details" @click.stop="showDetails = false">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div v-if="loading" class="loading-assessment">
        <div class="spinner"></div>
        <div>Analyzing factual claims...</div>
      </div>
      
      <template v-else>
        <div class="score-display">
          <div class="score-circle" v-if="score !== null">
            <div class="score-value">{{ score }}</div>
          </div>
          <div v-else class="score-circle no-score">
            <i class="fas fa-question"></i>
          </div>
          <div class="score-label">{{ factualityLabel }}</div>
          <div class="confidence-label" v-if="factualAssessment.confidence">
            {{ factualAssessment.confidence }} confidence
          </div>
        </div>
        
        <div class="assessment-summary">
          {{ factualAssessment.assessment }}
        </div>
        
        <div class="claim-stats" v-if="factualAssessment.claimCount > 0">
          <div class="stat-item">
            <div class="stat-value">{{ factualAssessment.claimCount }}</div>
            <div class="stat-label">Claims Detected</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ factualAssessment.verifiedCount }}</div>
            <div class="stat-label">Verified</div>
          </div>
          <div class="stat-item" v-if="factualAssessment.problematicCount">
            <div class="stat-value">{{ factualAssessment.problematicCount }}</div>
            <div class="stat-label">Disputed</div>
          </div>
        </div>
        
        <div class="claims-preview" v-if="claims && claims.length > 0">
          <h5>Sample Claims</h5>
          <ul class="claims-list">
            <li v-for="(claim, index) in claimsPreview" :key="claim.id" class="claim-item">
              <div :class="['claim-indicator', claim.likelihood]"></div>
              <div class="claim-content">
                <div class="claim-text">{{ claim.text }}</div>
                <div class="claim-verification" v-if="claim.likelihood !== 'unverified'">
                  {{ formatLikelihood(claim.likelihood) }}
                </div>
              </div>
            </li>
          </ul>
          
          <div v-if="claims.length > 3" class="view-all">
            <button class="view-all-btn" @click="$emit('view-all-claims')">
              View All {{ claims.length }} Claims
            </button>
          </div>
        </div>
        
        <div v-else class="no-claims">
          No specific factual claims detected in this content
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue';
import { LIKELIHOOD_LEVELS } from '@/services/FactCheckService';

const props = defineProps({
  factualAssessment: {
    type: Object,
    default: () => ({})
  },
  claims: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  showLabel: {
    type: Boolean,
    default: true
  },
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  }
});

const emit = defineEmits(['view-all-claims']);
const theme = inject('currentTheme', 'roman-theme');
const showDetails = ref(false);

// Computed properties
const score = computed(() => props.factualAssessment.score);

const badgeClass = computed(() => {
  if (props.loading) return 'loading';
  
  const score = props.factualAssessment.score;
  if (score === null) return 'no-score';
  if (score >= 85) return 'highly-factual';
  if (score >= 70) return 'mostly-factual';
  if (score >= 50) return 'mixed-factual';
  return 'low-factual';
});

const factualityIcon = computed(() => {
  if (props.loading) return 'fas fa-spinner fa-spin';
  
  const score = props.factualAssessment.score;
  if (score === null) return 'fas fa-question-circle';
  if (score >= 85) return 'fas fa-check-circle';
  if (score >= 70) return 'fas fa-check';
  if (score >= 50) return 'fas fa-info-circle';
  return 'fas fa-exclamation-triangle';
});

const factualityLabel = computed(() => {
  if (props.loading) return 'Analyzing...';
  
  const score = props.factualAssessment.score;
  if (score === null) return 'No Assessment';
  if (score >= 85) return 'Highly Factual';
  if (score >= 70) return 'Mostly Factual';
  if (score >= 50) return 'Mixed Factuality';
  return 'Low Factuality';
});

// Show just 3 claims in the preview
const claimsPreview = computed(() => {
  return props.claims.slice(0, 3);
});

// Close details if clicked outside
function handleClickOutside(event) {
  if (showDetails.value && !event.target.closest('.factuality-badge')) {
    showDetails.value = false;
  }
}

// Format the likelihood levels for display
function formatLikelihood(likelihood) {
  switch (likelihood) {
    case LIKELIHOOD_LEVELS.CONFIRMED:
      return 'Confirmed Fact';
    case LIKELIHOOD_LEVELS.LIKELY:
      return 'Likely Accurate';
    case LIKELIHOOD_LEVELS.DISPUTED:
      return 'Disputed Claim';
    case LIKELIHOOD_LEVELS.FALSE:
      return 'False Claim';
    case LIKELIHOOD_LEVELS.UNVERIFIED:
    default:
      return 'Unverified';
  }
}

// Add/remove event listener for outside clicks
watch(showDetails, (isVisible) => {
  if (isVisible) {
    document.addEventListener('click', handleClickOutside);
  } else {
    document.removeEventListener('click', handleClickOutside);
  }
});
</script>

<style scoped>
.factuality-badge {
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

.factuality-badge:hover .badge-content {
  transform: translateY(-2px);
}

.factuality-icon {
  font-size: 0.9rem;
}

.factuality-label {
  font-size: 0.85rem;
  font-weight: 500;
}

.factuality-score {
  background-color: white;
  color: #333;
  font-weight: 600;
  font-size: 0.8rem;
  padding: 2px 4px;
  border-radius: 4px;
  min-width: 24px;
  text-align: center;
}

/* Badge variations */
.factuality-badge.highly-factual .badge-content {
  background-color: rgba(46, 204, 113, 0.15);
  color: #27ae60;
}

.factuality-badge.mostly-factual .badge-content {
  background-color: rgba(39, 174, 96, 0.12);
  color: #27ae60;
}

.factuality-badge.mixed-factual .badge-content {
  background-color: rgba(243, 156, 18, 0.15);
  color: #e67e22;
}

.factuality-badge.low-factual .badge-content {
  background-color: rgba(231, 76, 60, 0.15);
  color: #c0392b;
}

.factuality-badge.no-score .badge-content {
  background-color: rgba(189, 195, 199, 0.15);
  color: #7f8c8d;
}

.factuality-badge.loading .badge-content {
  background-color: rgba(52, 152, 219, 0.15);
  color: #2980b9;
}

/* Size variations */
.factuality-badge.small .badge-content {
  padding: 2px 6px;
}

.factuality-badge.small .factuality-icon {
  font-size: 0.8rem;
}

.factuality-badge.small .factuality-label {
  font-size: 0.75rem;
}

.factuality-badge.large .badge-content {
  padding: 5px 10px;
}

.factuality-badge.large .factuality-icon {
  font-size: 1rem;
}

.factuality-badge.large .factuality-label {
  font-size: 0.9rem;
}

/* Factuality details panel */
.factuality-details {
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  width: 300px;
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
  border-bottom: 1px solid #eee;
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

.close-details:hover {
  color: #333;
}

.loading-assessment {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 25px 15px;
  color: #777;
  font-size: 0.9rem;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top-color: #3498db;
  border-radius: 50%;
  animation: spinner 0.8s linear infinite;
  margin-bottom: 10px;
}

@keyframes spinner {
  to {
    transform: rotate(360deg);
  }
}

.score-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px 0;
}

.score-circle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  font-weight: bold;
  margin-bottom: 10px;
  color: white;
  background: linear-gradient(135deg, #27ae60, #2ecc71);
}

.score-circle.no-score {
  background: linear-gradient(135deg, #95a5a6, #7f8c8d);
  font-size: 1.8rem;
}

/* Score circle colors based on score */
.factuality-badge.mostly-factual .score-circle {
  background: linear-gradient(135deg, #27ae60, #2ecc71);
}

.factuality-badge.mixed-factual .score-circle {
  background: linear-gradient(135deg, #e67e22, #f39c12);
}

.factuality-badge.low-factual .score-circle {
  background: linear-gradient(135deg, #c0392b, #e74c3c);
}

.score-label {
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 4px;
}

.confidence-label {
  font-size: 0.8rem;
  color: #777;
  text-transform: capitalize;
}

.assessment-summary {
  padding: 0 15px 15px;
  text-align: center;
  font-size: 0.9rem;
  color: #555;
}

.claim-stats {
  display: flex;
  justify-content: space-around;
  padding: 15px;
  border-top: 1px solid #eee;
  border-bottom: 1px solid #eee;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-weight: 600;
  font-size: 1.1rem;
}

.stat-label {
  font-size: 0.8rem;
  color: #777;
}

.claims-preview {
  padding: 15px;
}

.claims-preview h5 {
  margin: 0 0 10px 0;
  font-size: 0.9rem;
  color: #555;
}

.claims-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.claim-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 12px;
}

.claim-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
}

.claim-indicator.confirmed {
  background-color: #2ecc71;
}

.claim-indicator.likely {
  background-color: #3498db;
}

.claim-indicator.unverified {
  background-color: #95a5a6;
}

.claim-indicator.disputed {
  background-color: #f39c12;
}

.claim-indicator.false {
  background-color: #e74c3c;
}

.claim-content {
  flex-grow: 1;
}

.claim-text {
  font-size: 0.85rem;
  margin-bottom: 3px;
}

.claim-verification {
  font-size: 0.75rem;
  font-weight: 500;
}

.view-all {
  text-align: center;
  padding-top: 10px;
}

.view-all-btn {
  background: none;
  border: none;
  color: #3498db;
  font-size: 0.85rem;
  cursor: pointer;
  padding: 5px 10px;
}

.view-all-btn:hover {
  text-decoration: underline;
}

.no-claims {
  padding: 15px;
  text-align: center;
  color: #777;
  font-size: 0.9rem;
  font-style: italic;
}

/* Roman theme overrides */
.factuality-badge.roman-theme.highly-factual .badge-content,
.factuality-badge.roman-theme.mostly-factual .badge-content {
  background-color: rgba(107, 142, 35, 0.15);
  color: #6B8E23;
}

.factuality-badge.roman-theme.mixed-factual .badge-content {
  background-color: rgba(205, 133, 63, 0.15);
  color: #CD853F;
}

.factuality-badge.roman-theme.low-factual .badge-content {
  background-color: rgba(178, 34, 34, 0.15);
  color: #B22222;
}

.factuality-badge.roman-theme .factuality-details {
  border: 1px solid #d5c3aa;
}

.factuality-badge.roman-theme .details-header {
  border-bottom-color: #d5c3aa;
}

.factuality-badge.roman-theme .score-circle {
  background: linear-gradient(135deg, #6B8E23, #556B2F);
}

.factuality-badge.roman-theme.mixed-factual .score-circle {
  background: linear-gradient(135deg, #CD853F, #D2691E);
}

.factuality-badge.roman-theme.low-factual .score-circle {
  background: linear-gradient(135deg, #B22222, #8B0000);
}

.factuality-badge.roman-theme .claim-stats,
.factuality-badge.roman-theme .claims-preview {
  border-color: #d5c3aa;
}

.factuality-badge.roman-theme .view-all-btn {
  color: #8B4513;
}

.factuality-badge.roman-theme .spinner {
  border-top-color: #8B4513;
}

.factuality-badge.roman-theme .claim-indicator.confirmed {
  background-color: #6B8E23;
}

.factuality-badge.roman-theme .claim-indicator.likely {
  background-color: #8B4513;
}
</style>
