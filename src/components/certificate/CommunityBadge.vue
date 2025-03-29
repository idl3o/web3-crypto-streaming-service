<template>
  <div class="community-badge" :class="[badgeSize, theme]" @click="showDetails">
    <div class="badge-wrapper" :style="badgeStyle">
      <div class="badge-icon">
        <i :class="certificateIcon"></i>
      </div>
      <div v-if="showTierIndicator" class="tier-indicator" :style="{ backgroundColor: tierData.color }">
        {{ tierData.icon }}
      </div>
    </div>
    <div v-if="showLabel" class="badge-label">{{ displayData.name }}</div>
    
    <!-- Certificate Details Modal -->
    <div v-if="detailsVisible" class="badge-details-backdrop" @click="closeDetails">
      <div class="badge-details" @click.stop>
        <div class="details-header" :style="{ backgroundColor: displayData.color }">
          <h3 class="details-title">
            <i :class="certificateIcon"></i>
            {{ displayData.name }}
          </h3>
          <div class="tier-badge" :style="{ backgroundColor: tierData.color }">
            {{ tierData.name }}
          </div>
          <button class="close-button" @click="closeDetails">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="details-body">
          <div class="details-section">
            <h4>About This Certificate</h4>
            <p>{{ displayData.description }}</p>
          </div>
          
          <div class="details-section">
            <h4>Certificate Details</h4>
            <div class="details-row">
              <span class="details-label">Recipient</span>
              <span class="details-value">{{ shortAddress }}</span>
            </div>
            <div class="details-row">
              <span class="details-label">Issued</span>
              <span class="details-value">{{ formattedIssuedAt }}</span>
            </div>
            <div v-if="certificate.expiresAt" class="details-row">
              <span class="details-label">Expires</span>
              <span class="details-value">{{ formattedExpiresAt }}</span>
            </div>
            <div class="details-row">
              <span class="details-label">Status</span>
              <span class="details-value status-indicator" :class="certificate.status">
                {{ formatStatus(certificate.status) }}
              </span>
            </div>
            <div class="details-row">
              <span class="details-label">Certificate ID</span>
              <span class="details-value certificate-id">{{ certificate.id }}</span>
            </div>
          </div>
          
          <div v-if="certificate.metadata && Object.keys(certificate.metadata).length > 0" class="details-section">
            <h4>Additional Information</h4>
            <div v-for="(value, key) in certificate.metadata" :key="key" class="details-row">
              <span class="details-label">{{ formatKey(key) }}</span>
              <span class="details-value">{{ formatValue(value) }}</span>
            </div>
          </div>
        </div>
        
        <div class="details-footer">
          <button class="verify-button" @click="verifyCertificateSignature">
            <i class="fas fa-shield-alt"></i> Verify Certificate
          </button>
          <a :href="`/certificate/verify/${certificate.id}`" target="_blank" class="verify-link">
            Public Verification Page
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue';
import * as CertificateService from '@/services/CertificateService';

const props = defineProps({
  certificate: {
    type: Object,
    required: true
  },
  size: {
    type: String,
    default: 'medium', // small, medium, large
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  },
  showLabel: {
    type: Boolean,
    default: false
  },
  showTier: {
    type: Boolean,
    default: true
  },
  interactive: {
    type: Boolean,
    default: true
  }
});

const theme = inject('currentTheme', 'roman-theme');
const detailsVisible = ref(false);

// Computed properties
const displayData = computed(() => {
  return CertificateService.getCertificateDisplayData(props.certificate.type);
});

const tierData = computed(() => {
  return CertificateService.getTierDisplayData(props.certificate.tier);
});

const badgeSize = computed(() => `badge-${props.size}`);

const badgeStyle = computed(() => ({
  backgroundColor: displayData.value.color,
  cursor: props.interactive ? 'pointer' : 'default'
}));

const certificateIcon = computed(() => displayData.value.icon);

const showTierIndicator = computed(() => props.showTier && props.certificate.tier);

const shortAddress = computed(() => {
  const address = props.certificate.recipient;
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
});

