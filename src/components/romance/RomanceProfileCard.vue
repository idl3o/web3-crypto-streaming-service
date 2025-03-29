<template>
  <div class="romance-profile-card" :class="[theme, { 'expanded': expanded }]">
    <!-- Profile Header with Avatar and Name -->
    <div class="profile-header">
      <div class="profile-avatar" @click="expanded = !expanded">
        <img v-if="profile.avatar" :src="profile.avatar" :alt="profile.displayName">
        <div v-else class="avatar-placeholder">
          {{ getInitials(profile.displayName) }}
        </div>
        <div v-if="profile.isVerified" class="profile-verified">
          <i class="fas fa-check"></i>
        </div>
      </div>
      
      <div class="profile-info">
        <h3 class="profile-name">
          {{ profile.displayName }}
          <span class="chain-indicator" v-if="profile.chainPreference" :style="getChainStyle(profile.chainPreference)">
            {{ getChainName(profile.chainPreference) }}
          </span>
        </h3>
        
        <div class="profile-address">
          {{ shortenAddress(profile.address) }}
        </div>
        
        <div v-if="compatibilityScore !== undefined" class="compatibility-score" :class="getScoreClass(compatibilityScore)">
          <i class="fas fa-heart"></i>
          <span>{{ Math.round(compatibilityScore * 100) }}% Match</span>
        </div>
      </div>
    </div>
    
    <!-- Bio Section (visible only when expanded) -->
    <div class="profile-bio" v-if="expanded && profile.bio">
      <p>{{ profile.bio }}</p>
    </div>
    
    <!-- Interests Section (visible only when expanded) -->
    <div class="profile-interests" v-if="expanded && profile.interests && profile.interests.length > 0">
      <h4>Interests</h4>
      <div class="interest-tags">
        <span v-for="(interest, index) in profile.interests" :key="index" class="interest-tag">
          {{ formatInterest(interest) }}
        </span>
      </div>
    </div>
    
    <!-- Assets Section (visible only when expanded) -->
    <div class="profile-assets" v-if="expanded && profile.assets">
      <h4>Digital Assets</h4>
      <div v-if="profile.assets.nfts && profile.assets.nfts.length > 0" class="assets-group">
        <span class="assets-label">NFTs:</span>
        <div class="assets-list">
          <span v-for="(nft, index) in profile.assets.nfts" :key="`nft-${index}`" class="asset-tag nft-tag">
            {{ formatAssetName(nft) }}
          </span>
        </div>
      </div>
      
      <div v-if="profile.assets.tokens && profile.assets.tokens.length > 0" class="assets-group">
        <span class="assets-label">Tokens:</span>
        <div class="assets-list">
          <span v-for="(token, index) in profile.assets.tokens" :key="`token-${index}`" class="asset-tag token-tag">
            {{ formatAssetName(token) }}
          </span>
        </div>
      </div>
    </div>
    
    <!-- Action Buttons -->
    <div class="profile-actions" v-if="!hideActions">
      <button 
        v-if="showLikeButton" 
        class="action-btn like-btn" 
        :disabled="processing" 
        @click="onLike"
      >
        <i class="fas fa-heart" :class="{ 'liked': isLiked }"></i>
      </button>
      
      <button 
        v-if="showMatchActions && matchStatus === 'pending'" 
        class="action-btn accept-btn" 
        :disabled="processing" 
        @click="onAccept"
      >
        <i class="fas fa-check"></i>
      </button>
      
      <button 
        v-if="showMatchActions && matchStatus === 'pending'" 
        class="action-btn reject-btn" 
        :disabled="processing" 
        @click="onReject"
      >
        <i class="fas fa-times"></i>
      </button>
      
      <button 
        v-if="showMatchActions && matchStatus === 'matched'" 
        class="action-btn message-btn" 
        :disabled="processing" 
        @click="onMessage"
      >
        <i class="fas fa-comment"></i>
      </button>
      
      <!-- Edit button only for current user's profile -->
      <button 
        v-if="isCurrentUser" 
        class="action-btn edit-btn" 
        :disabled="processing" 
        @click="onEdit"
      >
        <i class="fas fa-edit"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted } from 'vue';
