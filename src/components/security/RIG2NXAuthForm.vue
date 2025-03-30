<template>
  <div class="rig2nx-auth-form">
    <h3 class="form-title">Secure RIG2NX Authentication</h3>
    
    <div v-if="error" class="auth-error">
      {{ error }}
    </div>
    
    <div v-if="!isAuthenticated" class="auth-container">
      <div class="form-description">
        <p>Authenticate using the RIG2NX secure token protocol.</p>
      </div>
      
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="token-input">Enter RIG2NX Token</label>
          <div class="token-input-container">
            <input 
              type="text" 
              id="token-input"
              v-model="tokenInput"
              placeholder="rig2nx9999..."
              :disabled="isLoading"
              autocomplete="off"
              spellcheck="false"
            />
          </div>
          <div class="input-hint">Enter your full RIG2NX authentication token</div>
        </div>
        
        <div class="form-actions">
          <button 
            type="submit" 
            class="auth-button" 
            :disabled="!tokenInput || isLoading"
          >
            <span v-if="isLoading" class="loading-spinner"></span>
            <span v-else>Authenticate</span>
          </button>
          
          <button 
            type="button"
            class="secondary-button"
            @click="generateNewToken"
            :disabled="isLoading"
          >
            Generate Test Token
          </button>
        </div>
      </form>
    </div>
    
    <div v-else class="auth-success">
      <div class="success-icon">✓</div>
      <h4>Authentication Successful</h4>
      <p class="token-info">
        <span class="token-label">Token:</span>
        <span class="token-value">{{ formattedToken }}</span>
      </p>
      <p class="token-type">
        <span class="token-label">Type:</span>
        <span>{{ tokenType }}</span>
      </p>
      <p class="token-payload">
        <span class="token-label">Payload:</span>
        <span>{{ tokenPayload }}</span>
      </p>
      
      <button @click="resetAuth" class="auth-button">Reset</button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { 
  isValidRIG2NXToken,
  formatRIG2NXToken,
  generateAuthRIG2NXToken
} from '../../utils/rig2nx-utils';
import { cryptoSecurityService } from '../../services/CryptoSecurityService';

export default defineComponent({
  name: 'RIG2NXAuthForm',
  
  emits: ['auth-success', 'auth-error'],
  
  setup(props, { emit }) {
    const tokenInput = ref('');
    const isLoading = ref(false);
    const error = ref<string | null>(null);
    const isAuthenticated = ref(false);
    const validToken = ref<string>('');
    const tokenType = ref<string>('');
    const tokenPayload = ref<string>('');
    
    const formattedToken = ref<string>('');
    
    const handleSubmit = async () => {
      if (!tokenInput.value || isLoading.value) return;
      
      isLoading.value = true;
      error.value = null;
      
      try {
        // Validate the token
        if (!isValidRIG2NXToken(tokenInput.value)) {
          throw new Error('Invalid RIG2NX token format');
        }
        
        // Get token details
        const tokenData = cryptoSecurityService.validateRIG2NXToken(tokenInput.value);
        
        if (!tokenData) {
          throw new Error('Token validation failed');
        }
        
        // Set token details for display
        validToken.value = tokenData.token;
        formattedToken.value = formatRIG2NXToken(tokenData.token);
        tokenType.value = tokenData.tokenType === 't' ? 'Standard' :
                         tokenData.tokenType === 'a' ? 'Authentication' :
                         tokenData.tokenType === 'c' ? 'Challenge' : tokenData.tokenType;
        tokenPayload.value = tokenData.payload;
        
        // Update state
        isAuthenticated.value = true;
        
        // Emit success event
        emit('auth-success', {
          token: tokenData.token,
          type: tokenData.tokenType,
          payload: tokenData.payload
        });
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Authentication failed';
        emit('auth-error', { error: error.value });
      } finally {
        isLoading.value = false;
      }
    };
    
    const generateNewToken = () => {
      try {
        // Generate a new test token
        const userId = `user-${Date.now().toString(36)}`;
        const token = generateAuthRIG2NXToken(userId);
        
        // Set the token in the input field
        tokenInput.value = token;
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to generate token';
      }
    };
    
    const resetAuth = () => {
      isAuthenticated.value = false;
      tokenInput.value = '';
      validToken.value = '';
      formattedToken.value = '';
      tokenType.value = '';
      tokenPayload.value = '';
      error.value = null;
    };
    
    return {
      tokenInput,
      isLoading,
      error,
      isAuthenticated,
      formattedToken,
      tokenType,
      tokenPayload,
      handleSubmit,
      generateNewToken,
      resetAuth
    };
  }
});
</script>

<style scoped>
.rig2nx-auth-form {
  max-width: 500px;
  margin: 0 auto;
  padding: 1.5rem;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.form-title {
  margin-top: 0;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
  color: #333;
  text-align: center;
}

.form-description p {
  color: #666;
  text-align: center;
  margin-bottom: 1.5rem;
}

.auth-error {
  background-color: #ffebee;
  color: #c62828;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #555;
}

.token-input-container {
  position: relative;
}

.token-input-container input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: monospace;
  font-size: 1rem;
}

.input-hint {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: #666;
}

.form-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.auth-button {
  flex: 1;
  min-width: 120px;
  padding: 0.75rem 1rem;
  background-color: #4a6cf7;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.auth-button:hover {
  background-color: #3a5ce5;
}

.auth-button:disabled {
  background-color: #b0bec5;
  cursor: not-allowed;
}

.secondary-button {
  flex: 1;
  min-width: 120px;
  padding: 0.75rem 1rem;
  background-color: #f1f3f9;
  color: #4a6cf7;
  border: 1px solid #d0d9f4;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.secondary-button:hover {
  background-color: #e1e6f9;
}

.secondary-button:disabled {
  background-color: #f5f5f5;
  color: #bdbdbd;
  cursor: not-allowed;
}

.loading-spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.auth-success {
  text-align: center;
}

.success-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  margin: 0 auto 1.5rem;
  background-color: #e8f5e9;
  color: #2e7d32;
  font-size: 2rem;
  border-radius: 50%;
}

.auth-success h4 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #2e7d32;
}

.token-info, .token-type, .token-payload {
  margin-bottom: 0.75rem;
  padding: 0.5rem;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-family: monospace;
  word-break: break-all;
  text-align: left;
}

.token-label {
  font-weight: 600;
  margin-right: 0.5rem;
  color: #555;
}

.token-value {
  font-family: monospace;
}

.auth-success .auth-button {
  margin-top: 1.5rem;
}
</style>
