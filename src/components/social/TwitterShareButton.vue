<template>
  <button 
    @click="shareToTwitter" 
    :title="buttonTitle"
    class="twitter-share-button"
    :class="{ 'compact': compact }"
  >
    <span class="icon">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
      </svg>
    </span>
    <span v-if="!compact" class="text">{{ buttonText }}</span>
  </button>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { twitterService } from '../../services/TwitterService';

export default defineComponent({
  name: 'TwitterShareButton',
  
  props: {
    text: {
      type: String,
      required: true
    },
    url: {
      type: String,
      default: ''
    },
    hashtags: {
      type: Array as () => string[],
      default: () => []
    },
    via: {
      type: String,
      default: 'web3streaming'
    },
    compact: {
      type: Boolean,
      default: false
    },
    buttonText: {
      type: String,
      default: 'Share on X'
    }
  },
  
  emits: ['shared'],
  
  setup(props, { emit }) {
    const buttonTitle = computed(() => {
      return `Share on X: ${props.text}`;
    });
    
    const shareToTwitter = () => {
      try {
        // Generate share URL
        const shareUrl = twitterService.generateShareUrl({
          text: props.text,
          url: props.url || window.location.href,
          hashtags: props.hashtags,
          via: props.via
        });
        
        // Open in a new window
        window.open(shareUrl, '_blank', 'width=550,height=420');
        
        // Emit event
        emit('shared', { platform: 'twitter', text: props.text, url: props.url });
      } catch (error) {
        console.error('Error sharing to Twitter:', error);
      }
    };
    
    return {
      buttonTitle,
      shareToTwitter
    };
  }
});
</script>

<style scoped>
.twitter-share-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background-color: #1DA1F2;
  color: white;
  border: none;
  border-radius: 24px;
  padding: 8px 16px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.twitter-share-button.compact {
  padding: 8px;
  border-radius: 50%;
}

.twitter-share-button:hover {
  background-color: #0c85d0;
}

.icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.text {
  white-space: nowrap;
}
</style>
