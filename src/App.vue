<template>
  <div id="app" class="app-container" :class="currentTheme">
    <!-- App Header with navigation -->
    <AppHeader />
    <header :class="currentTheme">
      <nav>
        <router-link to="/">Home</router-link>
        <router-link to="/content">Browse Content</router-link>
        <router-link to="/investments">Investments</router-link>
        <router-link to="/about">About</router-link>

        <!-- Theme Toggle Button -->
        <button class="theme-toggle" @click="toggleTheme">
          <i class="fas" :class="themeIcon"></i>
        </button>

        <!-- Theme Control -->
        <div class="theme-control">
          <ThemeToggler 
            :initial-theme="currentTheme" 
            @theme-changed="handleThemeChange"
          />
        </div>
      </nav>
    </header>
    <WorldStatus />

    <!-- Quick Access Floating Button for Content Creation -->
    <div v-if="isWalletConnected && !isContentCreationPage" class="quick-create-btn">
      <router-link to="/create" class="btn btn-primary btn-circle">
        <i class="fas fa-plus"></i>
      </router-link>
    </div>

    <!-- Theme switcher -->
    <div class="theme-switcher-container">
      <ThemeSwitcher :initial-theme="currentTheme" @change="switchTheme" />
    </div>

    <!-- Main Content Area -->
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- App Footer -->
    <AppFooter />

    <!-- Wallet Connection Modal -->
    <div v-if="showConnectWallet" class="wallet-connect-modal modal fade show" style="display: block" tabindex="-1"
      aria-modal="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Connect Your Wallet</h5>
            <button type="button" class="btn-close" @click="closeConnectModal"></button>
          </div>
          <div class="modal-body">
            <p class="mb-4">Connect your wallet to start creating and streaming content.</p>
            <div class="d-grid gap-2">
              <button class="btn btn-outline-secondary text-start" @click="connectWallet('metamask')">
                <div class="d-flex align-items-center">
                  <img src="@/assets/metamask.svg" alt="MetaMask" width="30" class="me-3">
                  <div>
                    <strong>MetaMask</strong>
                    <div class="small text-muted">Connect using browser extension</div>
                  </div>
                </div>
              </button>
              <button class="btn btn-outline-secondary text-start" @click="connectWallet('walletconnect')">
                <div class="d-flex align-items-center">
                  <img src="@/assets/walletconnect.svg" alt="WalletConnect" width="30" class="me-3">
                  <div>
                    <strong>WalletConnect</strong>
                    <div class="small text-muted">Scan with your mobile wallet</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeConnectModal">Cancel</button>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show"></div>
    </div>

    <!-- Global transaction notification -->
    <TransactionAlert :transaction="transactionStore.newTransactionAlert"
      @dismiss="transactionStore.clearTransactionAlert" />

    <!-- Global toast handler -->
    <ToastMessage ref="toastHandlerRef" :theme="currentTheme" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import WorldStatus from '@/components/WorldStatus.vue'
import TransactionAlert from '@/components/transaction/TransactionAlert.vue'
import { useTransactionStore } from '@/stores/transactionStore'
import ThemeSwitcher from '@/components/shared/ThemeSwitcher.vue'
import ToastMessage from '@/components/shared/ToastMessage.vue'
import { toastService } from '@/services/toastService'
import '@/assets/css/roman-theme.css'
import '@/assets/css/arc-theme.css'
import '@/assets/css/vacay-theme.css'
import { useScoreStore } from '@/stores/scoreStore'
import ThemeToggler from './components/common/ThemeToggler.vue'

// Router
const route = useRoute()
const router = useRouter()

// Store
const walletStore = useWalletStore()
const transactionStore = useTransactionStore()

// State
const showConnectWallet = ref(false)

// Computed
const isWalletConnected = computed(() => walletStore.isConnected)
const isContentCreationPage = computed(() => {
  return route.path.includes('/create') || route.path.includes('/manage')
})

// Theme state
const currentTheme = ref(localStorage.getItem('preferredTheme') || 'default-theme');

function switchTheme(theme) {
  currentTheme.value = `${theme}-theme`;
}

// Make theme available to all components
provide('currentTheme', currentTheme);

// Methods
function connectWallet(provider) {
  walletStore.connectWallet(provider)
    .then(() => {
      closeConnectModal()

      // Check if there's a redirect query parameter
      const redirectPath = route.query.redirect
      if (redirectPath) {
        router.push(redirectPath.toString())
      }
    })
    .catch(error => {
      console.error('Failed to connect wallet:', error)
      // Show error notification
    })
}

function closeConnectModal() {
  showConnectWallet.value = false

  // Remove query parameters if we're on the home page
  if (route.name === 'home' && route.query.authRequired) {
    router.replace({ query: {} })
  }
}

function handleThemeChange(theme) {
  currentTheme.value = theme;
}

// Watch for authentication requirements from router
watch(() => route.query.authRequired, (newValue) => {
  if (newValue === 'true') {
    showConnectWallet.value = true
  }
})

// Check on mount if we need to show wallet connection modal
onMounted(() => {
  if (route.query.authRequired === 'true') {
    showConnectWallet.value = true
  }

  // Initialize transaction store
  transactionStore.initialize()

  // Load saved theme preference
  const savedTheme = localStorage.getItem('preferred-theme');
  if (savedTheme) {
    currentTheme.value = `${savedTheme}-theme`;
  }

  // Apply saved theme
  document.documentElement.classList.add(currentTheme.value);

  // Register toast handler
  if (toastHandlerRef.value) {
    toastService.setHandler(toastHandlerRef.value);
  }

  // Initialize the score store
  const scoreStore = useScoreStore();
  scoreStore.initialize();
})

// Watch for new transactions and update scores
watch(() => transactionStore.newTransactionAlert, (newTransaction) => {
  if (newTransaction) {
    const scoreStore = useScoreStore();
    scoreStore.processNewActivity();
  }
});

// Toast handler reference
const toastHandlerRef = ref(null);
</script>

<style>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  padding-top: 60px;
  /* Adjust based on header height */
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.quick-create-btn {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 1030;
}

.btn-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.modal-backdrop {
  background-color: rgba(0, 0, 0, 0.5);
}

.theme-switcher-container {
  position: fixed;
  bottom: 30px;
  left: 30px;
  z-index: 1030;
}

.theme-control {
  margin-left: auto;
  padding: 0 15px;
}
</style>
