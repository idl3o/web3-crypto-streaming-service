<template>
  <div class="civilization-milestones" :class="theme">
    <h5 class="milestone-title">Civilization Progress</h5>
    <div class="milestones-timeline">
      <div 
        v-for="levelData in civLevels" 
        :key="levelData.level"
        class="milestone-item"
        :class="{
          'completed': currentLevel >= levelData.level,
          'current': currentLevel === levelData.level
        }"
      >
        <div class="milestone-point">{{ levelData.icon }}</div>
        <div class="milestone-content">
          <span class="milestone-level">Level {{ levelData.level }}</span>
          <span class="milestone-name">{{ levelData.name }}</span>
          <span class="milestone-reward">{{ levelData.reward }}</span>
          <span class="milestone-points">{{ levelData.requiredPoints }} points</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useCivilizationStore } from '@/stores/civilizationStore';

const props = defineProps({
  theme: {
    type: String,
    default: 'roman-theme'
  }
});

const civStore = useCivilizationStore();
const currentLevel = computed(() => civStore.level.level);
const civLevels = computed(() => civStore.CIVILIZATION_LEVELS);
</script>

<style scoped>
.civilization-milestones {
  position: relative;
}

.milestone-title {
  margin-bottom: 1rem;
  font-size: 1.25rem;
}

.milestones-timeline {
  display: flex;
  overflow-x: auto;
  gap: 0.25rem;
  padding-bottom: 1.25rem;
  position: relative;
}

.milestones-timeline::before {
  content: '';
  position: absolute;
  top: 30px;
  left: 0;
  right: 0;
  height: 3px;
  background-color: rgba(0, 0, 0, 0.1);
  z-index: 0;
}

.milestone-item {
  position: relative;
  flex: 0 0 150px;
  text-align: center;
  padding-top: 15px;
  opacity: 0.7;
}

.milestone-item.completed {
  opacity: 1;
}

.milestone-item.current {
  opacity: 1;
}

.milestone-point {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 10px;
  background-color: white;
  border: 3px solid rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1;
  font-size: 1.25rem;
  transition: all 0.3s ease;
}

.milestone-item.completed .milestone-point {
  border-color: #4CAF50;
  transform: scale(1.1);
}

.milestone-item.current .milestone-point {
  border-color: #2196F3;
  transform: scale(1.15);
  box-shadow: 0 0 10px rgba(33, 150, 243, 0.5);
}

.milestone-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.milestone-level {
  font-weight: 600;
}

.milestone-name {
  font-size: 0.875rem;
  font-weight: 600;
}

.milestone-reward {
  font-size: 0.75rem;
  color: #555;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 130px;
  margin: 0 auto;
}

.milestone-points {
  font-size: 0.75rem;
  color: #888;
}

/* Roman theme styling */
.roman-theme .milestone-title {
  font-family: 'Trajan Pro', 'Times New Roman', serif;
  color: #8B4513;
  position: relative;
  display: inline-block;
  padding-bottom: 0.5rem;
}

.roman-theme .milestone-title::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(to right, #8B4513, transparent);
}

.roman-theme .milestones-timeline::before {
  background-color: #d5c3aa;
}

.roman-theme .milestone-point {
  border-color: #d5c3aa;
  background-color: #fcf8f3;
}

.roman-theme .milestone-item.completed .milestone-point {
  border-color: #8B4513;
}

.roman-theme .milestone-item.current .milestone-point {
  border-color: #D4AF37;
  box-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
}

.roman-theme .milestone-name {
  font-family: 'Cinzel', serif;
  color: #5D4037;
}

/* Arc theme styling */
.arc-theme .milestone-title {
  font-family: 'Montserrat', sans-serif;
  color: var(--arc-text-primary);
}

.arc-theme .milestones-timeline::before {
  background-color: var(--arc-border);
}

.arc-theme .milestone-point {
  border-color: var(--arc-border);
  box-shadow: var(--arc-shadow-sm);
}

.arc-theme .milestone-item.completed .milestone-point {
  border-color: var(--arc-success);
}

.arc-theme .milestone-item.current .milestone-point {
  border-color: var(--arc-primary);
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.4);
}

.arc-theme .milestone-name {
  font-family: 'Montserrat', sans-serif;
  color: var(--arc-text-primary);
}

.arc-theme .milestone-reward {
  color: var(--arc-text-secondary);
}

/* Vacay theme styling */
.vacay-theme .milestone-title {
  font-family: 'Pacifico', cursive;
  color: var(--vacay-primary);
}

.vacay-theme .milestones-timeline::before {
  background-color: var(--vacay-border);
}

.vacay-theme .milestone-point {
  border-color: var(--vacay-border);
  background-color: white;
}

.vacay-theme .milestone-item.completed .milestone-point {
  border-color: var(--vacay-palm);
}

.vacay-theme .milestone-item.current .milestone-point {
  border-color: var(--vacay-ocean);
  box-shadow: 0 0 10px rgba(33, 150, 243, 0.4);
}

.vacay-theme .milestone-name {
  font-family: 'Poppins', sans-serif;
  color: var(--vacay-text);
}

.vacay-theme .milestone-reward,
.vacay-theme .milestone-points {
  color: var(--vacay-text-light);
}
</style>
