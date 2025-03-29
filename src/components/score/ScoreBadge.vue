<template>
  <div class="score-badge" :class="[theme, size]">
    <i class="fas fa-trophy"></i>
    <span class="score-value">{{ formattedScore }}</span>
    <div v-if="showRank" class="rank-indicator">{{ scoreStore.scoreRank.rank }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useScoreStore } from '@/stores/scoreStore';

const props = defineProps({
  theme: {
    type: String,
    default: 'roman-theme'
  },
  size: {
    type: String,
    default: 'medium', // small, medium, large
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  },
  showRank: {
    type: Boolean,
    default: false
  }
});

const scoreStore = useScoreStore();

// Format score for display
const formattedScore = computed(() => {
  const score = scoreStore.scores.overall;
  
  if (score >= 1000000) {
    return `${(score / 1000000).toFixed(1)}M`;
  }
  
  if (score >= 1000) {
    return `${(score / 1000).toFixed(1)}K`;
  }
  
  return score.toString();
});
</script>

<style scoped>
.score-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.75rem;
  border-radius: 50px;
  background-color: rgba(0, 0, 0, 0.05);
  font-weight: 600;
  position: relative;
}

.score-badge i {
  margin-right: 0.375rem;
  opacity: 0.8;
}

/* Size variants */
.score-badge.small {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.score-badge.medium {
  font-size: 0.875rem;
}

.score-badge.large {
  padding: 0.5rem 1rem;
  font-size: 1rem;
}

.rank-indicator {
  position: absolute;
  top: -8px;
  right: -8px;
  background-color: #f44336;
  color: white;
  border-radius: 50px;
  padding: 0.125rem 0.375rem;
  font-size: 0.625rem;
  font-weight: 700;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Theme-specific styling */
.roman-theme.score-badge {
  background-color: #f9f5ef;
  border: 1px solid #d5c3aa;
  color: #8B4513;
}

.roman-theme .rank-indicator {
  background: linear-gradient(to bottom, #8B4513, #654321);
}

.arc-theme.score-badge {
  background-color: var(--arc-surface);
  box-shadow: var(--arc-shadow-sm);
  color: var(--arc-text-primary);
}

.arc-theme .rank-indicator {
  background: var(--arc-gradient-primary);
}

.vacay-theme.score-badge {
  background-color: rgba(224, 247, 250, 0.3);
  box-shadow: var(--vacay-shadow-sm);
  color: var(--vacay-text);
}

.vacay-theme .rank-indicator {
  background: var(--vacay-primary);
}
</style>
