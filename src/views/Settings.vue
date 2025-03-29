<template>
  <div class="settings">
    <div class="container py-4">
      <h1 class="h3 mb-4">Settings</h1>
      
      <div class="row">
        <!-- Settings navigation sidebar -->
        <div class="col-md-3 mb-4">
          <div class="list-group">
            <button
              v-for="section in settingSections"
              :key="section.id"
              class="list-group-item list-group-item-action"
              :class="{ active: activeSection === section.id }"
              @click="activeSection = section.id"
            >
              <i :class="`fas fa-${section.icon} me-2`"></i> {{ section.name }}
            </button>
          </div>
        </div>
        
        <!-- Settings content area -->
        <div class="col-md-9">
          <!-- Account settings -->
          <div v-if="activeSection === 'account'" class="card border-0 shadow-sm">
            <div class="card-header bg-white">
              <h5 class="card-title mb-0">Account Settings</h5>
            </div>
            <div class="card-body">
              <div class="mb-4">
                <h6>Connected Wallet</h6>
                <div v-if="isWalletConnected" class="d-flex align-items-center">
                  <img :src="walletAvatar" alt="Wallet avatar" class="rounded-circle me-3" width="48" height="48">
                  <div>
                    <div>{{ walletStore.account }}</div>
                    <div class="small text-muted">{{ walletStore.networkName }}</div>
                  </div>
                </div>
                <div v-else>
                  <p class="text-muted">No wallet connected</p>
                  <button class="btn btn-primary" @click="connectWallet">
                    <i class="fas fa-wallet me-2"></i> Connect Wallet
                  </button>
                </div>
              </div>
              
              <div class="mb-3">
                <h6>Display Name</h6>
                <div class="input-group mb-3">
                  <input type="text" class="form-control" v-model="userProfile.username">
                  <button class="btn btn-outline-secondary" type="button" @click="saveProfile">Save</button>
                </div>
                <div class="form-text">This name will be displayed to other users.</div>
              </div>
              
              <div class="mb-3">
                <h6>Profile Picture</h6>
                <div class="d-flex align-items-center">
                  <div class="me-3">
                    <img :src="userProfile.avatar" alt="Profile" class="rounded-circle" width="64" height="64">
                  </div>
                  <div>
                    <button class="btn btn-outline-secondary btn-sm" @click="pickAvatar">Change Avatar</button>
                  </div>
                </div>
              </div>
              
              <div class="mb-3">
                <h6>Bio</h6>
                <textarea class="form-control" v-model="userProfile.bio" rows="3"></textarea>
              </div>
            </div>
          </div>
          
          <!-- Notifications settings -->
          <div v-if="activeSection === 'notifications'" class="card border-0 shadow-sm">
            <div class="card-header bg-white">
              <h5 class="card-title mb-0">Notification Settings</h5>
            </div>
            <div class="card-body">
              <div class="mb-4">
                <h6>Email Notifications</h6>
                <div class="form-check form-switch mb-2">
                  <input class="form-check-input" type="checkbox" id="notifyNewContent" v-model="notifications.newContent">
                  <label class="form-check-label" for="notifyNewContent">New content from creators you follow</label>
                </div>
                <div class="form-check form-switch mb-2">
                  <input class="form-check-input" type="checkbox" id="notifyComments" v-model="notifications.comments">
                  <label class="form-check-label" for="notifyComments">Comments on your content</label>
                </div>
                <div class="form-check form-switch mb-2">
                  <input class="form-check-input" type="checkbox" id="notifyTransactions" v-model="notifications.transactions">
                  <label class="form-check-label" for="notifyTransactions">Payment transactions</label>
                </div>
              </div>
              
              <div class="mb-4">
                <h6>Browser Push Notifications</h6>
                <div class="form-check form-switch mb-2">
                  <input class="form-check-input" type="checkbox" id="pushNotifications" v-model="notifications.push">
                  <label class="form-check-label" for="pushNotifications">Enable push notifications</label>
                </div>
                <button class="btn btn-outline-secondary btn-sm" @click="requestPushPermission" :disabled="!notifications.push">
                  Configure Permissions
                </button>
              </div>
            </div>
            <div class="card-footer bg-white">
              <button class="btn btn-primary" @click="saveNotifications">Save Notification Settings</button>
            </div>
          </div>
          
          <!-- Payment settings -->
          <div v-if="activeSection === 'payments'" class="card border-0 shadow-sm">
            <div class="card-header bg-white">
              <h5 class="card-title mb-0">Payment Settings</h5>
            </div>
            <div class="card-body">
              <div class="mb-4">
                <h6>Default Payment Method</h6>
                <div class="form-check mb-2">
                  <input class="form-check-input" type="radio" id="paymentEth" value="eth" v-model="payments.defaultToken">
                  <label class="form-check-label" for="paymentEth">ETH</label>
                </div>
                <div class="form-check mb-2">
                  <input class="form-check-input" type="radio" id="paymentUsdc" value="usdc" v-model="payments.defaultToken">
                  <label class="form-check-label" for="paymentUsdc">USDC</label>
                </div>
                <div class="form-check mb-2">
                  <input class="form-check-input" type="radio" id="paymentDai" value="dai" v-model="payments.defaultToken">
                  <label class="form-check-label" for="paymentDai">DAI</label>
                </div>
              </div>
              
              <div class="mb-4">
                <h6>Streaming Payment Limits</h6>
                <div class="mb-3">
                  <label class="form-label">Default spending limit per session</label>
                  <div class="input-group">
                    <input type="number" class="form-control" v-model="payments.defaultLimit" min="0" step="0.01">
                    <span class="input-group-text">{{ payments.defaultToken.toUpperCase() }}</span>
                  </div>
                </div>
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" id="warnLimit" v-model="payments.warnWhenApproachingLimit">
                  <label class="form-check-label" for="warnLimit">Warn me when approaching spending limit</label>
                </div>
              </div>
            </div>
            <div class="card-footer bg-white">
              <button class="btn btn-primary" @click="savePaymentSettings">Save Payment Settings</button>
            </div>
          </div>
          
          <!-- Network settings -->
          <div v-if="activeSection === 'network'" class="card border-0 shadow-sm">
            <div class="card-header bg-white">
              <h5 class="card-title mb-0">Network Settings</h5>
            </div>
            <div class="card-body">
              <!-- Network Diagnostics component -->
              <NetworkDiagnostics />
              
              <hr class="my-4">
              
              <div class="mb-4">
                <h6>Content Delivery</h6>
                <div class="form-check form-switch mb-2">
                  <input class="form-check-input" type="checkbox" id="useIpfs" v-model="network.useIpfs">
                  <label class="form-check-label" for="useIpfs">Use IPFS for content delivery</label>
                </div>
                <div class="form-check form-switch mb-2">
                  <input class="form-check-input" type="checkbox" id="useGateway" v-model="network.useGateway" :disabled="!network.useIpfs">
                  <label class="form-check-label" for="useGateway">Use IPFS gateway fallback</label>
                </div>
                
                <div class="mb-3">
                  <label for="ipfsGateway" class="form-label">Custom IPFS Gateway</label>
                  <input type="url" class="form-control" id="ipfsGateway" v-model="network.customGateway" placeholder="https://your-gateway.io/ipfs/" :disabled="!network.useIpfs">
                </div>
              </div>
              
              <div class="mb-4">
                <h6>Connection Settings</h6>
                <div class="form-check form-switch mb-2">
                  <input class="form-check-input" type="checkbox" id="useHttp2" v-model="network.useHttp2">
                  <label class="form-check-label" for="useHttp2">Use HTTP/2 protocol when available</label>
                </div>
                <div class="form-text text-muted mb-3">
                  Disable HTTP/2 if you encounter connection issues.
                </div>
                
                <div class="mb-3">
                  <label for="maxRetries" class="form-label">Failed requests retry attempts</label>
                  <select class="form-select" id="maxRetries" v-model="network.maxRetries">
                    <option value="0">No retries</option>
                    <option value="1">1 retry</option>
                    <option value="2">2 retries</option>
                    <option value="3">3 retries</option>
                    <option value="5">5 retries</option>
                  </select>
                </div>
              </div>
              
              <!-- Local Network section -->
              <div class="mb-4">
                <h6>Local Network</h6>
                <div class="form-check form-switch mb-2">
                  <input class="form-check-input" type="checkbox" id="enableLocalNet" v-model="network.enableLocalNetwork">
                  <label class="form-check-label" for="enableLocalNet">Enable local network integration</label>
                </div>
                <div class="form-text text-muted mb-3">
                  Connect to a local blockchain node for development and testing.
                </div>
                
                <div v-if="network.enableLocalNetwork">
                  <local-network-bridge />
                </div>
                <div v-else class="text-center py-3 bg-light rounded">
                  <i class="fas fa-laptop-code fa-2x mb-2 text-muted"></i>
                  <p class="mb-0 text-muted">Enable local network integration to access the bridge</p>
                </div>
              </div>
            </div>
            <div class="card-footer bg-white">
              <button class="btn btn-primary" @click="saveNetworkSettings">Save Network Settings</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useWalletStore } from '@/stores/wallet'
