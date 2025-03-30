<template>
  <div class="usa-compliance-notice" :class="{ expanded: isExpanded }">
    <div class="notice-header" @click="toggleExpanded">
      <div class="notice-icon">🇺🇸</div>
      <div class="notice-title">USA Compliance Information</div>
      <div class="expand-icon">{{ isExpanded ? '▼' : '►' }}</div>
    </div>
    
    <div v-if="isExpanded" class="notice-content">
      <div class="disclosures">
        <h4>Required Disclosures</h4>
        <ul>
          <li v-for="(disclosure, index) in disclosures" :key="index">
            {{ disclosure }}
          </li>
        </ul>
      </div>
      
      <div class="tax-information">
        <h4>Tax Information</h4>
        <div class="tax-info-content">
          <p>
            Creators earning more than $600 USD per year on this platform will receive 
            a 1099-K form for tax reporting purposes, in compliance with IRS regulations.
          </p>
          <p>
            US Users should be aware that cryptocurrency transactions may be subject to capital 
            gains tax. Please consult with a tax professional for guidance.
          </p>
        </div>
        
        <div v-if="isCreator" class="creator-tax-section">
          <h5>Creator Tax Documentation</h5>
          <p>
            As a creator, you are required to submit a W-9 form to receive payments 
            if you are a US person or entity.
          </p>
          <button 
            class="tax-form-button" 
            @click="openTaxFormSubmission"
          >
            Submit W-9 Form
          </button>
        </div>
      </div>
      
      <div class="kyc-status">
        <h4>Identity Verification Status</h4>
        <div v-if="kycStatus === 'verified'" class="status verified">
          <span class="status-icon">✓</span>
          <span>Verified</span>
        </div>
        <div v-else-if="kycStatus === 'pending'" class="status pending">
          <span class="status-icon">⌛</span>
          <span>Verification Pending</span>
        </div>
        <div v-else class="status not-verified">
          <span class="status-icon">!</span>
          <span>Not Verified</span>
          <button 
            class="verify-button" 
            @click="startVerification"
          >
            Complete Verification
          </button>
          <p class="verification-note">
            Note: Verification is required for transactions over $3,000 USD.
          </p>
        </div>
      </div>
      
      <div class="available-services">
        <h4>Available Services</h4>
        <div class="service-grid">
          <div 
            v-for="(service, index) in availableServices" 
            :key="index"
            class="service-item"
          >
            <div class="service-icon" v-html="service.icon"></div>
            <div class="service-name">{{ service.name }}</div>
          </div>
        </div>
      </div>
      
      <div class="regulatory-links">
        <h4>Regulatory Resources</h4>
        <ul>
          <li><a href="https://www.sec.gov/crypto-assets" target="_blank">SEC: Digital Assets</a></li>
          <li><a href="https://www.irs.gov/businesses/small-businesses-self-employed/virtual-currencies" target="_blank">IRS: Virtual Currency Guidance</a></li>
          <li><a href="https://www.fincen.gov/" target="_blank">FinCEN Regulations</a></li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { regionalComplianceService } from '../../services/RegionalComplianceService';

export default defineComponent({
  name: 'USAComplianceNotice',
  
  props: {
    userId: {
      type: String,
      default: ''
    },
    isCreator: {
      type: Boolean,
      default: false
    }
  },
  
  setup(props, { emit }) {
    const isExpanded = ref(false);
    const kycStatus = ref('not-verified'); // 'verified', 'pending', 'not-verified'
    const disclosures = ref<string[]>([]);
    
    const availableServices = computed(() => [
      { name: 'Bitcoin Payments', icon: '₿', available: true },
      { name: 'Ethereum Payments', icon: 'Ξ', available: true },
      { name: 'ACH Transfers', icon: '🏦', available: true },
      { name: 'Wire Transfers', icon: '💸', available: true },
      { name: 'NFT Marketplace', icon: '🖼️', available: true },
      { name: 'Creator Payouts', icon: '💰', available: true }
    ]);
    
    const toggleExpanded = () => {
      isExpanded.value = !isExpanded.value;
    };
    
    const openTaxFormSubmission = () => {
      emit('open-tax-form');
    };
    
    const startVerification = () => {
      emit('start-verification');
    };
    
    onMounted(() => {
      // Load USA-specific disclosures
      disclosures.value = regionalComplianceService.getRequiredDisclosures('USA');
      
      // In a real application, we would load the user's actual KYC status
      kycStatus.value = 'not-verified';
    });
    
    return {
      isExpanded,
      toggleExpanded,
      kycStatus,
      disclosures,
      availableServices,
      openTaxFormSubmission,
      startVerification
    };
  }
});
</script>

