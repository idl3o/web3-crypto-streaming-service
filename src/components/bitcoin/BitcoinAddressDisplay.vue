<template>
  <div class="bitcoin-address-display" :class="{ 'is-invalid': !isValid && showValidation }">
    <div class="address-container" @click="copyToClipboard" :title="copyTooltip">
      <div class="address-type-indicator" :style="{ backgroundColor: typeColor }" v-if="showType">
        <div class="type-icon">{{ typeIcon }}</div>
      </div>
      
      <div class="address-content">
        <div class="address-text" :class="{ 'monospace': useMonospace }">
          <span v-if="showFull">{{ address }}</span>
          <span v-else>{{ formattedAddress }}</span>
        </div>
        
        <div class="address-meta" v-if="showDetails">
          <span class="address-type">{{ addressType }}</span>
          <span class="address-network" v-if="showNetwork">{{ network }}</span>
        </div>
      </div>
      
      <div class="address-actions">
        <button 
          v-if="showCopyButton" 
          class="copy-button" 
          @click.stop="copyToClipboard" 
          :title="copyTooltip"
        >
          <span v-if="copied">✓</span>
          <span v-else>📋</span>
        </button>
        
        <button 
          v-if="showExplorer" 
          class="explorer-button" 
          @click.stop="openInExplorer" 
          title="View on block explorer"
        >
          🔍
        </button>
        
        <button 
          v-if="showQR" 
          class="qr-button" 
          @click.stop="toggleQRCode" 
          title="Show QR code"
        >
          📱
        </button>
      </div>
    </div>
    
    <div class="validation-message" v-if="!isValid && showValidation">
      Invalid Bitcoin address
    </div>
    
    <div class="qr-container" v-if="showQRCode">
      <div class="qr-code">
        <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="Bitcoin Address QR Code" />
        <div v-else class="qr-loading">Generating QR code...</div>
      </div>
      <div class="qr-close" @click="toggleQRCode">✕</div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted } from 'vue';
import { 
  validateBitcoinAddress, 
  formatBitcoinAddressForDisplay, 
  getBitcoinAddressType,
  getAddressTypeColor,
  generateBitcoinAddressQRCode,
  getBitcoinAddressExplorerUrl,
  BitcoinAddressType 
} from '../../utils/BitcoinAddressUtils';

export default defineComponent({
  name: 'BitcoinAddressDisplay',
  
  props: {
    address: {
      type: String,
      required: true
    },
    showValidation: {
      type: Boolean,
      default: false
    },
    maxLength: {
      type: Number,
      default: 16
    },
    network: {
      type: String,
      default: 'mainnet',
      validator: (value: string) => ['mainnet', 'testnet'].includes(value)
    },
    showFull: {
      type: Boolean,
      default: false
    },
    showCopyButton: {
      type: Boolean,
      default: true
    },
    showExplorer: {
      type: Boolean,
      default: true
    },
    showQR: {
      type: Boolean,
      default: false
    },
    showType: {
      type: Boolean,
      default: true
    },
    showNetwork: {
      type: Boolean,
      default: false
    },
    showDetails: {
      type: Boolean,
      default: true
    },
    useMonospace: {
      type: Boolean,
      default: true
    }
  },
  
  emits: ['copy', 'explorer', 'qr', 'valid-change'],
  
  setup(props, { emit }) {
    const copied = ref(false);
    const showQRCode = ref(false);
    const qrCodeUrl = ref('');
    
    const isValid = computed(() => {
      return validateBitcoinAddress(props.address);
    });
    
    const formattedAddress = computed(() => {
      return formatBitcoinAddressForDisplay(props.address, props.maxLength);
    });
    
    const addressTypeValue = computed(() => {
      return getBitcoinAddressType(props.address);
    });
    
    const addressType = computed(() => {
      switch (addressTypeValue.value) {
        case BitcoinAddressType.P2PKH:
          return 'Legacy';
        case BitcoinAddressType.P2SH:
          return 'P2SH';
        case BitcoinAddressType.BECH32:
          return 'SegWit';
        case BitcoinAddressType.BECH32M:
          return 'Taproot';
        default:
          return 'Unknown';
      }
    });
    
    const typeColor = computed(() => {
      return getAddressTypeColor(addressTypeValue.value);
    });
    
    const typeIcon = computed(() => {
      switch (addressTypeValue.value) {
        case BitcoinAddressType.P2PKH:
          return '1';
        case BitcoinAddressType.P2SH:
          return '3';
        case BitcoinAddressType.BECH32:
          return 'bc1';
        case BitcoinAddressType.BECH32M:
          return 'bc1p';
        default:
          return '?';
      }
    });
    
    const copyTooltip = computed(() => {
      return copied.value ? 'Copied!' : 'Copy to clipboard';
    });
    
    const copyToClipboard = () => {
      if (!props.address) return;
      
      navigator.clipboard.writeText(props.address).then(() => {
        copied.value = true;
        setTimeout(() => {
          copied.value = false;
        }, 2000);
        
        emit('copy', props.address);
      });
    };
    
    const openInExplorer = () => {
      if (!isValid.value) return;
      
      const url = getBitcoinAddressExplorerUrl(props.address, props.network as any);
      window.open(url, '_blank');
      emit('explorer', url);
    };
    
    const toggleQRCode = async () => {
      showQRCode.value = !showQRCode.value;
      
      if (showQRCode.value && !qrCodeUrl.value) {
        qrCodeUrl.value = await generateBitcoinAddressQRCode(props.address);
        emit('qr', qrCodeUrl.value);
      }
    };
    
    // Watch for address changes
    watch(() => props.address, (newValue) => {
      const newValid = validateBitcoinAddress(newValue);
      emit('valid-change', newValid);
      
      // Clear QR code when address changes
      if (qrCodeUrl.value) {
        qrCodeUrl.value = '';
      }
    });
    
    // Check validity on mount
    onMounted(() => {
      emit('valid-change', isValid.value);
    });
    
    return {
      isValid,
      formattedAddress,
      addressType,
      addressTypeValue,
      typeColor,
      typeIcon,
      copied,
      copyTooltip,
      showQRCode,
      qrCodeUrl,
      copyToClipboard,
      openInExplorer,
      toggleQRCode
    };
  }
});
</script>

