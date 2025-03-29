<template>
  <div class="view-mode-controller" :class="{ 'compact': isCompact }">
    <div class="view-mode-buttons">
      <!-- Grid View Button -->
      <button 
        class="view-mode-btn"
        :class="{ 'active': currentMode === VIEW_MODE.GRID }"
        @click="setViewMode(VIEW_MODE.GRID)"
        title="Grid View"
      >
        <i class="fas fa-th"></i>
      </button>
      
      <!-- List View Button -->
      <button 
        class="view-mode-btn"
        :class="{ 'active': currentMode === VIEW_MODE.LIST }"
        @click="setViewMode(VIEW_MODE.LIST)"
        title="List View"
      >
        <i class="fas fa-list"></i>
      </button>
      
      <!-- Gallery View Button -->
      <button 
        class="view-mode-btn"
        :class="{ 'active': currentMode === VIEW_MODE.GALLERY }"
        @click="setViewMode(VIEW_MODE.GALLERY)"
        title="Gallery View"
      >
        <i class="fas fa-images"></i>
      </button>
      
      <!-- Theater Mode Button -->
      <button 
        class="view-mode-btn"
        :class="{ 'active': currentMode === VIEW_MODE.THEATER }"
        @click="setViewMode(VIEW_MODE.THEATER)"
        title="Theater Mode"
      >
        <i class="fas fa-film"></i>
      </button>
      
      <!-- Hologram Mode Button (if enabled) -->
      <button 
        v-if="hologramEnabled"
        class="view-mode-btn special-mode"
        :class="{ 'active': currentMode === VIEW_MODE.HOLOGRAM }"
        @click="setViewMode(VIEW_MODE.HOLOGRAM)"
        title="Hologram Mode"
      >
        <i class="fas fa-cube"></i>
      </button>
      
      <!-- Immersive Mode Button (if enabled) -->
      <button 
        v-if="immersiveEnabled"
        class="view-mode-btn special-mode"
        :class="{ 'active': currentMode === VIEW_MODE.IMMERSIVE }"
        @click="setViewMode(VIEW_MODE.IMMERSIVE)"
        title="Immersive Mode"
      >
        <i class="fas fa-vr-cardboard"></i>
      </button>
    </div>
    
    <div class="view-options">
      <!-- Card Size Slider -->
      <div class="size-control" v-if="currentMode !== VIEW_MODE.THEATER && currentMode !== VIEW_MODE.IMMERSIVE">
        <i class="fas fa-compress-alt"></i>
        <input 
          type="range" 
          min="0" 
          max="2" 
          step="1" 
          :value="sizeValue" 
          @input="updateCardSize"
          class="size-slider"
        >
        <i class="fas fa-expand-alt"></i>
      </div>
      
      <!-- Show Details Toggle -->
      <toggle-switch 
        v-if="showDetailsToggle"
        v-model="showDetails"
        label="Details"
        title="Show/Hide Content Details"
        class="details-toggle"
      />
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import * as ViewService from '@/services/ViewService';
import ToggleSwitch from '@/components/common/ToggleSwitch.vue';

