<template>
  <div class="matt-damon-promotion" :class="theme">
    <div class="promo-container">
      <div class="promo-image-container">
        <img
          :src="imageUrl"
          alt="Matt Damon - Fortune Favors the Brave"
          @error="handleImageError"
          class="promo-image"
        />
        <div class="promo-overlay">
          <div class="play-button" v-if="hasVideo" @click="showVideo">
            <i class="fas fa-play"></i>
          </div>
        </div>
      </div>
      
      <div class="promo-content">
        <h2 class="promo-title">{{ celebrity.name }}</h2>
        <h3 class="promo-subtitle">{{ celebrity.tagline }}</h3>
        
        <div class="promo-description">
          <p>{{ campaign.description }}</p>
        </div>
        
        <div class="token-info" v-if="tokens.length > 0">
          <h4>Exclusive Tokens</h4>
          <div class="token-list">
            <div 
              v-for="token in tokens" 
              :key="token.id"
              class="token-card"
            >
              <div class="token-icon">
                <i class="fas fa-coin"></i>
              </div>
              <div class="token-details">
                <div class="token-name">{{ token.name }} ({{ token.symbol }})</div>
                <div class="token-description">{{ token.description }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="campaign-rewards">
          <h4>Campaign Rewards</h4>
          <div class="rewards-list">
            <div 
              v-for="reward in campaign.rewards" 
              :key="reward.id"
              class="reward-item"
            >
              <div class="reward-icon">
                <i class="fas" :class="getRewardIcon(reward)"></i>
              </div>
              <div class="reward-details">
                <div class="reward-name">{{ reward.name }}</div>
                <div class="reward-description">{{ reward.description }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="promotion-stats" v-if="showStats">
          <div class="stat-item">
            <div class="stat-value">{{ formatNumber(campaign.engagementMetrics.impressions) }}</div>
            <div class="stat-label">Impressions</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ formatNumber(campaign.engagementMetrics.conversions) }}</div>
            <div class="stat-label">Participants</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ formatROI(campaign.engagementMetrics.roi) }}x</div>
            <div class="stat-label">ROI</div>
          </div>
        </div>
        
        <div class="promo-actions">
          <button 
            class="action-button primary" 
            @click="participate"
            :disabled="isProcessing"
          >
            <span v-if="isProcessing">
              <i class="fas fa-spinner fa-spin"></i> Processing...
            </span>
            <span v-else>
              <i class="fas fa-rocket"></i> {{ participateButtonText }}
            </span>
          </button>
          
          <button 
            class="action-button secondary"
            @click="learnMore"
          >
            <i class="fas fa-info-circle"></i> Learn More
          </button>
        </div>
      </div>
    </div>
    
    <div class="video-modal" v-if="videoOpen" @click="closeVideo">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ celebrity.name }} - {{ campaign.title }}</h3>
          <button class="close-btn" @click="closeVideo">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <!-- In a real implementation, this would be an actual video player -->
          <div class="video-placeholder">
            <div class="video-message">
              <i class="fas fa-film"></i>
              <p>"Fortune Favors the Brave" Campaign Video</p>
              <p class="video-note">Video player would be implemented here</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue';
import * as CelebrityEndorsementService from '@/services/CelebrityEndorsementService';
import * as BlockchainService from '@/services/BlockchainService';

const props = defineProps({
  compact: {
    type: Boolean,
    default: false
  },
  showStats: {
    type: Boolean,
    default: true
  },
  showVideo: {
    type: Boolean,
    default: true
  },
  campaignId: {
    type: String,
    default: 'brave_campaign'
  }
});

const emit = defineEmits(['participate', 'learn-more']);
const theme = inject('currentTheme', 'roman-theme');

// State
const celebrity = ref(null);
const campaign = ref(null);
const tokens = ref([]);
const imageUrl = ref('');
const fallbackImage = ref('');
const videoOpen = ref(false);
const isProcessing = ref(false);
const hasParticipated = ref(false);

// Computed
const hasVideo = computed(() => props.showVideo && celebrity.value?.videoUrl);

const participateButtonText = computed(() => {
  return hasParticipated.value ? 'Participated' : 'Participate Now';
});