import NetworkDiagnostics from '@/components/settings/NetworkDiagnostics.vue'
import LocalNetworkBridge from '@/components/network/LocalNetworkBridge.vue'

// Store
const walletStore = useWalletStore()

// State
const activeSection = ref('account')
const settingSections = [
  { id: 'account', name: 'Account', icon: 'user' },
  { id: 'notifications', name: 'Notifications', icon: 'bell' },
  { id: 'payments', name: 'Payments', icon: 'credit-card' },
  { id: 'network', name: 'Network & Connectivity', icon: 'network-wired' }
]

const userProfile = ref({
  username: '',
  bio: '',
  avatar: ''
})

const notifications = ref({
  newContent: true,
  comments: true,
  transactions: true,
  push: false
})

const payments = ref({
  defaultToken: 'eth',
  defaultLimit: 0.05,
  warnWhenApproachingLimit: true
})

const network = ref({
  useIpfs: true,
  useGateway: true,
  customGateway: '',
  useHttp2: true,
  maxRetries: 3,
  enableLocalNetwork: false
})

// Computed
const isWalletConnected = computed(() => walletStore.isConnected)
const walletAvatar = computed(() => userProfile.value.avatar || walletStore.userProfile?.avatar || `https://avatars.dicebear.com/api/identicon/${walletStore.account || 'user'}.svg`)

