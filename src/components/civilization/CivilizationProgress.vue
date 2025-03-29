<template>
  <div class="civilization-progress" :class="theme">
    <div class="civ-header">
      <div class="civ-name-container">
        <h4 class="civ-name">{{ civStore.name }}</h4>
        <button v-if="editMode" class="save-name-btn" @click="saveName">
          <i class="fas fa-check"></i>
        </button>
        <button v-else class="edit-name-btn" @click="startEditName">
          <i class="fas fa-edit"></i>
        </button>
      </div>
      <div v-if="editMode" class="name-edit">
        <input 
          ref="nameInput"
          v-model="editableName" 
          class="name-input" 
          @keyup.enter="saveName" 
        />
      </div>
      
      <div class="level-display">
        <div class="level-icon">{{ civStore.level.icon }}</div>
        <div class="level-info">
          <div class="level-name">{{ civStore.level.name }}</div>
          <div class="level-number">Level {{ civStore.level.level }}</div>
        </div>
      </div>
    </div>
    
    <div class="level-progress-container">
      <div class="progress-bar" :style="{width: `${civStore.progressToNextLevel}%`}"></div>
      <span class="progress-text">{{ civStore.points }} / {{ civStore.nextLevel?.requiredPoints || 'Max' }} points</span>
    </div>
    
    <div class="civ-resources">
      <div 
        v-for="(amount, type) in civStore.resources" 
        :key="type" 
        class="resource-item"
        :title="`${type.charAt(0).toUpperCase() + type.slice(1)}: ${amount}`"
      >
        <span class="resource-icon">{{ civStore.getResourceMetadata(type).icon }}</span>
        <span class="resource-amount">{{ amount }}</span>
      </div>
    </div>
    
    <div class="civ-benefits">
      <div class="benefit-item">
        <i class="fas fa-percentage"></i>
        <span>{{ (civStore.feeDiscount * 100).toFixed(1) }}% Fee Discount</span>
      </div>
      <div 
        v-if="civStore.level.reward" 
        class="benefit-item"
        :title="civStore.level.reward"
      >
        <i class="fas fa-award"></i>
        <span>{{ civStore.level.reward }}</span>
      </div>
    </div>
    
    <div v-if="showAchievements" class="civ-achievements">
      <h5 class="section-title">Achievements ({{ civStore.unlockedAchievements.length }} / {{ civStore.ACHIEVEMENTS.length }})</h5>
      <div class="achievement-list">
        <div 
          v-for="achievement in civStore.unlockedAchievements" 
          :key="achievement.id"
          class="achievement-badge"
          :title="achievement.description"
        >
          <span class="achievement-icon">{{ achievement.icon }}</span>
          <span class="achievement-name">{{ achievement.name }}</span>
        </div>
      </div>
    </div>
    
    <div v-if="showBuildings && civStore.availableBuildings.length > 0" class="civ-buildings">
      <h5 class="section-title">Available Buildings</h5>
      <div class="building-list">
        <div 
          v-for="building in civStore.availableBuildings" 
          :key="building.id"
          class="building-item"
          :class="{ 'can-build': canBuildBuilding(building) }"
          @click="buildBuilding(building)"
        >
          <div class="building-icon">{{ building.icon }}</div>
          <div class="building-info">
            <div class="building-name">{{ building.name }}</div>
            <div class="building-effect">{{ building.effect }}</div>
            <div class="building-cost">
              <span v-for="(cost, resource) in building.cost" :key="resource">
                {{ civStore.getResourceMetadata(resource).icon }} {{ cost }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="showBuildings && civStore.constructedBuildings.length > 0" class="civ-buildings constructed">
      <h5 class="section-title">Constructed Buildings</h5>
      <div class="building-list">
        <div 
          v-for="building in civStore.constructedBuildings" 
          :key="building.id"
          class="building-item built"
        >
          <div class="building-icon">{{ building.icon }}</div>
          <div class="building-info">
            <div class="building-name">{{ building.name }}</div>
            <div class="building-effect">{{ building.effect }}</div>
          </div>
        </div>
      </div>
    </div>
    
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue';
import { useCivilizationStore } from '@/stores/civilizationStore';
import { toastService } from '@/services/toastService';

const props = defineProps({
  theme: {
    type: String,
    default: 'roman-theme'
  },
  showAchievements: {
    type: Boolean,
    default: true
  },
  showBuildings: {
    type: Boolean,
    default: true
  },
  compact: {
    type: Boolean,
    default: false
  }
});

const civStore = useCivilizationStore();
const editMode = ref(false);
const editableName = ref(civStore.name);
const nameInput = ref(null);
const toastRef = ref(null);

// Check if player can afford to build a building
function canBuildBuilding(building) {
  for (const [resource, cost] of Object.entries(building.cost)) {
    if (civStore.resources[resource] < cost) {
      return false;
    }
  }
  return true;
}

// Attempt to build a building
function buildBuilding(building) {
  if (!canBuildBuilding(building)) {
    toastService.error(`Not enough resources to build ${building.name}`);
    return;
  }
  
  const success = civStore.constructBuilding(building.id);
  
  if (success) {
    toastService.success(`Successfully built ${building.name}!`);
  } else {
    toastService.error(`Failed to build ${building.name}`);
  }
}

// Edit civilization name
function startEditName() {
  editMode.value = true;
  nextTick(() => {
    if (nameInput.value) {
      nameInput.value.focus();
    }
  });
}

function saveName() {
  if (editableName.value.trim()) {
    civStore.renameCivilization(editableName.value.trim());
  }
  editMode.value = false;
}

onMounted(() => {
  // Initialize civilization data
  civStore.initialize();
});
</script>

<style scoped>
.civilization-progress {
  background-color: #fcf8f3;
  border-radius: 0.5rem;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.civ-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  align-items: center;
}

.civ-name-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.civ-name {
  margin: 0;
  font-size: 1.25rem;
}

.level-display {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.level-icon {
  font-size: 1.75rem;
}

.level-name {
  font-weight: 600;
  margin-bottom: 0.125rem;
}

.level-number {
  font-size: 0.875rem;
  color: #555;
}

.level-progress-container {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 50px;
  height: 0.75rem;
  margin-bottom: 1rem;
  position: relative;
  overflow: hidden;
}

.progress-bar {
  position: absolute;
  height: 100%;
  background: linear-gradient(90deg, #8B4513, #D4AF37);
  border-radius: 50px;
  transition: width 0.5s ease-out;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.75rem;
  color: white;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
  white-space: nowrap;
}

.civ-resources {
  display: flex;
  justify-content: space-around;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.resource-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-weight: 600;
}

.resource-icon {
  font-size: 1.125rem;
}

.civ-benefits {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 50px;
  font-size: 0.875rem;
}

.section-title {
  margin-top: 0;
  margin-bottom: 0.75rem;
  font-size: 1rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  padding-bottom: 0.5rem;
}

.achievement-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.achievement-badge {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 50px;
  font-size: 0.875rem;
}

.achievement-icon {
  font-size: 1.125rem;
}

.building-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.building-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: 0.7;
}

.building-item.can-build {
  opacity: 1;
  background-color: rgba(16, 185, 129, 0.1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.building-item.can-build:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.building-item.built {
  background-color: rgba(79, 70, 229, 0.1);
  cursor: default;
  opacity: 1;
}

.building-icon {
  font-size: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
}

.building-info {
  flex: 1;
}

.building-name {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.building-effect {
  font-size: 0.8125rem;
  margin-bottom: 0.5rem;
  color: #555;
}

.building-cost {
  display: flex;
  gap: 0.75rem;
  font-size: 0.875rem;
}

.edit-name-btn, .save-name-btn {
  background: none;
  border: none;
  font-size: 0.875rem;
  opacity: 0.7;
  cursor: pointer;
  transition: opacity 0.2s;
}

.edit-name-btn:hover, .save-name-btn:hover {
  opacity: 1;
}

.name-edit {
  margin-top: 0.5rem;
}

.name-input {
  padding: 0.25rem 0.5rem;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 100%;
}

/* Roman theme specific styling */
.roman-theme .civ-name {
  font-family: 'Trajan Pro', 'Times New Roman', serif;
  color: #8B4513;
}

.roman-theme .level-name {
  font-family: 'Cinzel', serif;
  color: #5D4037;
}

.roman-theme .progress-bar {
  background: linear-gradient(90deg, #8B4513, #D4AF37);
}

.roman-theme .benefit-item {
  border: 1px solid #e6d6bf;
}

.roman-theme .building-item {
  border: 1px solid rgba(213, 195, 170, 0.3);
}

.roman-theme .building-item.can-build {
  border-color: rgba(16, 185, 129, 0.3);
}

.roman-theme .building-item.built {
  border-color: rgba(79, 70, 229, 0.3);
}

/* Arc theme styling */
.arc-theme.civilization-progress {
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(30, 41, 59, 0.08);
}

.arc-theme .civ-name {
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  color: var(--arc-text-primary);
}

.arc-theme .level-name {
  font-family: 'Montserrat', sans-serif;
  color: var(--arc-text-primary);
}

.arc-theme .level-number {
  color: var(--arc-text-secondary);
}

.arc-theme .progress-bar {
  background: linear-gradient(90deg, var(--arc-primary), var(--arc-secondary));
}

.arc-theme .benefit-item {
  background-color: var(--arc-surface);
  border: none;
  border-radius: 12px;
  box-shadow: var(--arc-shadow-sm);
  color: var(--arc-text-primary);
}

.arc-theme .building-item,
.arc-theme .achievement-badge {
  background-color: var(--arc-surface);
  border: none;
  border-radius: 12px;
  box-shadow: var(--arc-shadow-sm);
}

.arc-theme .building-item.can-build {
  background-color: rgba(16, 185, 129, 0.05);
}

.arc-theme .building-item.built {
  background-color: rgba(99, 102, 241, 0.05);
}

/* Vacay theme styling */
.vacay-theme.civilization-progress {
  background: linear-gradient(120deg, rgba(255,255,255,0.8) 0%, rgba(247,253,255,0.9) 100%);
  box-shadow: var(--vacay-shadow);
  border-radius: 12px;
}

.vacay-theme .civ-name {
  font-family: 'Pacifico', cursive;
  color: var(--vacay-primary);
}

.vacay-theme .level-name {
  font-family: 'Poppins', sans-serif;
  color: var(--vacay-text);
}

.vacay-theme .level-number {
  color: var(--vacay-text-light);
}

.vacay-theme .progress-bar {
  background: linear-gradient(90deg, var(--vacay-ocean), var(--vacay-primary));
}

.vacay-theme .benefit-item,
.vacay-theme .achievement-badge {
  background-color: rgba(224, 247, 250, 0.3);
  color: var(--vacay-text);
  box-shadow: var(--vacay-shadow-sm);
}

.vacay-theme .building-item {
  background-color: rgba(224, 247, 250, 0.3);
  box-shadow: var(--vacay-shadow-sm);
}

.vacay-theme .building-item.can-build {
  background-color: rgba(38, 166, 154, 0.1);
}

.vacay-theme .building-item.built {
  background-color: rgba(33, 150, 243, 0.1);
}
</style>
