<template>
  <Transition name="slide">
    <div 
      v-if="showNotification" 
      class="ggwp-notification"
      :class="[theme, tierClass]"
      @click="onNotificationClick"
    >
      <div class="notification-inner">
        <div class="notification-icon">
          <div class="icon-background">
            <i :class="`fas ${achievement.icon || 'fa-trophy'}`"></i>
          </div>
        </div>
        
        <div class="notification-content">
          <div class="achievement-header">
            <div class="achievement-type">Achievement Unlocked!</div>
            <div class="achievement-tier">{{ formatTier(achievement.tier) }}</div>
          </div>
          
          <div class="achievement-name">{{ achievement.name }}</div>
          <div class="achievement-desc">{{ achievement.description }}</div>
          
          <div class="achievement-points">
            <i class="fas fa-star"></i> {{ achievement.points }} points
          </div>
        </div>
        
        <button class="close-btn" @click.stop="closeNotification">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, inject, onMounted, onBeforeUnmount } from 'vue';
import * as GGWPService from '@/services/GGWPService';

const props = defineProps({
  autoHideDuration: {
    type: Number,
    default: 7000 // 7 seconds
  }
});

const emit = defineEmits(['click']);
const theme = inject('currentTheme', 'roman-theme');

// State
const achievement = ref(null);
const showNotification = ref(false);
const autoHideTimer = ref(null);

// Computed
const tierClass = computed(() => {
  if (!achievement.value) return '';
  return `tier-${achievement.value.tier || 'bronze'}`;
});

// Methods
function formatTier(tier) {
  if (!tier) return 'Bronze';
  
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

function showAchievement(achievementData) {
  // Clear any existing timer
  if (autoHideTimer.value) {
    clearTimeout(autoHideTimer.value);
  }
  
  // Set the achievement
  achievement.value = achievementData;
  showNotification.value = true;
  
  // Set auto-hide timer
  autoHideTimer.value = setTimeout(() => {
    closeNotification();
  }, props.autoHideDuration);
}

function closeNotification() {
  showNotification.value = false;
  
  if (autoHideTimer.value) {
    clearTimeout(autoHideTimer.value);
    autoHideTimer.value = null;
  }
}

function onNotificationClick() {
  if (!achievement.value) return;
  
  emit('click', achievement.value);
  closeNotification();
}

function handleAchievementsEarned(achievements) {
  if (!achievements || achievements.length === 0) return;
  
  // For multiple achievements, queue them
  // For this example, we'll just show the first one
  showAchievement(achievements[0]);
}

// Lifecycle
onMounted(() => {
  // Register achievement listener
  GGWPService.registerAchievementListener('notification', handleAchievementsEarned);
});

onBeforeUnmount(() => {
  // Clean up
  if (autoHideTimer.value) {
    clearTimeout(autoHideTimer.value);
  }
  
  GGWPService.removeAchievementListener('notification');
});

// Expose methods
defineExpose({
  showAchievement,
  closeNotification
});
</script>

<style scoped>
.ggwp-notification {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 350px;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  z-index: 9999;
  cursor: pointer;
  border-left: 6px solid #ffc107;
  transition: transform 0.3s, box-shadow 0.3s;
}

.ggwp-notification:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

.notification-inner {
  display: flex;
  padding: 15px;
  position: relative;
}

.notification-icon {
  margin-right: 15px;
  display: flex;
  align-items: center;
}

.icon-background {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: #ffc107;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1.5rem;
}

.notification-content {
  flex: 1;
}

.achievement-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.achievement-type {
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  color: #6c757d;
}

.achievement-tier {
  font-size: 0.8rem;
  padding: 2px 8px;
  border-radius: 12px;
  background-color: #f8f9fa;
  color: #495057;
}

.achievement-name {
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 5px;
  color: #212529;
}

.achievement-desc {
  font-size: 0.9rem;
  color: #6c757d;
  margin-bottom: 5px;
}

.achievement-points {
  font-size: 0.85rem;
  font-weight: 600;
  color: #ffc107;
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: transparent;
  border: none;
  color: #adb5bd;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0;
}

/* Achievement Tiers */
.tier-bronze .icon-background {
  background-color: #cd7f32;
}

.tier-bronze {
  border-left-color: #cd7f32;
}

.tier-bronze .achievement-points {
  color: #cd7f32;
}

.tier-silver .icon-background {
  background-color: #c0c0c0;
}

.tier-silver {
  border-left-color: #c0c0c0;
}

.tier-silver .achievement-points {
  color: #888888;
}

.tier-gold .icon-background {
  background-color: #ffd700;
}

.tier-gold {
  border-left-color: #ffd700;
}

.tier-gold .achievement-points {
  color: #ff9900;
}

.tier-platinum .icon-background {
  background: linear-gradient(135deg, #9eacb4, #e5e4e2);
}

.tier-platinum {
  border-left-color: #e5e4e2;
}

.tier-platinum .achievement-points {
  color: #9eacb4;
}

.tier-diamond .icon-background {
  background: linear-gradient(135deg, #a1fafe, #3a86ff);
}

.tier-diamond {
  border-left-color: #3a86ff;
}

.tier-diamond .achievement-points {
  color: #3a86ff;
}

/* Roman Theme */
.roman-theme {
  font-family: 'Times New Roman', Times, serif;
}

.roman-theme .tier-bronze .icon-background {
  background-color: #CD7F32;
}

.roman-theme .tier-bronze {
  border-left-color: #CD7F32;
}

.roman-theme .tier-gold .icon-background {
  background-color: #D4AF37;
}

.roman-theme .tier-gold {
  border-left-color: #D4AF37;
}

.roman-theme .tier-silver .icon-background {
  background-color: #AAA9AD;
}

.roman-theme .tier-silver {
  border-left-color: #AAA9AD;
}

/* Transition animations */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.5s, opacity 0.5s;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100px);
  opacity: 0;
}
</style>
