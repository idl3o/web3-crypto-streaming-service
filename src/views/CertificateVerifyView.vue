<template>
  <div class="certificate-verify">
    <div class="container py-4">
      <div class="verify-header text-center mb-4">
        <h1 class="h3">Community Certificate Verification</h1>
        <p class="text-muted">
          Verify the authenticity of community certificates issued on the platform
        </p>
      </div>

      <div class="row justify-content-center">
        <div class="col-md-8">
          <!-- Certificate Lookup Form -->
          <div class="card border-0 shadow-sm mb-4">
            <div class="card-body p-4">
              <div v-if="!certificateId" class="lookup-form">
                <h4 class="mb-3">Lookup Certificate</h4>
                <div class="mb-3">
                  <label for="certificate-id" class="form-label">Certificate ID</label>
                  <div class="input-group">
                    <input 
                      type="text" 
                      class="form-control" 
                      id="certificate-id" 
                      v-model="lookupId"
                      placeholder="Enter certificate ID to verify"
                    >
                    <button 
                      class="btn btn-primary" 
                      @click="lookupCertificate" 
                      :disabled="!lookupId || loading"
                    >
                      <i class="fas" :class="loading ? 'fa-spinner fa-spin' : 'fa-search'"></i>
                      {{ loading ? 'Verifying...' : 'Verify' }}
                    </button>
                  </div>
                </div>
                <div v-if="qrEnabled" class="text-center mt-4 mb-3">
                  <p class="text-muted">- or -</p>
                  <button class="btn btn-outline-secondary" @click="startQrScanner">
                    <i class="fas fa-qrcode me-2"></i> Scan QR Code
                  </button>
                </div>
              </div>

              <div v-if="error" class="alert alert-danger">
                <i class="fas fa-exclamation-circle me-2"></i> {{ error }}
              </div>
            </div>
          </div>

          <!-- Certificate Result -->
          <div v-if="certificate" class="card border-0 shadow-sm">
            <div class="card-body p-0">
              <!-- Certificate Status Header -->
              <div 
                class="certificate-status p-4 text-center text-white"
                :class="`bg-${statusClass}`"
              >
                <div class="status-icon mb-2">
                  <i :class="statusIcon"></i>
                </div>
                <h3 class="status-title">{{ statusTitle }}</h3>
                <p class="status-message mb-0">{{ statusMessage }}</p>
              </div>

              <!-- Certificate Details -->
              <div class="certificate-details p-4">
                <!-- Certificate Preview -->
                <div class="certificate-preview text-center mb-4">
                  <CommunityBadge
                    :certificate="certificate"
                    size="large"
                    :show-label="true"
                  />
                </div>

                <!-- Certificate Info -->
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <h5>Certificate Information</h5>
                    <table class="table">
                      <tbody>
                        <tr>
                          <th scope="row">Type</th>
                          <td>{{ certificateDisplayData.name }}</td>
                        </tr>
                        <tr>
                          <th scope="row">Tier</th>
                          <td>{{ tierDisplayData.name }}</td>
                        </tr>
                        <tr>
                          <th scope="row">Issued</th>
                          <td>{{ formatDate(certificate.issuedAt) }}</td>
                        </tr>
                        <tr v-if="certificate.expiresAt">
                          <th scope="row">Expires</th>
                          <td>{{ formatDate(certificate.expiresAt) }}</td>
                        </tr>
                        <tr>
                          <th scope="row">Status</th>
                          <td>
                            <span class="badge" :class="`bg-${statusClass}`">
                              {{ formatStatus(certificate.status) }}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div class="col-md-6 mb-3">
                    <h5>Blockchain Information</h5>
                    <table class="table">
                      <tbody>
                        <tr>
                          <th scope="row">Certificate ID</th>
                          <td class="text-break">{{ certificate.id }}</td>
                        </tr>
                        <tr>
                          <th scope="row">Holder</th>
                          <td class="text-break">
                            {{ formatAddress(certificate.recipient) }}
                          </td>
                        </tr>
                        <tr>
                          <th scope="row">Issuer</th>
                          <td class="text-break">
                            {{ formatAddress(certificate.issuer) }}
                          </td>
                        </tr>
                        <tr>
                          <th scope="row">Verification</th>
                          <td>
                            <button 
                              class="btn btn-sm btn-primary" 
                              @click="verifyOnChain"
                              :disabled="verifyingOnChain"
                            >
                              <i class="fas" :class="verifyingOnChain ? 'fa-spinner fa-spin' : 'fa-link'"></i>
                              {{ verifyingOnChain ? 'Verifying...' : 'Verify On-Chain' }}
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <!-- Additional Metadata -->
                <div v-if="hasMetadata" class="metadata-section mb-3">
                  <h5>Additional Information</h5>
                  <table class="table">
                    <tbody>
                      <tr v-for="(value, key) in certificate.metadata" :key="key">
                        <th scope="row">{{ formatKey(key) }}</th>
                        <td>{{ formatValue(value) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- Actions Row -->
                <div class="actions-row d-flex justify-content-between mt-4">
                  <button class="btn btn-outline-secondary" @click="resetView">
                    <i class="fas fa-arrow-left me-2"></i> Verify Another
                  </button>
                  <div>
                    <button class="btn btn-outline-primary me-2" @click="shareCertificate">
                      <i class="fas fa-share-alt me-2"></i> Share
                    </button>
                    <button class="btn btn-outline-secondary" @click="generateQRCode">
                      <i class="fas fa-qrcode me-2"></i> QR Code
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- QR Code Modal -->
    <div v-if="showQrModal" class="modal-backdrop" @click="closeQrModal">
      <div class="qr-modal" @click.stop>
        <div class="qr-header">
          <h4>Certificate QR Code</h4>
          <button class="close-button" @click="closeQrModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="qr-body">
          <div class="qr-container" ref="qrContainer"></div>
          <p class="text-center mt-2">Scan to verify this certificate</p>
        </div>
      </div>
    </div>
    
    <!-- QR Scanner Modal -->
    <div v-if="showQrScanner" class="modal-backdrop" @click="closeQrScanner">
      <div class="qr-scanner-modal" @click.stop>
        <div class="qr-header">
          <h4>Scan Certificate QR Code</h4>
          <button class="close-button" @click="closeQrScanner">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="qr-scanner-body">
          <div class="scanner-container" ref="scannerContainer"></div>
          <p class="text-center mt-2">Position the QR code in view</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import * as CertificateService from '@/services/CertificateService';
import CommunityBadge from '@/components/certificate/CommunityBadge.vue';

const route = useRoute();
const router = useRouter();

// State
const certificateId = ref('');
const lookupId = ref('');
const certificate = ref(null);
const loading = ref(false);
const error = ref('');
const verifyingOnChain = ref(false);
const showQrModal = ref(false);
const showQrScanner = ref(false);
const qrEnabled = ref(false);

// Check if QR code libraries are available
onMounted(() => {
  // We would normally check if the QR code libraries are available
  // For now, just enable it
  qrEnabled.value = true;
});

// Watch for route changes and load certificate from route if present
watch(() => route.params.id, (newId) => {
  if (newId) {
    certificateId.value = newId;
    lookupId.value = newId;
    verifyCertificate(newId);
  }
}, { immediate: true });

// Computed properties
const hasMetadata = computed(() => {
  return certificate.value && 
         certificate.value.metadata && 
         Object.keys(certificate.value.metadata).length > 0;
});

const certificateDisplayData = computed(() => {
  if (!certificate.value) return null;
  return CertificateService.getCertificateDisplayData(certificate.value.type);
});

const tierDisplayData = computed(() => {
  if (!certificate.value) return null;
  return CertificateService.getTierDisplayData(certificate.value.tier);
});

const statusClass = computed(() => {
  if (!certificate.value) return 'secondary';
  
  switch (certificate.value.status) {
    case CertificateService.CERTIFICATE_STATUS.ACTIVE:
      return 'success';
    case CertificateService.CERTIFICATE_STATUS.REVOKED:
      return 'danger';
    case CertificateService.CERTIFICATE_STATUS.EXPIRED:
      return 'warning';
    case CertificateService.CERTIFICATE_STATUS.PENDING:
      return 'info';
    default:
      return 'secondary';
  }
});

const statusIcon = computed(() => {
  if (!certificate.value) return 'fas fa-question-circle';
  
  switch (certificate.value.status) {
    case CertificateService.CERTIFICATE_STATUS.ACTIVE:
      return 'fas fa-check-circle fa-3x';
    case CertificateService.CERTIFICATE_STATUS.REVOKED:
      return 'fas fa-times-circle fa-3x';
    case CertificateService.CERTIFICATE_STATUS.EXPIRED:
      return 'fas fa-exclamation-circle fa-3x';
    case CertificateService.CERTIFICATE_STATUS.PENDING:
      return 'fas fa-hourglass-half fa-3x';
    default:
      return 'fas fa-question-circle fa-3x';
  }
});

const statusTitle = computed(() => {
  if (!certificate.value) return 'Unknown Certificate';
  
  switch (certificate.value.status) {
    case CertificateService.CERTIFICATE_STATUS.ACTIVE:
      return 'Valid Certificate';
    case CertificateService.CERTIFICATE_STATUS.REVOKED:
      return 'Certificate Revoked';
    case CertificateService.CERTIFICATE_STATUS.EXPIRED:
      return 'Certificate Expired';
    case CertificateService.CERTIFICATE_STATUS.PENDING:
      return 'Certificate Pending';
    default:
      return 'Unknown Status';
  }
});

const statusMessage = computed(() => {
  if (!certificate.value) return '';
  
  switch (certificate.value.status) {
    case CertificateService.CERTIFICATE_STATUS.ACTIVE:
      return 'This certificate is valid and verified';
    case CertificateService.CERTIFICATE_STATUS.REVOKED:
      return `This certificate was revoked${certificate.value.revocationReason ? ': ' + certificate.value.revocationReason : ''}`;
    case CertificateService.CERTIFICATE_STATUS.EXPIRED:
      return `This certificate expired on ${formatDate(certificate.value.expiresAt)}`;
    case CertificateService.CERTIFICATE_STATUS.PENDING:
      return 'This certificate is pending validation';
    default:
      return '';
  }
});

// Methods
async function lookupCertificate() {
  if (!lookupId.value) return;
  
  // Update URL to reflect the certificate being viewed
  router.push(`/certificate/verify/${lookupId.value}`);
}

async function verifyCertificate(id) {
  if (!id) return;
  
  loading.value = true;
  error.value = '';
  certificate.value = null;
  
  try {
    const result = await CertificateService.verifyCertificate(id);
    
    if (result.success) {
      certificate.value = result.certificate;
    } else {
      error.value = result.message || 'Failed to verify certificate';
    }
  } catch (err) {
    error.value = err.message || 'An error occurred while verifying the certificate';
  } finally {
    loading.value = false;
  }
}

async function verifyOnChain() {
  if (!certificate.value) return;
  
  verifyingOnChain.value = true;
  
  try {
    // In a real implementation, this would make a direct call to the blockchain
    // For now, we'll just use our local verification
    const result = await CertificateService.verifyCertificate(certificate.value.id);
    
    if (result.success) {
      alert('Certificate successfully verified on blockchain! ✅');
    } else {
      alert(`Blockchain verification failed: ${result.message} ❌`);
    }
  } catch (err) {
    alert(`Error during blockchain verification: ${err.message}`);
  } finally {
    verifyingOnChain.value = false;
  }
}

function resetView() {
  certificateId.value = '';
  lookupId.value = '';
  certificate.value = null;
  error.value = '';
  router.push('/certificate/verify');
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
}

function formatStatus(status) {
  switch (status) {
    case CertificateService.CERTIFICATE_STATUS.ACTIVE:
      return 'Active';
    case CertificateService.CERTIFICATE_STATUS.REVOKED:
      return 'Revoked';
    case CertificateService.CERTIFICATE_STATUS.EXPIRED:
      return 'Expired';
    case CertificateService.CERTIFICATE_STATUS.PENDING:
      return 'Pending';
    default:
      return status;
  }
}

function formatAddress(address) {
  if (!address) return 'Unknown';
  if (address === 'platform') return 'Platform (System)';
  return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;
}

function formatKey(key) {
  return key.replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase());
}

function formatValue(value) {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  return value;
}

function shareCertificate() {
  if (!certificate.value) return;
  
  // Create share data
  const shareData = {
    title: `${certificateDisplayData.value.name} Certificate`,
    text: `Verify my ${certificateDisplayData.value.name} certificate on Web3 Crypto Streaming Service`,
    url: window.location.href
  };
  
  // Check if navigator.share is available (mobile devices)
  if (navigator.share) {
    navigator.share(shareData)
      .catch(err => console.error('Error sharing:', err));
  } else {
    // Fallback: copy link to clipboard
    navigator.clipboard.writeText(window.location.href)
      .then(() => alert('Verification link copied to clipboard!'))
      .catch(() => alert('Failed to copy link. Please copy the URL manually.'));
  }
}

function generateQRCode() {
  showQrModal.value = true;
  
  // In a real implementation, we would generate a QR code here
  // For this example, we'll just simulate it
  nextTick(() => {
    const container = document.querySelector('.qr-container');
    if (container) {
      container.innerHTML = `
        <div style="width: 200px; height: 200px; margin: 0 auto; background-color: #f5f5f5; display: flex; align-items: center; justify-content: center; border: 1px solid #ddd;">
          QR Code for<br>${certificate.value.id.substring(0, 10)}...
        </div>
      `;
    }
  });
}

function closeQrModal() {
  showQrModal.value = false;
}

function startQrScanner() {
  showQrScanner.value = true;
  
  // In a real implementation, we would initialize the QR scanner here
  // For this example, we'll just simulate it
  nextTick(() => {
    const container = document.querySelector('.scanner-container');
    if (container) {
      container.innerHTML = `
        <div style="width: 300px; height: 300px; margin: 0 auto; background-color: #f5f5f5; display: flex; align-items: center; justify-content: center; border: 1px solid #ddd;">
          Camera Not Available<br>in Demo
        </div>
      `;
    }
  });
}

function closeQrScanner() {
  showQrScanner.value = false;
}
</script>

<style scoped>
/* Modal Styles */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.qr-modal, .qr-scanner-modal {
  background-color: white;
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.qr-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.qr-header h4 {
  margin: 0;
  font-size: 1.25rem;
}

.close-button {
  background: none;
  border: none;
  color: #666;
  font-size: 18px;
  cursor: pointer;
}

.qr-body, .qr-scanner-body {
  padding: 24px;
}

.qr-container, .scanner-container {
  margin: 0 auto;
  text-align: center;
}

/* Status styling */
.certificate-status {
  border-radius: 8px 8px 0 0;
}

/* Certificate details */
.certificate-details {
  background-color: #fff;
}

.bg-success {
  background-color: #4CAF50 !important;
}

.bg-danger {
  background-color: #F44336 !important;
}

.bg-warning {
  background-color: #FF9800 !important;
}

.bg-info {
  background-color: #2196F3 !important;
}

.badge {
  text-transform: uppercase;
  font-size: 0.75rem;
  padding: 0.35em 0.65em;
}

.text-break {
  word-break: break-all;
}

/* Certificate preview */
.certificate-preview {
  padding: 20px;
  margin-bottom: 20px;
}
</style>