const formattedIssuedAt = computed(() => {
  if (!props.certificate.issuedAt) return 'Unknown';
  return new Date(props.certificate.issuedAt).toLocaleDateString();
});

const formattedExpiresAt = computed(() => {
  if (!props.certificate.expiresAt) return 'Never';
  return new Date(props.certificate.expiresAt).toLocaleDateString();
});

// Methods
function showDetails() {
  if (props.interactive) {
    detailsVisible.value = true;
  }
}

function closeDetails() {
  detailsVisible.value = false;
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

function formatKey(key) {
  // Convert camelCase to Title Case with spaces
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

async function verifyCertificateSignature() {
  try {
    const result = await CertificateService.verifyCertificate(props.certificate.id);
    if (result.success) {
      alert('Certificate verified successfully! ✅');
    } else {
      alert(`Certificate verification failed: ${result.message} ❌`);
    }
  } catch (error) {
    alert(`Error verifying certificate: ${error.message}`);
  }
}
</script>

<style scoped>
.community-badge {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.badge-wrapper {
  position: relative;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: transform 0.2s, box-shadow 0.2s;
}

.badge-wrapper:hover {
  transform: scale(1.05);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16);
}

.badge-small .badge-wrapper {
  width: 24px;
  height: 24px;
  font-size: 12px;
}

.badge-medium .badge-wrapper {
  width: 36px;
  height: 36px;
  font-size: 16px;
}

.badge-large .badge-wrapper {
  width: 48px;
  height: 48px;
  font-size: 20px;
}

.tier-indicator {
  position: absolute;
  bottom: -2px;
  right: -2px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  border: 1px solid white;
  font-size: 60%;
}

.badge-small .tier-indicator {
  width: 12px;
  height: 12px;
  font-size: 8px;
}

.badge-medium .tier-indicator {
  width: 16px;
  height: 16px;
  font-size: 9px;
}

.badge-large .tier-indicator {
  width: 20px;
  height: 20px;
  font-size: 10px;
}

.badge-label {
  font-size: 11px;
  text-align: center;
  max-width: 80px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge-small .badge-label {
  font-size: 9px;
  max-width: 60px;
}

.badge-large .badge-label {
  font-size: 12px;
  max-width: 100px;
}

/* Certificate Details Modal */
.badge-details-backdrop {
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

.badge-details {
  background-color: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.details-header {
  display: flex;
  align-items: center;
  padding: 16px;
  color: white;
  position: relative;
}

.details-title {
  margin: 0;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tier-badge {
  margin-left: auto;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 600;
}

.close-button {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  opacity: 0.8;
}

.close-button:hover {
  opacity: 1;
}

.details-body {
  padding: 16px;
}

.details-section {
  margin-bottom: 24px;
}

.details-section h4 {
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 1rem;
  color: #333;
}

.details-row {
  display: flex;
  margin-bottom: 8px;
}

.details-label {
  flex: 0 0 120px;
  font-weight: 500;
  color: #666;
}

.details-value {
  flex: 1;
}

.status-indicator {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.875rem;
}

.status-indicator.active {
  background-color: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
}

.status-indicator.revoked {
  background-color: rgba(244, 67, 54, 0.1);
  color: #F44336;
}

.status-indicator.expired {
  background-color: rgba(158, 158, 158, 0.1);
  color: #9E9E9E;
}

.status-indicator.pending {
  background-color: rgba(255, 152, 0, 0.1);
  color: #FF9800;
}

.certificate-id {
  font-family: monospace;
  font-size: 0.875rem;
  word-break: break-all;
}

.details-footer {
  padding: 16px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.verify-button {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.verify-button:hover {
  background-color: #3d9140;
}

.verify-link {
  color: #2196F3;
  text-decoration: none;
  font-size: 0.875rem;
}

.verify-link:hover {
  text-decoration: underline;
}

/* Roman theme */
.roman-theme .verify-button {
  background-color: var(--primary-color, #8B4513);
}

.roman-theme .verify-button:hover {
  background-color: var(--primary-dark-color, #704012);
}

.roman-theme .verify-link {
  color: var(--secondary-color, #CD853F);
}
</style>
