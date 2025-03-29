<template>
  <header class="app-header" :class="currentTheme">
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
      <div class="container">
        <router-link class="navbar-brand d-flex align-items-center" to="/">
          <i class="fas fa-stream me-2"></i>CryptoStream
        </router-link>

        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarMain">
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="navbarMain">
          <ul class="navbar-nav me-auto">
            <li class="nav-item">
              <router-link class="nav-link" :to="{ name: 'home' }">Home</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" :to="{ name: 'content-browse' }">Browse</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" :to="{ name: 'vision' }">Vision</router-link>
            </li>
            <li class="nav-item" v-if="isWalletConnected">
              <router-link class="nav-link" :to="{ name: 'content-manage' }">My Content</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link fae-link" :to="{ name: 'fae-ecosystem' }">
                <span class="fae-icon">✨</span> Fae Realm
              </router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" :to="{ name: 'transactions' }">
                <i class="fas fa-history me-1"></i> Transactions
              </router-link>
            </li>
          </ul>

          <div class="d-flex align-items-center">
            <ScoreBadge v-if="isWalletConnected" :theme="currentTheme" size="small" />
            <div class="me-3" v-if="isWalletConnected">
              <div class="dropdown">
                <button class="btn btn-outline-light dropdown-toggle" data-bs-toggle="dropdown">
                  <span class="d-none d-sm-inline me-1">{{ walletStore.shortAddress }}</span>
                  <i class="fas fa-user"></i>
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                  <li>
                    <h6 class="dropdown-header">Account</h6>
                  </li>
                  <li>
                    <router-link class="dropdown-item" :to="{ name: 'dashboard' }">
                      <i class="fas fa-tachometer-alt me-2"></i> Dashboard
                    </router-link>
                  </li>
                  <li>
                    <router-link class="dropdown-item" :to="{ name: 'content-manage' }">
                      <i class="fas fa-film me-2"></i> My Content
                    </router-link>
                  </li>
                  <li>
                    <router-link class="dropdown-item" :to="{ name: 'settings' }">
                      <i class="fas fa-cog me-2"></i> Settings
                    </router-link>
                  </li>
                  <li>
                    <hr class="dropdown-divider">
                  </li>
                  <li>
                    <button class="dropdown-item text-danger" @click="disconnectWallet">
                      <i class="fas fa-sign-out-alt me-2"></i> Disconnect
                    </button>
                  </li>
                </ul>
              </div>
              <div class="fae-status" v-if="faeStore.hasTokens">
                <router-link to="/fae-ecosystem" class="fae-status-link">
                  {{ faeStore.userTokens.length }} Fae Token{{ faeStore.userTokens.length !== 1 ? 's' : '' }}
                </router-link>
              </div>
            </div>

            <button v-if="!isWalletConnected" class="btn btn-primary" @click="connectWallet">
              <i class="fas fa-wallet me-2"></i> Connect Wallet
            </button>

            <router-link v-if="isWalletConnected" class="btn btn-success" :to="{ name: 'content-create' }">
              <i class="fas fa-plus me-2"></i> Create
            </router-link>
          </div>
        </div>
      </div>
    </nav>
  </header>
  <div class="app-header">
    <h1>App Header</h1>
    <p>This is the app header component.</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import { useFaeStore } from '@/stores/fae'
import ScoreBadge from '@/components/score/ScoreBadge.vue'

// Store
const walletStore = useWalletStore()
const faeStore = useFaeStore()
const route = useRoute()

// Computed
const isWalletConnected = computed(() => walletStore.isConnected)

// Methods
function connectWallet() {
  walletStore.connectWallet()
    .catch((error) => {
      console.error('Failed to connect wallet:', error)
    })
}

function disconnectWallet() {
  walletStore.disconnectWallet()
}
</script>

<style scoped>
.app-header {
  margin-bottom: 60px;
  /* Match navbar height */
  border: 1px solid #ccc;
  padding: 10px;
  margin-bottom: 10px;
}

.navbar-brand {
  font-weight: 700;
}

.dropdown-toggle:after {
  vertical-align: middle;
}

.fae-link {
  display: flex;
  align-items: center;
  color: #8b5cf6;
  font-weight: 500;
}

.fae-link:hover {
  color: #7c3aed;
}

.fae-icon {
  margin-right: 0.25rem;
}

.fae-status {
  margin-left: 1rem;
  padding: 0.25rem 0.75rem;
  background-color: #f3e8ff;
  border-radius: 16px;
}

.fae-status-link {
  color: #8b5cf6;
  font-size: 0.85rem;
  text-decoration: none;
  font-weight: 500;
}

.fae-status-link:hover {
  color: #7c3aed;
  text-decoration: underline;
}
</style>