// Methods
function handleImageError() {
  // If image fails to load, use fallback
  imageUrl.value = fallbackImage.value;
}

function getRewardIcon(reward) {
  if (reward.id.includes('token') || reward.tokenId) {
    return 'fa-coins';
  } else if (reward.id.includes('nft')) {
    return 'fa-image';
  }
  return 'fa-gift';
}

function formatNumber(num) {
  return new Intl.NumberFormat().format(num);
}

function formatROI(value) {
  return value.toFixed(1);
}

function showVideo() {
  videoOpen.value = true;
}

function closeVideo() {
  videoOpen.value = false;
}

async function loadData() {
  try {
    // Initialize service
    await CelebrityEndorsementService.initCelebrityService();
    
    // Get Matt Damon data
    celebrity.value = CelebrityEndorsementService.getCelebrity('MATT_DAMON');
    
    // Get campaign data
    campaign.value = CelebrityEndorsementService.getCampaign(props.campaignId);
    
    // Get tokens
    tokens.value = CelebrityEndorsementService.getTokensByCelebrity('MATT_DAMON');
    
    // Set up image URLs
    imageUrl.value = celebrity.value?.imageUrl || '';
    fallbackImage.value = celebrity.value?.fallbackImageUrl || '';
    
    // Check if user has participated
    checkParticipationStatus();
  } catch (error) {
    console.error('Error loading Matt Damon promotional data:', error);
  }
}

async function checkParticipationStatus() {
  if (!BlockchainService.isConnected()) {
    return;
  }
  
  try {
    const userAddress = BlockchainService.getCurrentAccount();
    // In a real implementation, this would check blockchain state
    // For demo purposes, we'll use local storage
    const participated = localStorage.getItem(`participated_${props.campaignId}_${userAddress}`);
    hasParticipated.value = !!participated;
  } catch (error) {
    console.error('Error checking participation status:', error);
  }
}

async function participate() {
  if (isProcessing.value) return;
  
  try {
    isProcessing.value = true;
    
    // Check if wallet is connected
    if (!BlockchainService.isConnected()) {
      await BlockchainService.connect();
    }
    
    const userAddress = BlockchainService.getCurrentAccount();
    
    // Track engagement
    const result = await CelebrityEndorsementService.trackEngagement(
      props.campaignId,
      'signup',
      userAddress
    );
    
    // Mark as participated
    if (result.success) {
      localStorage.setItem(`participated_${props.campaignId}_${userAddress}`, 'true');
      hasParticipated.value = true;
    }
    
    // Emit event
    emit('participate', {
      campaign: props.campaignId,
      userAddress,
      result
    });
    
  } catch (error) {
    console.error('Error participating in campaign:', error);
  } finally {
    isProcessing.value = false;
  }
}

function learnMore() {
  emit('learn-more', {
    campaign: props.campaignId,
    celebrity: 'MATT_DAMON'
  });
}

// Initialize
onMounted(() => {
  loadData();
});
</script>

<style scoped>
.matt-damon-promotion {
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  max-width: 1000px;
  margin: 0 auto;
}

.promo-container {
  display: flex;
  flex-direction: column;
}

@media (min-width: 768px) {
  .promo-container {
    flex-direction: row;
  }
}

.promo-image-container {
  position: relative;
  flex: 1;
  min-height: 300px;
  overflow: hidden;
}

@media (min-width: 768px) {
  .promo-image-container {
    min-width: 40%;
    max-width: 40%;
    min-height: auto;
  }
}

.promo-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
}

.promo-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.4));
}

.play-button {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.9);
  color: #1e40af;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.play-button:hover {
  transform: scale(1.1);
  background-color: #fff;
}

.promo-content {
  flex: 1;
  padding: 25px;
}

.promo-title {
  margin: 0 0 10px 0;
  font-size: 2rem;
  color: #1e40af;
}

.promo-subtitle {
  margin: 0 0 20px 0;
  font-size: 1.2rem;
  font-style: italic;
  color: #4b5563;
}

.promo-description {
  margin-bottom: 20px;
  line-height: 1.6;
  color: #374151;
}

.token-info, .campaign-rewards {
  margin-bottom: 20px;
}