import { shortenAddress } from '@/services/NamingService';
import * as BlockchainService from '@/services/BlockchainService';

const props = defineProps({
  profile: {
    type: Object,
    required: true
  },
  compatibilityScore: {
    type: Number,
    default: undefined
  },
  matchStatus: {
    type: String,
    default: null // null, 'pending', 'matched', 'rejected'
  },
  isLiked: {
    type: Boolean,
    default: false
  },
  showLikeButton: {
    type: Boolean,
    default: false
  },
  showMatchActions: {
    type: Boolean,
    default: false
  },
  hideActions: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'like', 
  'accept-match', 
  'reject-match', 
  'message', 
  'edit-profile'
]);

const theme = inject('currentTheme', 'roman-theme');
const expanded = ref(false);
const processing = ref(false);

// Computed properties
const isCurrentUser = computed(() => {
  if (!BlockchainService.isConnected()) return false;
  
  const currentAccount = BlockchainService.getCurrentAccount();
  return currentAccount && 
    currentAccount.toLowerCase() === props.profile.address?.toLowerCase();
});

// Methods
function getInitials(name) {
  if (!name) return '?';
  
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .join('');
}

function getScoreClass(score) {
  if (score >= 0.8) return 'high-match';
  if (score >= 0.5) return 'medium-match';
  return 'low-match';
}

