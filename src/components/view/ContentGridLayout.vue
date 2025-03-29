<template>
  <div 
    class="content-grid" 
    :class="{ 
      'small-cards': cardSize === 'small',
      'medium-cards': cardSize === 'medium',
      'large-cards': cardSize === 'large',
      'show-details': showDetails
    }"
    :style="gridStyles"
  >
    <slot></slot>
    
    <!-- Loading placeholder -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <span>Loading content...</span>
    </div>
    
    <!-- Empty state -->
    <div v-if="isEmpty" class="empty-state">
      <i class="fas fa-search"></i>
      <h3>{{ emptyMessage }}</h3>
      <p>{{ emptyDescription }}</p>
      <slot name="empty-action"></slot>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, ref, watch } from 'vue';
import * as ViewService from '@/services/ViewService';
import { useScreenSize } from '@/composables/useScreenSize';

export default {
  name: 'ContentGridLayout',
  
  props: {
    loading: {
      type: Boolean,
      default: false
    },
    isEmpty: {
      type: Boolean,
      default: false
    },
    emptyMessage: {
      type: String,
      default: 'No content found'
    },
    emptyDescription: {
      type: String,
      default: 'Try different search terms or filters'
    },
    showDetails: {
      type: Boolean,
      default: true
    },
    cardSize: {
      type: String,
      default: null // Use user preference if not specified
    },
    gap: {
      type: String,
      default: null // Use default if not specified
    }
  },
  
  setup(props) {
    // Get screen size
    const { screenSize } = useScreenSize();
    
    // Initialize service
    const initialized = ref(false);
    onMounted(async () => {
      await ViewService.initialize();
      initialized.value = true;
    });
    
    // Compute actual card size to use
    const effectiveCardSize = computed(() => {
      return props.cardSize || ViewService.getCardSize();
    });
    
    // Compute grid column count based on screen size
    const columnCount = computed(() => {
      if (!initialized.value) {
        // Default values before initialization
        const defaults = {
          xs: 1,
          sm: 2,
          md: 3,
          lg: 4,
          xl: 6
        };
        return defaults[screenSize.value] || 1;
      }
      
      return ViewService.getGridColumns(screenSize.value);
    });
    
    // Create grid styles
    const gridStyles = computed(() => {
      const gap = props.gap || ViewService.getConfiguration().gridGap || '1rem';
      
      return {
        'grid-template-columns': `repeat(${columnCount.value}, 1fr)`,
        'gap': gap
      };
    });
    
    return {
      columnCount,
      gridStyles,
      cardSize: effectiveCardSize
    };
  }
};
</script>

<style scoped>
.content-grid {
  display: grid;
  padding: 0.5rem 0;
  position: relative;
  min-height: 200px;
}

/* Card size modifiers */
.content-grid.small-cards {
  --card-min-width: 160px;
  --card-max-width: 240px;
}

.content-grid.medium-cards {
  --card-min-width: 240px;
  --card-max-width: 320px;
}

.content-grid.large-cards {
  --card-min-width: 320px;
  --card-max-width: 480px;
}

/* Loading state */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(var(--bg-medium-rgb, 0, 0, 0), 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(var(--primary-rgb, 255, 255, 255), 0.3);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Empty state */
.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
}

.empty-state i {
  font-size: 3rem;
  margin-bottom: 1.5rem;
  opacity: 0.7;
}

.empty-state h3 {
  font-size: 1.5rem;
  margin: 0 0 0.5rem 0;
}

.empty-state p {
  margin: 0 0 1.5rem 0;
  opacity: 0.7;
  max-width: 400px;
}

/* Responsive adjustments */
@media screen and (max-width: 640px) {
  .content-grid {
    gap: 0.5rem;
  }
}

/* Uranium theme */
:global(.uranium-theme) .loading-overlay {
  background-color: var(--uranium-glass);
  backdrop-filter: blur(4px);
}

:global(.uranium-theme) .loading-spinner {
  border-color: rgba(var(--uranium-primary-rgb, 78, 255, 145), 0.3);
  border-top-color: var(--uranium-primary);
  filter: drop-shadow(0 0 8px var(--uranium-primary));
}

:global(.uranium-theme) .empty-state i {
  color: var(--uranium-primary);
  filter: drop-shadow(0 0 12px var(--uranium-primary));
}
</style>
