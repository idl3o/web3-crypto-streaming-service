<template>
  <button 
    class="vk-login-button" 
    :class="{ 'is-loading': isLoading }" 
    @click="handleLogin"
    :disabled="isLoading"
  >
    <div class="button-content">
      <div class="vk-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93V15.07C2 20.67 3.33 22 8.93 22H15.07C20.67 22 22 20.67 22 15.07V8.93C22 3.33 20.67 2 15.07 2Z" fill="#4C75A3" stroke="#4C75A3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12.87 12.88C9.35 12.88 7.3 10.12 7.16 6H9.18C9.29 8.82 10.57 10.11 11.58 10.37V6H13.48V8.56C14.46 8.45 15.5 7.24 15.86 6H17.76C17.51 7.54 16.34 8.75 15.52 9.28C16.34 9.72 17.69 10.8 18.21 12.88H16.12C15.72 11.52 14.77 10.49 13.48 10.36V12.88H12.87Z" fill="white"/>
        </svg>
      </div>
      <span v-if="!isLoading">{{ buttonText }}</span>
      <span v-else class="loading-dots">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </span>
    </div>
  </button>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { vkAuthService } from '../../services/VKAuthService';

export default defineComponent({
  name: 'VKLoginButton',
  
  props: {
    clientId: {
      type: String,
      required: true
    },
    redirectUri: {
      type: String,
      default: ''
    },
    buttonText: {
      type: String,
      default: 'Sign in with VK'
    },
    scope: {
      type: Array as () => string[],
      default: () => ['friends', 'photos', 'email']
    }
  },
  
  emits: ['login', 'error'],
  
  setup(props, { emit }) {
    const isLoading = ref(false);
    
    // Initialize VK auth service with provided client ID
    if (vkAuthService) {
      Object.defineProperty(vkAuthService, 'clientId', { 
        value: props.clientId,
        writable: false
      });
      
      if (props.redirectUri) {
        Object.defineProperty(vkAuthService, 'redirectUri', { 
          value: props.redirectUri,
          writable: false
        });
      }
    }
    
    // Handle login flow
    const handleLogin = async () => {
      try {
        isLoading.value = true;
        
        // Check if we're handling a redirect
        if (window.location.hash.includes('access_token')) {
          const authResult = await vkAuthService.handleAuthResponse();
          
          if (authResult) {
            emit('login', authResult);
          } else {
            emit('error', new Error('Authentication failed'));
          }
        } else {
          // Start authorization flow
          vkAuthService.authorize(props.scope);
        }
      } catch (error) {
        console.error('VK login error:', error);
        emit('error', error);
      } finally {
        isLoading.value = false;
      }
    };
    
    // On component mount, check if we need to handle a redirect
    if (window.location.hash.includes('access_token')) {
      handleLogin();
    }
    
    return {
      isLoading,
      handleLogin
    };
  }
});
</script>

<style scoped>
.vk-login-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: #fff;
  border: 1px solid #dce1e6;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  font-size: 14px;
  font-weight: 500;
  height: 40px;
  min-width: 200px;
  position: relative;
  color: #2a5885;
}

.vk-login-button:hover {
  background-color: #f5f6f8;
}

.vk-login-button:active {
  transform: translateY(1px);
}

.vk-login-button.is-loading {
  cursor: default;
}

.button-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.vk-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.dot {
  width: 6px;
  height: 6px;
  background-color: #2a5885;
  border-radius: 50%;
  opacity: 0.6;
  animation: dot-flashing 1s infinite alternate;
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

@keyframes dot-flashing {
  0% {
    opacity: 0.2;
  }
  100% {
    opacity: 0.8;
  }
}

/* Dark theme support */
@media (prefers-color-scheme: dark) {
  .vk-login-button {
    background-color: #2d2f34;
    border-color: #424548;
    color: #e1e3e6;
  }

  .vk-login-button:hover {
    background-color: #3a3c42;
  }
  
  .dot {
    background-color: #e1e3e6;
  }
}
</style>
