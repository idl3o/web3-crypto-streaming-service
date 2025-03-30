<template>
  <div class="car-nft-card" :class="{ 'expanded': isExpanded }">
    <div 
      class="card-image" 
      @click="toggleExpanded"
      :style="{ backgroundImage: `url(${car.imageUrl})` }"
    >
      <div class="car-rarity" :class="car.attributes.rarity">
        {{ car.attributes.rarity }}
      </div>
      <div class="card-price" v-if="car.currentPrice">
        {{ formatSatoshi(car.currentPrice) }}
      </div>
    </div>
    
    <div class="card-content">
      <h3 class="car-name">{{ car.name }}</h3>
      <div class="car-make">{{ car.make }} {{ car.model }} ({{ car.year }})</div>
      
      <div class="car-stats" v-if="isExpanded">
        <div class="stat">
          <span class="stat-label">Engine</span>
          <span class="stat-value">{{ car.attributes.engineType }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Power</span>
          <span class="stat-value">{{ car.attributes.horsepower }} hp</span>
        </div>
        <div class="stat">
          <span class="stat-label">0-60</span>
          <span class="stat-value">{{ car.attributes.acceleration }}s</span>
        </div>
        <div class="stat" v-if="car.attributes.range">
          <span class="stat-label">Range</span>
          <span class="stat-value">{{ car.attributes.range }} mi</span>
        </div>
        
        <div class="features">
          <div class="feature" v-for="(feature, index) in car.attributes.uniqueFeatures" :key="index">
            {{ feature }}
          </div>
        </div>
        
        <div class="ownership">
          <span class="owner-label">Owner:</span>
          <span class="owner-address">{{ truncatedAddress }}</span>
        </div>
        
        <div class="actions">
          <button class="view-btn" @click="viewDetails">View Details</button>
          <button class="buy-btn" v-if="car.currentPrice && !isOwner" @click="buyNft">Buy NFT</button>
          <button class="list-btn" v-if="isOwner" @click="listForSale">{{ car.currentPrice ? 'Update Price' : 'List for Sale' }}</button>
        </div>
      </div>
      
      <div class="expand-toggle" @click="toggleExpanded">
        {{ isExpanded ? 'Show Less' : 'Show More' }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, PropType } from 'vue';
import { formatSatoshi } from '../../utils/satoshi-utils';
import { CarNft } from '../../services/CarNftService';

export default defineComponent({
  name: 'CarNftCard',
  
  props: {
    car: {
      type: Object as PropType<CarNft>,
      required: true
    },
    userAddress: {
      type: String,
      default: ''
    }
  },
  
  emits: ['view', 'buy', 'list'],
  
  setup(props, { emit }) {
    const isExpanded = ref(false);
    
    const toggleExpanded = () => {
      isExpanded.value = !isExpanded.value;
    };
    
    const truncatedAddress = computed(() => {
      if (!props.car.ownerAddress) return '';
      return `${props.car.ownerAddress.slice(0, 6)}...${props.car.ownerAddress.slice(-4)}`;
    });
    
    const isOwner = computed(() => {
      if (!props.userAddress || !props.car.ownerAddress) return false;
      return props.userAddress.toLowerCase() === props.car.ownerAddress.toLowerCase();
    });
    
    const viewDetails = () => {
      emit('view', props.car.id);
    };
    
    const buyNft = () => {
      emit('buy', {
        id: props.car.id,
        price: props.car.currentPrice
      });
    };
    
    const listForSale = () => {
      emit('list', props.car.id);
    };
    
    return {
      isExpanded,
      toggleExpanded,
      truncatedAddress,
      isOwner,
      viewDetails,
      buyNft,
      listForSale,
      formatSatoshi
    };
  }
});
</script>

<style scoped>
.car-nft-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  margin-bottom: 20px;
  cursor: pointer;
}

.car-nft-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

.car-nft-card.expanded {
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}

.card-image {
  height: 200px;
  background-size: cover;
  background-position: center;
  position: relative;
}

.car-rarity {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 4px 8px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  color: white;
}

.car-rarity.common {
  background: #7E8A97;
}

.car-rarity.uncommon {
  background: #43a047;
}

.car-rarity.rare {
  background: #1e88e5;
}

.car-rarity.epic {
  background: #8e24aa;
}

.car-rarity.legendary {
  background: linear-gradient(45deg, #FF8C00, #FFA500);
}

.card-price {
  position: absolute;
  bottom: 10px;
  right: 10px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border-radius: 4px;
  font-weight: 600;
}

.card-content {
  padding: 16px;
}

.car-name {
  margin: 0 0 4px 0;
  font-size: 1.3rem;
  color: #333;
}

.car-make {
  color: #666;
  margin-bottom: 12px;
  font-size: 0.9rem;
}

.car-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 15px;
}

.stat {
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  padding: 10px;
  border-radius: 6px;
}

.stat-label {
  font-size: 0.8rem;
  color: #666;
}

.stat-value {
  font-weight: 600;
  color: #333;
  font-size: 0.95rem;
}

.features {
  grid-column: span 2;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.feature {
  background: #e0f2f1;
  color: #00897b;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.ownership {
  grid-column: span 2;
  margin-top: 12px;
  font-size: 0.85rem;
}

.owner-label {
  color: #666;
}

.owner-address {
  font-family: monospace;
  background: #f0f0f0;
  padding: 2px 5px;
  border-radius: 3px;
  margin-left: 5px;
}

.actions {
  grid-column: span 2;
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.actions button {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.view-btn {
  background: #f0f0f0;
  color: #333;
}

.view-btn:hover {
  background: #e0e0e0;
}

.buy-btn {
  background: #f7931a;
  color: white;
}

.buy-btn:hover {
  background: #e68318;
}

.list-btn {
  background: #42a5f5;
  color: white;
}

.list-btn:hover {
  background: #1e88e5;
}

.expand-toggle {
  text-align: center;
  color: #1e88e5;
  font-size: 0.9rem;
  font-weight: 500;
  margin-top: 10px;
  padding: 5px;
  cursor: pointer;
}

.expand-toggle:hover {
  text-decoration: underline;
}
</style>