export default {
  name: 'ViewModeController',
  
  components: {
    ToggleSwitch
  },
  
  props: {
    mode: {
      type: String,
      default: null
    },
    compact: {
      type: Boolean,
      default: false
    }
  },
  
  emits: ['update:mode', 'view-changed'],
  
  setup(props, { emit }) {
    // Initialize view service
    onMounted(async () => {
      await ViewService.initialize();
    });
    
    // Compute current mode, preferring prop if passed
    const currentMode = computed(() => {
      return props.mode || ViewService.getViewMode();
    });
    
    // Configuration options
    const hologramEnabled = ref(true);
    const immersiveEnabled = ref(true);
    const isCompact = computed(() => props.compact);
    
    // Import view mode constants
    const VIEW_MODE = ViewService.VIEW_MODE;
    
    // Determine if show details toggle should be shown
    const showDetailsToggle = computed(() => {
      return [VIEW_MODE.GRID, VIEW_MODE.LIST, VIEW_MODE.GALLERY].includes(currentMode.value);
    });
    
    // Track show details preference
    const showDetails = ref(ViewService.getUserPreferences().showDetails);
    watch(showDetails, (newValue) => {
      ViewService.updateUserPreferences({ showDetails: newValue });
      emit('view-changed', { 
        mode: currentMode.value,
        showDetails: newValue,
        cardSize: ViewService.getCardSize()
      });
    });
    
    // Set up card size control logic
    const sizeToValue = {
      'small': 0,
      'medium': 1,
      'large': 2
    };
    
    const valueToSize = ['small', 'medium', 'large'];
    
    const sizeValue = computed(() => {
      const currentSize = ViewService.getCardSize();
      return sizeToValue[currentSize] || 1;
    });
    
    // Methods
    const setViewMode = (mode) => {
      if (ViewService.setViewMode(mode)) {
        emit('update:mode', mode);
        emit('view-changed', { 
          mode,
          showDetails: showDetails.value,
          cardSize: ViewService.getCardSize()
        });
      }
    };
    
    const updateCardSize = (event) => {
      const value = parseInt(event.target.value);
      const size = valueToSize[value];
      
      if (ViewService.setCardSize(size)) {
        emit('view-changed', { 
          mode: currentMode.value,
          showDetails: showDetails.value,
          cardSize: size
        });
      }
    };
    
    // Load configuration 
    onMounted(() => {
      const config = ViewService.getConfiguration();
      hologramEnabled.value = config.enableHologramMode;
      immersiveEnabled.value = config.enableImmersiveMode;
      
      // Load user preferences
      const prefs = ViewService.getUserPreferences();
      showDetails.value = prefs.showDetails;
    });
    
    return {
      currentMode,
      setViewMode,
      VIEW_MODE,
      hologramEnabled,
      immersiveEnabled,
      isCompact,
      showDetailsToggle,
      showDetails,
      sizeValue,
      updateCardSize
    };
  }
};
</script>

<style scoped>
.view-mode-controller {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  background-color: var(--bg-medium);
  border-radius: 8px;
  margin-bottom: 1rem;
  justify-content: space-between;
}

.view-mode-controller.compact {
  padding: 0.5rem;
  flex-wrap: wrap;
}

.view-mode-buttons {
  display: flex;
  gap: 0.5rem;
}

.view-mode-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 4px;
  border: 1px solid var(--border);
  background-color: var(--bg-light);
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-mode-controller.compact .view-mode-btn {
  width: 2rem;
  height: 2rem;
}

.view-mode-btn:hover {
  background-color: var(--bg-medium-hover);
}

.view-mode-btn.active {
  background-color: var(--primary);
  color: var(--text-on-primary);
  border-color: var(--primary);
}

.view-mode-btn.special-mode {
  position: relative;
}

.view-mode-btn.special-mode::after {
  content: '';
  position: absolute;
  top: -3px;
  right: -3px;
  width: 8px;
  height: 8px;
  background-color: var(--accent);
  border-radius: 50%;
}

.view-options {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.size-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.size-slider {
  width: 80px;
  margin: 0 0.5rem;
}

.details-toggle {
  margin-left: 0.5rem;
}

@media screen and (max-width: 640px) {
  .view-mode-controller {
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .view-mode-buttons {
    width: 100%;
    justify-content: center;
  }
  
  .view-options {
    width: 100%;
    justify-content: center;
  }
}

/* Uranium theme specifics */
:global(.uranium-theme) .view-mode-controller {
  background-color: var(--uranium-secondary);
  box-shadow: var(--uranium-shadow-sm);
}

:global(.uranium-theme) .view-mode-btn {
  border-color: var(--uranium-border);
  background-color: var(--uranium-bg-dark);
  color: var(--uranium-text-primary);
}

:global(.uranium-theme) .view-mode-btn:hover {
  box-shadow: var(--uranium-shadow-sm);
  background-color: var(--uranium-bg-medium);
}

:global(.uranium-theme) .view-mode-btn.active {
  background: var(--uranium-gradient-primary);
  color: var(--uranium-secondary-dark);
  box-shadow: var(--uranium-shadow-md), var(--uranium-primary-glow);
}

:global(.uranium-theme) .view-mode-btn.special-mode::after {
  background-color: var(--uranium-accent);
  box-shadow: 0 0 5px var(--uranium-accent);
}
</style>
