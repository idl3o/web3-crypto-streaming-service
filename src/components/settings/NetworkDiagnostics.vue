<template>
  <div class="network-diagnostics">
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-white d-flex justify-content-between align-items-center">
        <h5 class="card-title mb-0">Network Diagnostics</h5>
        <button class="btn btn-sm btn-outline-primary" @click="runDiagnostics" :disabled="isRunning">
          <span v-if="isRunning">
            <i class="fas fa-spinner fa-spin me-1"></i> Running...
          </span>
          <span v-else>
            <i class="fas fa-sync-alt me-1"></i> Run Diagnostics
          </span>
        </button>
      </div>
      
      <div class="card-body">
        <p class="card-text text-muted">
          Check your network connectivity to essential Web3 services needed by CryptoStream.
        </p>
        
        <div v-if="isRunning" class="text-center my-4">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Running diagnostics...</span>
          </div>
          <p class="mt-2">Testing network connections...</p>
        </div>
        
        <div v-else-if="diagnosticsResults">
          <div class="list-group mb-3">
            <div class="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <strong>IPFS Gateway</strong>
                <div class="small text-muted">Content storage and retrieval</div>
              </div>
              <div>
                <span v-if="diagnosticsResults.ipfs" class="badge bg-success">
                  <i class="fas fa-check me-1"></i> Connected
                </span>
                <span v-else class="badge bg-danger">
                  <i class="fas fa-times me-1"></i> Failed
                </span>
              </div>
            </div>
            
            <div class="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <strong>Ethereum Node</strong>
                <div class="small text-muted">Blockchain interaction</div>
              </div>
              <div>
                <span v-if="diagnosticsResults.ethereum" class="badge bg-success">
                  <i class="fas fa-check me-1"></i> Connected
                </span>
                <span v-else class="badge bg-danger">
                  <i class="fas fa-times me-1"></i> Failed
                </span>
              </div>
            </div>
            
            <div class="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <strong>API Services</strong>
                <div class="small text-muted">Backend communication</div>
              </div>
              <div>
                <span v-if="diagnosticsResults.api" class="badge bg-success">
                  <i class="fas fa-check me-1"></i> Connected
                </span>
                <span v-else class="badge bg-danger">
                  <i class="fas fa-times me-1"></i> Failed
                </span>
              </div>
            </div>
          </div>
          
          <!-- Connection Info -->
          <div class="card bg-light mb-3">
            <div class="card-body">
              <h6>Connection Details</h6>
              <table class="table table-sm table-borderless mb-0">
                <tbody>
                  <tr>
                    <td><strong>HTTP Version:</strong></td>
                    <td>{{ connectionInfo.httpVersion }}</td>
                  </tr>
                  <tr>
                    <td><strong>Network Type:</strong></td>
                    <td>{{ connectionInfo.networkType }}</td>
                  </tr>
                  <tr>
                    <td><strong>Connection:</strong></td>
                    <td>{{ connectionInfo.connection }}</td>
                  </tr>
                  <tr>
                    <td><strong>Proxy Enabled:</strong></td>
                    <td>{{ connectionInfo.proxyEnabled ? 'Yes' : 'No' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- Show troubleshooting info if there are failures -->
          <div v-if="hasFailed" class="alert alert-warning">
            <h6 class="alert-heading mb-2">
              <i class="fas fa-exclamation-triangle me-2"></i>
              Network Issues Detected
            </h6>
            <p class="mb-2">Some network services aren't accessible. This may cause problems with the application.</p>
            
            <div class="mb-3">
              <strong>Troubleshooting Steps:</strong>
              <ol class="mb-0 ps-3">
                <li v-for="(step, index) in troubleshootingSteps" :key="index">
                  {{ step }}
                </li>
              </ol>
            </div>
            
            <div class="d-flex justify-content-end">
              <button class="btn btn-sm btn-outline-secondary me-2" @click="showFirewallGuide = true">
                Firewall Guide
              </button>
              <a href="https://cryptostream.example.com/support" target="_blank" class="btn btn-sm btn-outline-primary">
                Get Support
              </a>
            </div>
          </div>
          
          <!-- Export Results -->
          <div class="text-end mt-3">
            <button class="btn btn-sm btn-outline-secondary" @click="exportResults">
              <i class="fas fa-download me-1"></i> Export Results
            </button>
          </div>
        </div>
        
        <div v-else class="text-center py-4">
          <i class="fas fa-network-wired fa-3x text-muted mb-3"></i>
          <p>Click "Run Diagnostics" to check your network connectivity.</p>
        </div>
      </div>
    </div>
    
    <!-- Firewall Guide Modal -->
    <div v-if="showFirewallGuide" class="modal fade show" style="display: block" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Firewall Configuration Guide</h5>
            <button type="button" class="btn-close" @click="showFirewallGuide = false"></button>
          </div>
          <div class="modal-body">
            <div class="mb-4">
              <h6>Required Domains and Ports</h6>
              <div class="table-responsive">
                <table class="table table-striped table-sm">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Domain</th>
                      <th>Port</th>
                      <th>Protocol</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Ethereum RPC</td>
                      <td><code>*.infura.io</code></td>
                      <td>443</td>
                      <td>HTTPS</td>
                    </tr>
                    <tr>
                      <td>IPFS Gateway</td>
                      <td><code>ipfs.io</code></td>
                      <td>443</td>
                      <td>HTTPS</td>
                    </tr>
                    <tr>
                      <td>IPFS Gateway</td>
                      <td><code>cloudflare-ipfs.com</code></td>
                      <td>443</td>
                      <td>HTTPS</td>
                    </tr>
                    <tr>
                      <td>IPFS API</td>
                      <td><code>ipfs.infura.io</code></td>
                      <td>5001</td>
                      <td>HTTPS</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <div class="mb-4">
              <h6>Windows Firewall Configuration</h6>
              <ol>
                <li>Press <kbd>Win + X</kbd> and select "Windows Defender Firewall with Advanced Security"</li>
                <li>Select "Outbound Rules" and click "New Rule..."</li>
                <li>Select "Port" and click "Next"</li>
                <li>Choose "TCP" and enter ports "443,5001" in the field</li>
                <li>Select "Allow the connection" and click "Next"</li>
                <li>Check all profiles (Domain, Private, Public) and click "Next"</li>
                <li>Name the rule "CryptoStream Web3 Access" and click "Finish"</li>
              </ol>
            </div>
            
            <div>
              <h6>Corporate Networks</h6>
              <p>If you're on a corporate network, contact your IT department and request access to:</p>
              <pre class="bg-light p-2 rounded">*.infura.io:443
ipfs.io:443
cloudflare-ipfs.com:443
ipfs.infura.io:5001</pre>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showFirewallGuide = false">Close</button>
            <a href="NETWORK_CONFIG.md" download class="btn btn-primary">
              <i class="fas fa-download me-1"></i> Download Full Guide
            </a>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { networkService } from '@/services/networkService'

// State
const isRunning = ref(false)
const diagnosticsResults = ref(null)
const connectionInfo = ref({
  httpVersion: 'Unknown',
  networkType: 'Unknown',
  connection: 'Unknown',
  proxyEnabled: false
})
const showFirewallGuide = ref(false)

// Computed properties
const hasFailed = computed(() => {
  if (!diagnosticsResults.value) return false
  
  return !diagnosticsResults.value.ipfs || 
         !diagnosticsResults.value.ethereum || 
         !diagnosticsResults.value.api
})

const troubleshootingSteps = computed(() => {
  const steps = [
    'Check your internet connection and try again.',
    'Ensure your firewall allows connections to required Web3 services.',
  ]
  
  if (!diagnosticsResults.value?.ipfs) {
    steps.push('Try accessing IPFS content via a different network or VPN.')
  }
  
  if (!diagnosticsResults.value?.ethereum) {
    steps.push('Check if your network blocks cryptocurrency-related services.')
  }
  
  if (connectionInfo.value.httpVersion.includes('HTTP/2') && hasFailed.value) {
    steps.push('Try disabling HTTP/2 in your browser settings and reload the page.')
  }
  
  return steps
})

// Methods
async function runDiagnostics() {
  isRunning.value = true
  
  try {
    // Check network connectivity
    diagnosticsResults.value = await networkService.checkConnectivity()
    
    // Get connection info
    connectionInfo.value = {
      httpVersion: detectHttpVersion(),
      networkType: navigator.connection?.effectiveType || 'Unknown',
      connection: navigator.onLine ? 'Online' : 'Offline',
      proxyEnabled: process.env.VUE_APP_PROXY_ENABLED === 'true'
    }
  } catch (error) {
    console.error('Diagnostics failed:', error)
  } finally {
    isRunning.value = false
  }
}

function detectHttpVersion() {
  // A simple way to estimate HTTP version
  // In a real app, you'd use more sophisticated detection
  const performance = window.performance || {}
  
  if (performance.getEntriesByType) {
    const entries = performance.getEntriesByType('resource')
    
    // Check for HTTP/2 specific attributes in resource timing
    const hasHttp2Features = entries.some(entry => {
      // @ts-ignore - nextHopProtocol exists but TypeScript may not know it
      return entry.nextHopProtocol === 'h2'
    })
    
    return hasHttp2Features ? 'HTTP/2' : 'HTTP/1.1'
  }
  
  return 'Unknown'
}

function exportResults() {
  if (!diagnosticsResults.value) return
  
  const results = {
    timestamp: new Date().toISOString(),
    connectivity: diagnosticsResults.value,
    connection: connectionInfo.value,
    userAgent: navigator.userAgent,
    screen: {
      width: window.screen.width,
      height: window.screen.height
    }
  }
  
  const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = `cryptostream-network-diagnostics-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 0)
}
</script>

<style scoped>
.network-diagnostics {
  max-width: 100%;
}

pre {
  overflow-x: auto;
}
</style>
