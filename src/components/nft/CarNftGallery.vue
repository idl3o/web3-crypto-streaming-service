<template>
  <div class="car-nft-gallery">
    <div class="gallery-header">
      <h2>{{ title }}</h2>
      <div class="filters">
        <div class="filter-dropdown">
          <select v-model="activeFilter">
            <option value="all">All Cars</option>
            <option value="electric">Electric</option>
            <option value="hybrid">Hybrid</option>
            <option value="legendary">Legendary</option>
            <option value="newest">Newest</option>
          </select>
        </div>
        <div class="view-toggle">
          <button 
            class="toggle-btn" 
            :class="{ active: viewMode === 'grid' }"
            @click="viewMode = 'grid'"
          >
            Grid
          </button>
          <button 
            class="toggle-btn" 
            :class="{ active: viewMode === 'list' }"
            @click="viewMode = 'list'"
          >
            List
          </button>
        </div>
      </div>
    </div>
    
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <span>Loading car NFTs...</span>
    </div>
    
    <div v-else-if="!filteredCars.length" class="empty-gallery">
      <p>No car NFTs found. Check back later!</p>
    </div>
    
    <div 
      v-else 
      class="cars-container" 
      :class="{ 'grid-view': viewMode === 'grid', 'list-view': viewMode === 'list' }"
    >
      <CarNftCard
        v-for="car in filteredCars"
        :key="car.id"
        :car="car"
        :userAddress="userAddress"
        @view="viewCarDetails"
        @buy="buyCar"
        @list="listCarForSale"
      />
    </div>
    
    <div class="pagination" v-if="totalPages > 1">
      <button 
        class="page-btn"
        :disabled="currentPage === 1"
        @click="currentPage--"
      >
        Previous
      </button>
      <span class="page-info">{{ currentPage }} of {{ totalPages }}</span>
      <button 
        class="page-btn"
        :disabled="currentPage === totalPages"
        @click="currentPage++"
      >
        Next
      </button>
    </div>
    
    <!-- Car details modal would go here -->
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, PropType, watch } from 'vue';
import { CarNft, carNftService } from '../../services/CarNftService';
import CarNftCard from './CarNftCard.vue';

export default defineComponent({
  name: 'CarNftGallery',
  
  components: {
    CarNftCard
  },
  
  props: {
    title: {
      type: String,
      default: 'Car NFT Collection'
    },
    userAddress: {
      type: String,
      default: ''
    },
    featuredOnly: {
      type: Boolean,
      default: false
    },
    maxCars: {
      type: Number,
      default: 20
    }
  },
  
  setup(props) {
    const cars = ref<CarNft[]>([]);
    const loading = ref(true);
    const viewMode = ref<'grid' | 'list'>('grid');
    const currentPage = ref(1);
    const pageSize = ref(8);
    const activeFilter = ref('all');
    
    const loadCars = async () => {
      loading.value = true;
      
      try {
        if (props.featuredOnly) {
          cars.value = await carNftService.getFeaturedCars(props.maxCars);
        } else if (props.userAddress) {
          cars.value = await carNftService.getCarsOwnedByAddress(props.userAddress);
        } else {
          cars.value = await carNftService.getFeaturedCars(props.maxCars);
        }
      } catch (error) {
        console.error('Error loading car NFTs:', error);
      } finally {
        loading.value = false;
      }
    };
    
    const filteredCars = computed(() => {
      let result = [...cars.value];
      
      // Apply filters
      switch (activeFilter.value) {
        case 'electric':
          result = result.filter(car => car.attributes.engineType?.toLowerCase() === 'electric');
          break;
        case 'hybrid':
          result = result.filter(car => car.attributes.engineType?.toLowerCase() === 'hybrid');
          break;
        case 'legendary':
          result = result.filter(car => car.attributes.rarity === 'legendary');
          break;
        case 'newest':
          result = result.sort((a, b) => b.mintedAt - a.mintedAt);
          break;
      }
      
      // Apply pagination
      const startIndex = (currentPage.value - 1) * pageSize.value;
      return result.slice(startIndex, startIndex + pageSize.value);
    });
    
    const totalPages = computed(() => {
      return Math.ceil(cars.value.length / pageSize.value);
    });
    
    const viewCarDetails = (carId: string) => {
      const car = cars.value.find(c => c.id === carId);
      if (car) {
        // In a real app, this would open a modal or navigate to a details page
        console.log('Viewing car details:', car);
      }
    };
    
    const buyCar = ({ id, price }: { id: string; price?: number }) => {
      console.log(`Buying car ${id} for ${price} satoshis`);
      // In a real app, this would trigger a payment flow
    };
    
    const listCarForSale = (carId: string) => {
      console.log(`Listing car ${carId} for sale`);
      // In a real app, this would open a listing form
    };
    
    // Reset pagination when filter changes
    watch(activeFilter, () => {
      currentPage.value = 1;
    });
    
    onMounted(() => {
      loadCars();
    });
    
    return {
      cars,
      loading,
      viewMode,
      activeFilter,
      currentPage,
      filteredCars,
      totalPages,
      viewCarDetails,
      buyCar,
      listCarForSale
    };
  }
});
</script>

<style scoped>
.car-nft-gallery {
  margin-bottom: 2rem;
}

.gallery-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.gallery-header h2 {
  margin: 0;
  font-size: 1.8rem;
  color: #333;
}

.filters {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.filter-dropdown select {
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #ddd;
  background: white;
  font-size: 0.9rem;
}

.view-toggle {
  display: flex;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.toggle-btn {
  padding: 0.5rem 1rem;
  background: white;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
}

.toggle-btn.active {
  background: #f7931a;
  color: white;
}

.loading-container, .empty-gallery {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 0;
  background: #f9f9f9;
  border-radius: 8px;
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid rgba(247, 147, 26, 0.2);
  border-top-color: #f7931a;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.cars-container.grid-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.cars-container.list-view {
  display: flex;
  flex-direction: column;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
}

.page-btn {
  padding: 0.5rem 1rem;
  background: #f0f0f0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 0.9rem;
}
</style>
