<template>
  <div class="fae-quest-card" :class="difficultyClass">
    <div class="quest-difficulty-badge">{{ quest.difficulty }}</div>
    
    <h3 class="quest-title">{{ quest.title }}</h3>
    <p class="quest-description">{{ quest.description }}</p>
    
    <div class="quest-requirements" v-if="hasRequirements">
      <h4>Requirements</h4>
      <ul>
        <li v-if="quest.requiredRealm">
          Realm: <span class="requirement">{{ capitalizeRealm(quest.requiredRealm) }}</span>
        </li>
        <li v-if="quest.requiredAffinity">
          Affinity: <span class="requirement">{{ capitalizeRealm(quest.requiredAffinity) }}</span>
        </li>
        <li v-if="quest.minLuminance">
          Min Luminance: <span class="requirement">{{ quest.minLuminance }}</span>
        </li>
        <li v-if="quest.minResonance">
          Min Resonance: <span class="requirement">{{ quest.minResonance }}</span>
        </li>
      </ul>
    </div>
    
    <div class="quest-rewards">
      <h4>Rewards</h4>
      <div class="rewards-list">
        <div class="reward">
          <div class="reward-amount">{{ quest.rewardEssence }}</div>
          <div class="reward-type">Essence</div>
        </div>
        <div class="reward" v-if="quest.rewardEnchantment">
          <div class="reward-type">+</div>
          <div class="reward-type">Enchantment</div>
        </div>
      </div>
    </div>
    
    <div class="quest-actions">
      <button 
        v-if="status === 'available'" 
        @click="$emit('start', quest.id)"
        class="action-button start"
      >
        Start Quest
      </button>
      <button 
        v-else-if="status === 'active'"
        class="action-button progress"
        disabled
      >
        In Progress
      </button>
      <button 
        v-else-if="status === 'completed'"
        @click="$emit('claim', quest.id)"
        class="action-button claim"
      >
        Claim Reward
      </button>
      <button 
        v-else-if="status === 'claimed'"
        class="action-button claimed"
        disabled
      >
        Completed
      </button>
    </div>
    
    <div class="quest-time">
      <div class="time-remaining" v-if="status === 'active'">
        {{ formattedTimeRemaining }}
      </div>
      <div class="time-info" v-else>
        Duration: {{ formatDuration(quest.duration) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, PropType } from 'vue';
import { FaeQuest, QuestDifficulty } from '../../utils/fae-ecosystem';

const props = defineProps({
  quest: {
    type: Object as PropType<FaeQuest>,
    required: true
  },
  status: {
    type: String as PropType<'available' | 'active' | 'completed' | 'claimed'>,
    required: true
  },
  timeRemaining: {
    type: Number,
    default: 0
  }
});

defineEmits(['start', 'claim']);

const difficultyClass = computed(() => {
  return `difficulty-${props.quest.difficulty.toLowerCase()}`;
});

const hasRequirements = computed(() => {
  return props.quest.requiredRealm || 
         props.quest.requiredAffinity ||
         props.quest.minLuminance ||
         props.quest.minResonance;
});

const formattedTimeRemaining = computed(() => {
  if (props.timeRemaining <= 0) return 'Ready to complete!';
  
  const days = Math.floor(props.timeRemaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor((props.timeRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((props.timeRemaining % (60 * 60 * 1000)) / (60 * 1000));
  
  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  } else {
    return `${minutes}m remaining`;
  }
});

function capitalizeRealm(realm: string): string {
  return realm.charAt(0).toUpperCase() + realm.slice(1);
}

function formatDuration(ms: number): string {
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  
  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''}`;
  } else {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
}
</script>

<style scoped>
.fae-quest-card {
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background-color: #fff;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.fae-quest-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 6px;
  z-index: 1;
}

.difficulty-simple::before {
  background: linear-gradient(90deg, #4ade80, #a3e635);
}

.difficulty-moderate::before {
  background: linear-gradient(90deg, #2dd4bf, #38bdf8);
}

.difficulty-complex::before {
  background: linear-gradient(90deg, #f59e0b, #f97316);
}

.difficulty-mythical::before {
  background: linear-gradient(90deg, #8b5cf6, #ec4899);
}

.quest-difficulty-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  background-color: #f3f4f6;
}

.quest-title {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
  padding-right: 4rem;
  color: #1f2937;
}

.quest-description {
  font-size: 0.9rem;
  margin-bottom: 1rem;
  color: #6b7280;
  line-height: 1.5;
}

.quest-requirements {
  margin-bottom: 1rem;
  padding: 0.75rem;
  background-color: #f9fafb;
  border-radius: 8px;
}

.quest-requirements h4,
.quest-rewards h4 {
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  color: #4b5563;
}

.quest-requirements ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.quest-requirements li {
  font-size: 0.8rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
}

.requirement {
  margin-left: 0.25rem;
  color: #4b5563;
  font-weight: 600;
}

.quest-rewards {
  margin-bottom: 1rem;
}

.rewards-list {
  display: flex;
  gap: 1rem;
}

.reward {
  text-align: center;
}

.reward-amount {
  font-size: 1.25rem;
  font-weight: 700;
  color: #10b981;
}

.reward-type {
  font-size: 0.75rem;
  color: #6b7280;
}

.quest-actions {
  margin-top: 1rem;
}

.action-button {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.start {
  background-color: #6366f1;
  color: white;
}

.start:hover {
  background-color: #4f46e5;
}

.progress {
  background-color: #f3f4f6;
  color: #4b5563;
  cursor: default;
}

.claim {
  background-color: #10b981;
  color: white;
}

.claim:hover {
  background-color: #059669;
}

.claimed {
  background-color: #e5e7eb;
  color: #9ca3af;
  cursor: default;
}

.quest-time {
  margin-top: 1rem;
  font-size: 0.8rem;
  text-align: center;
}

.time-remaining {
  color: #f59e0b;
  font-weight: 500;
}

.time-info {
  color: #9ca3af;
}

.fae-quest-card:hover {
  transform: translateY(-5px);
}
</style>
