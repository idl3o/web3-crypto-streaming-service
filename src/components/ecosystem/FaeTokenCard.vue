<template>
  <div class="fae-token-card" :class="realmClass">
    <div class="token-header">
      <div class="token-realm">{{ capitalizeRealm(token.realm) }}</div>
      <div class="token-affinity" :class="token.affinity">
        {{ capitalizeRealm(token.affinity) }}
      </div>
    </div>
    
    <div class="token-essence">
      <span class="amount">{{ token.essence.toFixed(2) }}</span>
      <span class="label">Essence</span>
    </div>
    
    <div class="token-metrics">
      <div class="metric">
        <div class="metric-bar">
          <div class="metric-fill luminance" :style="{ width: `${token.luminance * 100}%` }"></div>
        </div>
        <div class="metric-label">Luminance</div>
      </div>
      
      <div class="metric">
        <div class="metric-bar">
          <div class="metric-fill resonance" :style="{ width: `${token.resonance * 100}%` }"></div>
        </div>
        <div class="metric-label">Resonance</div>
      </div>
    </div>
    
    <div v-if="token.enchantments.length > 0" class="token-enchantments">
      <div class="enchantments-title">Enchantments</div>
      <div class="enchantment-tags">
        <span v-for="(enchantmentId, index) in token.enchantments" 
              :key="index" 
              class="enchantment-tag">
          {{ getEnchantmentName(enchantmentId) }}
        </span>
      </div>
    </div>
    
    <div v-if="token.migrations.length > 0" class="token-migrations">
      <div class="migrations-title">
        <span class="migrations-count">{{ token.migrations.length }}</span> Migrations
      </div>
    </div>
    
    <div class="token-actions">
      <button class="action-button harvest" @click.stop="$emit('harvest', token.id)">
        Harvest
      </button>
      <button class="action-button enchant" @click.stop="$emit('enchant', token.id)">
        Enchant
      </button>
    </div>
    
    <div class="token-time">
      Harvested {{ harvestTimeFormatted }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, PropType } from 'vue';
import { FaeToken, FaeRealm } from '../../utils/fae-ecosystem';
import { useFaeStore } from '../../stores/fae';

const props = defineProps({
  token: {
    type: Object as PropType<FaeToken>,
    required: true
  }
});

defineEmits(['harvest', 'enchant']);

const faeStore = useFaeStore();

const realmClass = computed(() => {
  return `realm-${props.token.realm}`;
});

const harvestTimeFormatted = computed(() => {
  const date = new Date(props.token.harvestTime);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
});

function capitalizeRealm(realm: string): string {
  return realm.charAt(0).toUpperCase() + realm.slice(1);
}

function getEnchantmentName(enchantmentId: string): string {
  const enchantment = faeStore.availableEnchantments.get(enchantmentId);
  return enchantment?.name || 'Unknown Enchantment';
}
</script>

<style scoped>
.fae-token-card {
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background-color: #fff;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
}

.fae-token-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 6px;
  z-index: 1;
}

.realm-seelie {
  border: 1px solid rgba(255, 215, 0, 0.3);
}
.realm-seelie::before {
  background: linear-gradient(90deg, #ffd700, #ffffe0);
}

.realm-unseelie {
  border: 1px solid rgba(72, 61, 139, 0.3);
}
.realm-unseelie::before {
  background: linear-gradient(90deg, #483d8b, #9370db);
}

.realm-wyldwood {
  border: 1px solid rgba(34, 139, 34, 0.3);
}
.realm-wyldwood::before {
  background: linear-gradient(90deg, #228b22, #7cfc00);
}

.realm-twilight {
  border: 1px solid rgba(138, 43, 226, 0.3);
}
.realm-twilight::before {
  background: linear-gradient(90deg, #8a2be2, #da70d6);
}

.token-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.token-realm {
  font-weight: 600;
  font-size: 1.1rem;
}

.token-affinity {
  font-size: 0.8rem;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  color: white;
}

.earth { background-color: #8B4513; }
.air { background-color: #87CEEB; }
.fire { background-color: #FF4500; }
.water { background-color: #1E90FF; }
.aether { background-color: #9932CC; }

.token-essence {
  text-align: center;
  margin-bottom: 1.5rem;
}

.token-essence .amount {
  font-size: 2rem;
  font-weight: 700;
  display: block;
}

.token-essence .label {
  font-size: 0.9rem;
  opacity: 0.6;
}

.token-metrics {
  margin-bottom: 1rem;
}

.metric {
  margin-bottom: 0.7rem;
}

.metric-bar {
  height: 8px;
  background-color: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.metric-fill {
  height: 100%;
  border-radius: 4px;
}

.luminance {
  background: linear-gradient(90deg, #ffe259, #ffa751);
}

.resonance {
  background: linear-gradient(90deg, #4facfe, #00f2fe);
}

.metric-label {
  font-size: 0.8rem;
  margin-top: 0.2rem;
  opacity: 0.7;
}

.token-enchantments, .token-migrations {
  margin-bottom: 1rem;
  padding-top: 0.5rem;
  border-top: 1px solid #f0f0f0;
}

.enchantments-title, .migrations-title {
  font-size: 0.8rem;
  opacity: 0.7;
  margin-bottom: 0.5rem;
}

.migrations-count {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 20px;
  height: 20px;
  background-color: #f0f0f0;
  border-radius: 50%;
  font-size: 0.75rem;
  margin-right: 0.25rem;
}

.enchantment-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.enchantment-tag {
  font-size: 0.75rem;
  background-color: #f0f0f0;
  padding: 0.2rem 0.5rem;
  border-radius: 10px;
}

.token-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.action-button {
  flex: 1;
  padding: 0.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.harvest {
  background-color: #4facfe;
  color: white;
}

.harvest:hover {
  background-color: #2a8af6;
}

.enchant {
  background-color: #9333ea;
  color: white;
}

.enchant:hover {
  background-color: #7e22ce;
}

.token-time {
  margin-top: 1rem;
  font-size: 0.8rem;
  opacity: 0.5;
  text-align: center;
}

/* Animation */
@keyframes glow {
  0% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
  50% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.8); }
  100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
}

.fae-token-card:hover {
  transform: translateY(-5px);
}
</style>
