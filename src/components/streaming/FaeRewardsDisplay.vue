<template>
  <div class="fae-rewards-display" v-if="hasRewards">
    <div class="rewards-header">
      <h3>Fae Ecosystem Rewards</h3>
      <div class="rewards-summary">
        Earning {{ formattedEssenceRate }} essence per minute
      </div>
    </div>
    
    <div class="rewards-content">
      <div class="rewards-accumulated">
        <div class="reward-item">
          <div class="reward-value">{{ rewards.essence.toFixed(2) }}</div>
          <div class="reward-label">Essence</div>
        </div>
        
        <div class="reward-item">
          <div class="reward-value">{{ (rewards.luminanceBoost * 100).toFixed(1) }}%</div>
          <div class="reward-label">Luminance</div>
        </div>
        
        <div class="reward-item">
          <div class="reward-value">{{ (rewards.resonanceBoost * 100).toFixed(1) }}%</div>
          <div class="reward-label">Resonance</div>
        </div>
      </div>
      
      <div v-if="rewards.tokens.length > 0" class="affected-tokens">
        <h4>Affected Tokens</h4>
        <div class="token-pills">
          <div v-for="(token, index) in rewards.tokens" :key="index" class="token-pill" :class="token.realm">
            {{ getTokenName(token.id) }}
          </div>
        </div>
      </div>
      
      <div v-if="showBoosts" class="streaming-boosts">
        <div v-if="boosts.costReduction > 0" class="boost-badge cost-reduction">
          {{ formattedCostReduction }} Cost Reduction
        </div>
        <div v-if="boosts.qualityBoost" class="boost-badge quality-boost">
          Quality Boost Active
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, PropType } from 'vue';
import { FaeToken } from '@/utils/fae-ecosystem';

const props = defineProps({
  rewards: {
    type: Object as PropType<{
      essence: number;
      luminanceBoost: number;
      resonanceBoost: number;
      tokens: FaeToken[];
    }>,
    required: true
  },
  boosts: {
    type: Object as PropType<{
      costReduction: number;
      qualityBoost: boolean;
    }>,
    required: true
  },
  showBoosts: {
    type: Boolean,
    default: true
  }
});

const hasRewards = computed(() => {
  return props.rewards.essence > 0 || 
         props.rewards.luminanceBoost > 0 || 
         props.rewards.resonanceBoost > 0 || 
         props.rewards.tokens.length > 0;
});

const formattedEssenceRate = computed(() => {
  // This assumes the reward is calculated per minute
  return (props.rewards.essence / 10).toFixed(2);
});

const formattedCostReduction = computed(() => {
  return `${Math.round(props.boosts.costReduction * 100)}%`;
});

function getTokenName(id: string): string {
  // Return a shortened version of the token ID
  return id.substring(0, 4);
}
</script>

<style scoped>
.fae-rewards-display {
  background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
  border: 1px solid #bae6fd;
}

.rewards-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.rewards-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #0369a1;
}

.rewards-summary {
  font-size: 0.9rem;
  color: #0284c7;
}

.rewards-accumulated {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.reward-item {
  text-align: center;
  background-color: white;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  flex: 1;
}

.reward-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: #0c4a6e;
}

.reward-label {
  font-size: 0.8rem;
  color: #0369a1;
  margin-top: 0.25rem;
}

.affected-tokens h4 {
  font-size: 0.9rem;
  margin: 0 0 0.5rem 0;
  color: #0369a1;
}

.token-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.token-pill {
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  color: white;
}

.token-pill.seelie {
  background: linear-gradient(90deg, #ffd700, #ffffe0);
  color: #713f12;
}

.token-pill.unseelie {
  background: linear-gradient(90deg, #483d8b, #9370db);
}

.token-pill.wyldwood {
  background: linear-gradient(90deg, #228b22, #7cfc00);
  color: #052e16;
}

.token-pill.twilight {
  background: linear-gradient(90deg, #8a2be2, #da70d6);
}

.streaming-boosts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}

.boost-badge {
  font-size: 0.8rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-weight: 500;
}

.cost-reduction {
  background-color: #dbeafe;
  color: #1e40af;
}

.quality-boost {
  background-color: #fef3c7;
  color: #92400e;
}

@media (max-width: 640px) {
  .rewards-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .rewards-accumulated {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