function formatInterest(interest) {
  return interest
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatAssetName(asset) {
  return asset.toUpperCase();
}

function getChainStyle(chain) {
  const chainColors = {
    'ethereum': { color: '#627EEA' },
    'polygon': { color: '#8247E5' },
    'solana': { color: '#00FFA3' },
    'avalanche': { color: '#E84142' },
    'bsc': { color: '#F3BA2F' },
    'arbitrum': { color: '#2D374B' },
    'optimism': { color: '#FF0420' },
  };
  
  return {
    backgroundColor: chainColors[chain]?.color || '#ccc'
  };
}

function getChainName(chain) {
  const chainNames = {
    'ethereum': 'ETH',
    'polygon': 'MATIC',
    'solana': 'SOL',
    'avalanche': 'AVAX',
    'bsc': 'BSC',
    'arbitrum': 'ARB',
    'optimism': 'OP',
  };
  
  return chainNames[chain] || chain.substring(0, 3).toUpperCase();
}

// Event handlers
async function onLike() {
  if (processing.value) return;
  
  processing.value = true;
  try {
    emit('like', props.profile);
  } finally {
    processing.value = false;
  }
}

async function onAccept() {
  if (processing.value) return;
  
  processing.value = true;
  try {
    emit('accept-match', props.profile);
  } finally {
    processing.value = false;
  }
}

async function onReject() {
  if (processing.value) return;
  
  processing.value = true;
  try {
    emit('reject-match', props.profile);
  } finally {
    processing.value = false;
  }
}

async function onMessage() {
  emit('message', props.profile);
}

function onEdit() {
  emit('edit-profile', props.profile);
}

// Initialize
onMounted(() => {
  // Auto-expand if it's the current user's profile
  if (isCurrentUser.value) {
    expanded.value = true;
  }
});
</script>

<style scoped>
.romance-profile-card {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
  transition: all 0.3s ease;
  max-width: 400px;
  margin: 0 auto;
}

.romance-profile-card.expanded {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.profile-header {
  display: flex;
  gap: 15px;
  align-items: center;
  margin-bottom: 15px;
}

.profile-avatar {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  flex-shrink: 0;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(145deg, #e2e8f0, #cbd5e1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  font-weight: 600;
  color: #64748b;
}

.profile-verified {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 24px;
  height: 24px;
  background-color: #4CAF50;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.7rem;
  border: 2px solid white;
}

.profile-info {
  flex: 1;
}

.profile-name {
  margin: 0 0 5px 0;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.chain-indicator {
  font-size: 0.65rem;
  padding: 3px 6px;
  border-radius: 12px;
  color: white;
  font-weight: 600;
}

.profile-address {
  color: #64748b;
  font-family: monospace;
  font-size: 0.8rem;
  margin-bottom: 5px;
}

.compatibility-score {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.85rem;
  padding: 3px 8px;
  border-radius: 12px;
}

.compatibility-score.high-match {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.compatibility-score.medium-match {
  background-color: #fff8e1;
  color: #f57f17;
}

.compatibility-score.low-match {
  background-color: #ffebee;
  color: #c62828;
}

.profile-bio {
  margin: 15px 0;
}

.profile-bio p {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.5;
  color: #334155;
}

.profile-interests, .profile-assets {
  margin-top: 15px;
}

.profile-interests h4, .profile-assets h4 {
  margin: 0 0 8px 0;
  font-size: 0.9rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.interest-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.interest-tag {
  background-color: #f1f5f9;
  padding: 4px 10px;
  border-radius: 15px;
  font-size: 0.8rem;
  color: #334155;
}

.assets-group {
  margin-bottom: 10px;
}

.assets-label {
  font-size: 0.85rem;
  color: #64748b;
  margin-right: 10px;
}

.assets-list {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 5px;
}

.asset-tag {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.nft-tag {
  background-color: #eef2ff;
  color: #4338ca;
}

.token-tag {
  background-color: #ecfdf5;
  color: #047857;
}

.profile-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 20px;
}

.action-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  cursor: pointer;
  color: white;
  transition: transform 0.2s, background-color 0.2s;
}

.action-btn:hover:not(:disabled) {
  transform: scale(1.05);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.like-btn {
  background-color: #f43f5e;
}

.like-btn:hover:not(:disabled) {
  background-color: #e11d48;
}

.like-btn .liked {
  color: white;
}

.accept-btn {
  background-color: #22c55e;
}

.accept-btn:hover:not(:disabled) {
  background-color: #16a34a;
}

.reject-btn {
  background-color: #64748b;
}

.reject-btn:hover:not(:disabled) {
  background-color: #475569;
}

.message-btn {
  background-color: #3b82f6;
}

.message-btn:hover:not(:disabled) {
  background-color: #2563eb;
}

.edit-btn {
  background-color: #8b5cf6;
}

.edit-btn:hover:not(:disabled) {
  background-color: #7c3aed;
}

/* Roman theme styling */
.roman-theme {
  background-color: #f8f5e6;
  border: 1px solid #d3c5a8;
}

.roman-theme .profile-name {
  color: #8B4513;
}

.roman-theme .avatar-placeholder {
  background: linear-gradient(145deg, #f0e6d2, #e0d2b8);
  color: #8B4513;
}

.roman-theme .interest-tag {
  background-color: #f0e6d2;
  color: #8B4513;
}

.roman-theme .nft-tag {
  background-color: #eff4e7;
  color: #596C56;
}

.roman-theme .token-tag {
  background-color: #f5ebd7;
  color: #8B4513;
}

.roman-theme .like-btn {
  background-color: #A52A2A;
}

.roman-theme .like-btn:hover:not(:disabled) {
  background-color: #8B0000;
}

.roman-theme .accept-btn {
  background-color: #2E8B57;
}

.roman-theme .accept-btn:hover:not(:disabled) {
  background-color: #006400;
}

.roman-theme .message-btn {
  background-color: #4682B4;
}

.roman-theme .message-btn:hover:not(:disabled) {
  background-color: #4169E1;
}

.roman-theme .edit-btn {
  background-color: #800080;
}

.roman-theme .edit-btn:hover:not(:disabled) {
  background-color: #4B0082;
}

/* Responsive styles */
@media (max-width: 480px) {
  .profile-header {
    flex-direction: column;
    text-align: center;
  }
  
  .profile-info {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
}
</style>