// Methods
async function connectWallet() {
  try {
    await walletStore.connectWallet()
    
    // Update user profile if wallet connected
    if (walletStore.isConnected) {
      loadUserProfile()
    }
  } catch (error) {
    console.error('Failed to connect wallet:', error)
  }
}

function loadUserProfile() {
  if (!walletStore.isConnected) return
  
  // Load from localStorage or create default
  try {
    const storedProfile = localStorage.getItem(`profile_${walletStore.account}`)
    
    if (storedProfile) {
      const parsedProfile = JSON.parse(storedProfile)
      userProfile.value = parsedProfile
    } else {
      // Create default profile
      userProfile.value = {
        username: `user_${walletStore.shortAddress}`,
        bio: '',
        avatar: walletStore.userProfile?.avatar || `https://avatars.dicebear.com/api/identicon/${walletStore.account}.svg`
      }
    }
  } catch (error) {
    console.error('Failed to load user profile:', error)
  }
}

function saveProfile() {
  if (!walletStore.isConnected) return
  
  try {
    localStorage.setItem(`profile_${walletStore.account}`, JSON.stringify(userProfile.value))
    alert('Profile saved successfully')
  } catch (error) {
    console.error('Failed to save profile:', error)
  }
}

function pickAvatar() {
  // Simple avatar selection
  const avatarStyle = prompt('Enter avatar style (identicon, jdenticon, avataaars):', 'identicon')
  if (avatarStyle) {
    userProfile.value.avatar = `https://avatars.dicebear.com/api/${avatarStyle}/${walletStore.account || Date.now()}.svg`
  }
}

function requestPushPermission() {
  if (!('Notification' in window)) {
    alert('This browser does not support notifications')
    return
  }
  
  Notification.requestPermission()
    .then(permission => {
      if (permission === 'granted') {
        notifications.value.push = true
      } else {
        notifications.value.push = false
        alert('Notification permission denied')
      }
    })
}

function saveNotifications() {
  try {
    localStorage.setItem('notification_settings', JSON.stringify(notifications.value))
    alert('Notification settings saved')
  } catch (error) {
    console.error('Failed to save notification settings:', error)
  }
}

function savePaymentSettings() {
  try {
    localStorage.setItem('payment_settings', JSON.stringify(payments.value))
    alert('Payment settings saved')
  } catch (error) {
    console.error('Failed to save payment settings:', error)
  }
}

function saveNetworkSettings() {
  try {
    localStorage.setItem('network_settings', JSON.stringify(network.value))
    
    // Set current session environment variables
    process.env.VUE_APP_USE_HTTP2 = network.value.useHttp2 ? 'true' : 'false'
    process.env.VUE_APP_NETWORK_MAX_RETRIES = network.value.maxRetries.toString()
    
    // Custom IPFS gateway if specified
    if (network.value.customGateway && network.value.useIpfs) {
      process.env.VUE_APP_IPFS_GATEWAY_URL = network.value.customGateway
    }
    
    alert('Network settings saved. Some changes may require a page reload to take effect.')
  } catch (error) {
    console.error('Failed to save network settings:', error)
  }
}

// Initialize
onMounted(() => {
  // Load user profile
  if (walletStore.isConnected) {
    loadUserProfile()
  }
  
  // Load notification settings
  try {
    const notifSettings = localStorage.getItem('notification_settings')
    if (notifSettings) {
      notifications.value = JSON.parse(notifSettings)
    }
  } catch (error) {
    console.error('Failed to load notification settings:', error)
  }
  
  // Load payment settings
  try {
    const paymentSettings = localStorage.getItem('payment_settings')
    if (paymentSettings) {
      payments.value = JSON.parse(paymentSettings)
    }
  } catch (error) {
    console.error('Failed to load payment settings:', error)
  }
  
  // Load network settings
  try {
    const networkSettings = localStorage.getItem('network_settings')
    if (networkSettings) {
      network.value = JSON.parse(networkSettings)
    } else {
      // Initialize from environment variables
      network.value.useHttp2 = process.env.VUE_APP_USE_HTTP2 !== 'false'
      network.value.maxRetries = parseInt(process.env.VUE_APP_NETWORK_MAX_RETRIES || '3', 10)
      network.value.customGateway = process.env.VUE_APP_IPFS_GATEWAY_URL || ''
    }
  } catch (error) {
    console.error('Failed to load network settings:', error)
  }
})
</script>

<style scoped>
.settings {
  padding-top: 1rem;
}

.list-group-item {
  cursor: pointer;
}

.list-group-item.active {
  background-color: #6366f1;
  border-color: #6366f1;
}

.card {
  overflow: hidden;
}
</style>