<style scoped>
.usa-compliance-notice {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  overflow: hidden;
}

.notice-header {
  display: flex;
  align-items: center;
  padding: 1rem;
  cursor: pointer;
  background: #e9ecef;
  transition: background 0.2s;
}

.notice-header:hover {
  background: #dee2e6;
}

.notice-icon {
  font-size: 1.25rem;
  margin-right: 0.75rem;
}

.notice-title {
  flex: 1;
  font-weight: 600;
  color: #343a40;
  font-size: 1rem;
}

.expand-icon {
  color: #6c757d;
}

.notice-content {
  padding: 1.5rem;
}

.disclosures {
  margin-bottom: 1.5rem;
}

.disclosures h4, 
.tax-information h4,
.kyc-status h4,
.available-services h4,
.regulatory-links h4 {
  color: #495057;
  margin-top: 0;
  margin-bottom: 0.75rem;
  font-size: 1.1rem;
}

.disclosures ul {
  margin: 0;
  padding-left: 1.5rem;
}

.disclosures li {
  margin-bottom: 0.5rem;
  color: #495057;
  font-size: 0.9rem;
}

.tax-information {
  margin-bottom: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #dee2e6;
}

.tax-info-content p {
  margin-bottom: 0.75rem;
  color: #495057;
  font-size: 0.9rem;
}

.creator-tax-section {
  background: #fff3e0;
  padding: 1rem;
  border-radius: 6px;
  margin-top: 1rem;
}

.creator-tax-section h5 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: #e65100;
  font-size: 0.95rem;
}

.tax-form-button {
  background: #f57c00;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
}

.tax-form-button:hover {
  background: #ef6c00;
}

.kyc-status {
  margin-bottom: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #dee2e6;
}

.status {
  display: flex;
  align-items: center;
  font-size: 0.95rem;
  padding: 0.75rem;
  border-radius: 6px;
}

.status-icon {
  margin-right: 0.5rem;
  font-size: 1.1rem;
}

.status.verified {
  background: #e8f5e9;
  color: #2e7d32;
}

.status.pending {
  background: #fff8e1;
  color: #f57f17;
}

.status.not-verified {
  background: #fbe9e7;
  color: #c62828;
  flex-direction: column;
  align-items: flex-start;
}

.status.not-verified .status-icon {
  margin-bottom: 0.5rem;
  font-size: 1.25rem;
}

.verify-button {
  background: #d32f2f;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  margin-top: 0.75rem;
  cursor: pointer;
  transition: background 0.2s;
}

.verify-button:hover {
  background: #c62828;
}

.verification-note {
  margin-top: 0.75rem;
  font-size: 0.8rem;
  font-style: italic;
  margin-bottom: 0;
}

.available-services {
  margin-bottom: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #dee2e6;
}

.service-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 1rem;
}

.service-item {
  background: white;
  padding: 1rem;
  border-radius: 6px;
  text-align: center;
  border: 1px solid #e9ecef;
}

.service-icon {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.service-name {
  font-size: 0.85rem;
}

.regulatory-links {
  padding-top: 1.5rem;
  border-top: 1px solid #dee2e6;
}

.regulatory-links ul {
  margin: 0;
  padding-left: 1.5rem;
}

.regulatory-links li {
  margin-bottom: 0.5rem;
}

.regulatory-links a {
  color: #0066cc;
  text-decoration: none;
  font-size: 0.9rem;
}

.regulatory-links a:hover {
  text-decoration: underline;
}
</style>