.token-info h4, .campaign-rewards h4 {
  margin: 0 0 10px 0;
  font-size: 1.1rem;
  color: #4b5563;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 8px;
}

.token-list {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.token-card {
  display: flex;
  gap: 10px;
  background-color: #f3f4f6;
  padding: 12px;
  border-radius: 8px;
  flex: 1;
  min-width: 200px;
}

.token-icon {
  width: 30px;
  height: 30px;
  background-color: #fbbf24;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  color: white;
}

.token-details {
  flex: 1;
}

.token-name {
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 4px;
}

.token-description {
  font-size: 0.8rem;
  color: #6b7280;
}

.rewards-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reward-item {
  display: flex;
  gap: 12px;
}

.reward-icon {
  width: 30px;
  height: 30px;
  background-color: #60a5fa;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  color: white;
  flex-shrink: 0;
}

.reward-details {
  flex: 1;
}

.reward-name {
  font-weight: 600;
  font-size: 0.95rem;
  margin-bottom: 4px;
}

.reward-description {
  font-size: 0.85rem;
  color: #6b7280;
}

.promotion-stats {
  display: flex;
  justify-content: space-between;
  margin-bottom: 25px;
  background-color: #f3f4f6;
  padding: 15px;
  border-radius: 8px;
}

.stat-item {
  text-align: center;
  flex: 1;
}

.stat-value {
  font-weight: 700;
  font-size: 1.2rem;
  color: #1e40af;
}

.stat-label {
  font-size: 0.8rem;
  color: #6b7280;
}

.promo-actions {
  display: flex;
  gap: 15px;
  margin-top: 20px;
}

.action-button {
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  border: none;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.action-button.primary {
  background-color: #1e40af;
  color: white;
  flex: 2;
  justify-content: center;
}

.action-button.primary:hover:not(:disabled) {
  background-color: #1e3a8a;
}

.action-button.primary:disabled {
  background-color: #93c5fd;
  cursor: not-allowed;
}

.action-button.secondary {
  background-color: #e5e7eb;
  color: #4b5563;
  flex: 1;
  justify-content: center;
}

.action-button.secondary:hover {
  background-color: #d1d5db;
}

/* Video Modal */
.video-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background-color: white;
  border-radius: 12px;
  width: 90%;
  max-width: 800px;
  overflow: hidden;
}

.modal-header {
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.4rem;
  cursor: pointer;
  color: #6b7280;
}

.modal-body {
  padding: 0;
}

.video-placeholder {
  height: 450px;
  background-color: #111827;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-message {
  text-align: center;
  color: white;
}

.video-message i {
  font-size: 3rem;
  margin-bottom: 15px;
  opacity: 0.8;
}

.video-message p {
  margin: 5px 0;
  font-size: 1.1rem;
}

.video-note {
  opacity: 0.5;
  font-size: 0.9rem;
  margin-top: 20px;
}

/* Roman Theme Overrides */
.roman-theme .promo-title {
  color: #8B4513;
  font-family: 'Times New Roman', Times, serif;
}

.roman-theme .play-button {
  background-color: rgba(255, 240, 220, 0.9);
  color: #8B4513;
}

.roman-theme .token-icon {
  background-color: #DAA520;
}

.roman-theme .reward-icon {
  background-color: #8B4513;
}

.roman-theme .stat-value {
  color: #8B4513;
}

.roman-theme .action-button.primary {
  background-color: #8B4513;
}

.roman-theme .action-button.primary:hover:not(:disabled) {
  background-color: #6b3000;
}

/* Compact Mode */
.matt-damon-promotion.compact .promo-container {
  flex-direction: column;
}

.matt-damon-promotion.compact .promo-image-container {
  min-height: 200px;
  max-width: 100%;
}

.matt-damon-promotion.compact .promo-content {
  padding: 15px;
}

.matt-damon-promotion.compact .promo-title {
  font-size: 1.5rem;
}

.matt-damon-promotion.compact .promo-subtitle {
  font-size: 1rem;
  margin-bottom: 15px;
}

.matt-damon-promotion.compact .token-info,
.matt-damon-promotion.compact .campaign-rewards {
  display: none;
}

.matt-damon-promotion.compact .promotion-stats {
  margin-bottom: 15px;
}
</style>
