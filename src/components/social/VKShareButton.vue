<template>
  <button 
    class="vk-share-button"
    @click="shareContent"
    :disabled="!isReady || isSharing"
    :title="buttonTitle"
  >
    <div class="vk-icon" v-if="showIcon">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.87 10.38C9.35 10.38 7.3 7.62 7.16 3.5H9.18C9.29 6.32 10.57 7.61 11.58 7.87V3.5H13.48V6.06C14.46 5.95 15.5 4.74 15.86 3.5H17.76C17.51 5.04 16.34 6.25 15.52 6.78C16.34 7.22 17.69 8.3 18.21 10.38H16.12C15.72 9.02 14.77 7.99 13.48 7.86V10.38H12.87Z" fill="currentColor"/>
      </svg>
    </div>
    <span class="button-text" v-if="!isSharing">{{ buttonText }}</span>
    <span class="sharing-indicator" v-else>
      <span class="dot"></span>
      <span class="dot"></span>
      <span class="dot"></span>
    </span>
  </button>
</template>

<script lang="ts">
import { defineComponent, ref, computed, PropType } from 'vue';
import { vkAuthService } from '../../services/VKAuthService';

export default defineComponent({
  name: 'VKShareButton',
  
  props: {
    title: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },
    url: {
      type: String,
      default: ''
    },
    image: {
      type: String,
      default: ''
    },
    buttonText: {
      type: String,
      default: 'Share'
    },
    showIcon: {
      type: Boolean,
      default: true
    },
    useCurrentPage: {
      type: Boolean,
      default: false
    },
    customMessage: {
      type: String,
      default: ''
    },
    attachments: {
      type: Array as PropType<string[]>,
      default: () => []
    },
    shareMode: {
      type: String as PropType<'popup' | 'api'>,
      default: 'popup',
      validator: (value: string) => ['popup', 'api'].includes(value)
    }
  },
  
  emits: ['shared', 'share-error', 'auth-required'],
  
  setup(props, { emit }) {
    const isSharing = ref(false);
    
    const isReady = computed(() => {
      // For API mode, we need to be authenticated
      if (props.shareMode === 'api') {
        return vkAuthService.isAuthenticated();
      }
      // For popup mode, we're always ready
      return true;
    });
    
    const buttonTitle = computed(() => {
      if (!isReady.value && props.shareMode === 'api') {
        return 'Please login to VK first';
      }
      return `Share to VK`;
    });
    
    const shareContent = async () => {
      if (!isReady.value) {
        emit('auth-required');
        return;
      }
      
      try {
        isSharing.value = true;
        
        if (props.shareMode === 'api') {
          await shareViaAPI();
        } else {
          shareViaPopup();
        }
        
        emit('shared');
      } catch (error) {
        console.error('VK sharing error:', error);
        emit('share-error', error);
      } finally {
        isSharing.value = false;
      }
    };
    
    // Share using the VK API (requires authentication)
    const shareViaAPI = async () => {
      const message = props.customMessage || createDefaultMessage();
      const attachments = [...props.attachments];
      
      // Add URL as attachment if provided
      if (props.url || (props.useCurrentPage && window.location.href)) {
        const shareUrl = props.url || window.location.href;
        attachments.push(shareUrl);
      }
      
      // Add image as attachment if provided
      if (props.image) {
        attachments.push(props.image);
      }
      
      const result = await vkAuthService.shareToWall(message, attachments);
      
      if (!result) {
        throw new Error('Failed to share to VK');
      }
      
      return result;
    };
    
    // Share using VK's share popup
    const shareViaPopup = () => {
      const shareUrl = props.url || (props.useCurrentPage ? window.location.href : '');
      const shareTitle = props.title || document.title;
      const shareDescription = props.description || '';
      const shareImage = props.image || '';
      
      const vkShareUrl = new URL('https://vk.com/share.php');
      vkShareUrl.searchParams.append('url', shareUrl);
      
      if (shareTitle) {
        vkShareUrl.searchParams.append('title', shareTitle);
      }
      
      if (shareDescription) {
        vkShareUrl.searchParams.append('description', shareDescription);
      }
      
      if (shareImage) {
        vkShareUrl.searchParams.append('image', shareImage);
      }
      
      const width = 650;
      const height = 570;
      const left = (window.innerWidth / 2) - (width / 2);
      const top = (window.innerHeight / 2) - (height / 2);
      
      window.open(
        vkShareUrl.toString(),
        'vk-share',
        `width=${width},height=${height},left=${left},top=${top},toolbar=0,location=0,menubar=0,directories=0,scrollbars=0`
      );
    };
    
    // Create default message for API sharing
    const createDefaultMessage = () => {
      const parts = [];
      
      if (props.title) {
        parts.push(props.title);
      }
      
      if (props.description) {
        parts.push(props.description);
      }
      
      return parts.join('\n\n');
    };
    
    return {
      isSharing,
      isReady,
      buttonTitle,
      shareContent
    };
  }
});
</script>

<style scoped>
.vk-share-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: #5181b8;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  font-size: 14px;
  font-weight: 500;
  padding: 8px 16px;
  transition: all 0.2s ease;
  height: 36px;
}

.vk-share-button:hover {
  background-color: #4a76a8;
}

.vk-share-button:active {
  background-color: #3a6598;
  transform: scale(0.97);
}

.vk-share-button:disabled {
  background-color: #879eb9;
  cursor: not-allowed;
  opacity: 0.7;
}

.vk-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.sharing-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
}

.dot {
  width: 4px;
  height: 4px;
  background-color: white;
  border-radius: 50%;
  animation: dot-pulse 1s infinite;
}

.dot:nth-child(1) {
  animation-delay: 0s;
}

.dot:nth-child(2) {
  animation-delay: 0.2s;
}

.dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes dot-pulse {
  0%, 100% {
    opacity: 0.4;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}
</style>