<style scoped>
.bitcoin-address-display {
  display: flex;
  flex-direction: column;
  width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.address-container {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.address-container:hover {
  background: #e8e8e8;
}

.address-type-indicator {
  width: 24px;
  height: 24px;
  min-width: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 0.7rem;
  margin-right: 10px;
}

.type-icon {
  font-size: 0.7rem;
  line-height: 1;
}

.address-content {
  flex: 1;
  overflow: hidden;
}

.address-text {
  font-size: 0.95rem;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.address-text.monospace {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
}

.address-meta {
  display: flex;
  gap: 8px;
  font-size: 0.75rem;
  color: #666;
  margin-top: 2px;
}

.address-type {
  font-weight: 500;
}

.address-network::before {
  content: "•";
  margin-right: 8px;
}

.address-actions {
  display: flex;
  gap: 8px;
  margin-left: 10px;
}

.copy-button,
.explorer-button,
.qr-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  font-size: 1rem;
  border-radius: 4px;
  line-height: 1;
  opacity: 0.7;
  transition: opacity 0.2s, background-color 0.2s;
}

.copy-button:hover,
.explorer-button:hover,
.qr-button:hover {
  opacity: 1;
  background-color: rgba(0, 0, 0, 0.05);
}

.validation-message {
  color: #d32f2f;
  font-size: 0.8rem;
  margin-top: 4px;
}

.is-invalid .address-container {
  border: 1px solid #d32f2f;
  background: #ffebee;
}

.qr-container {
  position: relative;
  margin-top: 10px;
  background: white;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.qr-code {
  width: 150px;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-code img {
  max-width: 100%;
  max-height: 100%;
}

.qr-close {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.8rem;
}

.qr-loading {
  color: #666;
  font-size: 0.9rem;
}

@media (prefers-color-scheme: dark) {
  .address-container {
    background: #2d2d2d;
  }

  .address-container:hover {
    background: #3d3d3d;
  }

  .address-text {
    color: #e0e0e0;
  }

  .address-meta {
    color: #9e9e9e;
  }

  .copy-button:hover,
  .explorer-button:hover,
  .qr-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .is-invalid .address-container {
    background: #3a1b1b;
  }

  .qr-container {
    background: #1e1e1e;
  }

  .qr-close {
    background: #333;
    color: #e0e0e0;
  }

  .qr-loading {
    color: #9e9e9e;
  }
}
</style>
