<template>
  <div class="token-auth-form">
    <h3 class="form-title">Sign in with Auth Token</h3>
    
    <div v-if="error" class="auth-error">
      {{ error }}
    </div>
    
    <form @submit.prevent="handleSubmit" class="auth-form">
      <div class="form-group">
        <label for="auth-token">Authentication Token</label>
        <textarea 
          id="auth-token" 
          v-model="token" 
          placeholder="Paste your authentication token here"
          rows="4"
          :disabled="isLoading"
        ></textarea>
      </div>
      
      <div class="actions">
        <button type="submit" class="auth-button" :disabled="!token || isLoading">
          <span v-if="isLoading" class="loading-spinner"></span>
          <span v-else>Sign In</span>
        </button>
      </div>
    </form>
    
    <div v-if="isAuthenticated" class="auth-success">
      <div class="success-message">
        <span class="success-icon">✓</span>
        Successfully authenticated!
      </div>
      <div class="user-info">
        User ID: {{ userId }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { sonaAuthService } from '../../services/SonaAuthenticationService';

export default defineComponent({
  name: 'TokenAuthForm',
  
  emits: ['auth-success', 'auth-error'],
  
  setup(props, { emit }) {
    const token = ref('');
    const isLoading = ref(false);
    const error = ref<string | null>(null);
    const isAuthenticated = ref(false);
    const userId = ref('');
    
    const handleSubmit = async () => {
      if (!token.value || isLoading.value) return;
      
      error.value = null;
      isLoading.value = true;
      
      try {
        // Attempt authentication with the token
        const authResult = await sonaAuthService.signInWithToken(token.value);
        
        // Update UI state
        isAuthenticated.value = true;
        userId.value = authResult.userId;
        
        // Emit success event
        emit('auth-success', { userId: authResult.userId });
      } catch (err) {
        // Handle authentication error
        error.value = err instanceof Error ? err.message : 'Authentication failed';
        emit('auth-error', { error: error.value });
      } finally {
        isLoading.value = false;
      }
    };
    
    return {
      token,
      isLoading,
      error,
      isAuthenticated,
      userId,
      handleSubmit
    };
  }
});
</script>

<style scoped>
.token-auth-form {
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

.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.9rem;
  resize: vertical;
}

.actions {
  display: flex;
  justify-content: center;
}

.auth-button {
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.auth-button:hover {
  background-color: #2980b9;
}

.auth-button:disabled {
  background-color: #95a5a6;
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
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: #e8f5e9;
  border-radius: 4px;
  text-align: center;
}

.success-message {
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #2e7d32;
  display: flex;
  align-items: center;
  justify-content: center;
}

.success-icon {
  margin-right: 0.5rem;
  background-color: #2e7d32;
  color: white;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.user-info {
  font-family: monospace;
  color: #333;
}
</style>
