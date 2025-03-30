<template>
  <div class="social-auth-section">
    <h3 class="social-auth-title" v-if="showTitle">{{ title }}</h3>
    
    <div class="social-auth-buttons">
      <!-- VK Authentication Button -->
      <VKLoginButton 
        v-if="enableVK" 
        :client-id="vkClientId"
        :redirect-uri="vkRedirectUri"
        :button-text="vkButtonText"
        @login="handleVKLogin"
        @error="handleVKError"
      />
      
      <!-- Additional social providers can be added here -->
    </div>
    
    <div v-if="error" class="auth-error">
      <span class="error-icon">⚠️</span>
      <span class="error-message">{{ error }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import VKLoginButton from '../social/VKLoginButton.vue';
import { VKAuthResult } from '../../services/VKAuthService';

export default defineComponent({
  name: 'SocialAuthHandler',
  
  components: {
    VKLoginButton
  },
  
  props: {
    title: {
      type: String,
      default: 'Continue with'
    },
    showTitle: {
      type: Boolean,
      default: true
    },
    enableVK: {
      type: Boolean,
      default: true
    },
    vkClientId: {
      type: String,
      default: ''
    },
    vkRedirectUri: {
      type: String,
      default: ''
    },
    vkButtonText: {
      type: String,
      default: 'Continue with VK'
    }
  },
  
  emits: ['vk-login', 'auth-error'],
  
  setup(props, { emit }) {
    const error = ref('');
    
    // Handle successful VK login
    const handleVKLogin = (result: VKAuthResult) => {
      error.value = '';
      emit('vk-login', result);
    };
    
    // Handle VK login error
    const handleVKError = (err: Error) => {
      error.value = `VK authentication failed: ${err.message}`;
      emit('auth-error', { provider: 'vk', error: err });
    };
    
    return {
      error,
      handleVKLogin,
      handleVKError
    };
  }
});
</script>

<style scoped>
.social-auth-section {
  margin: 1.5rem 0;
}

.social-auth-title {
  font-size: 1rem;
  font-weight: 500;
  margin-bottom: 1rem;
  color: #333;
  text-align: center;
}

.social-auth-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.auth-error {
  margin-top: 1rem;
  padding: 10px;
  border-radius: 4px;
  background-color: #fff0f0;
  border: 1px solid #ffcdd2;
  color: #d32f2f;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.error-icon {
  font-size: 1rem;
}

/* Dark theme support */
@media (prefers-color-scheme: dark) {
  .social-auth-title {
    color: #e0e0e0;
  }
  
  .auth-error {
    background-color: rgba(211, 47, 47, 0.1);
    border-color: rgba(211, 47, 47, 0.3);
  }
}
</style>
