<template>
  <div class="tm-codeman-verifier" :class="theme">
    <div class="verifier-header">
      <div class="verifier-title">
        <i class="fas fa-fingerprint"></i>
        <h3>TM Codeman MBS {{ protocolIdentifier }}</h3>
      </div>
      
      <div v-if="mode === 'minimal'" class="header-actions">
        <button class="expand-btn" @click="toggleExpand">
          <i class="fas fa-expand-alt"></i>
        </button>
      </div>
    </div>
    
    <div class="verifier-content" :class="{ 'minimal': mode === 'minimal' }">
      <!-- Code input form -->
      <div class="code-input-section" v-if="showInput">
        <div class="code-input-wrapper">
          <input
            type="text"
            v-model="codeInput"
            placeholder="Enter verification code"
            :disabled="verifying"
            @input="validateInputFormat"
            ref="codeInputField"
          />
          <div class="input-actions">
            <button class="clear-btn" v-if="codeInput && !verifying" @click="clearInput">
              <i class="fas fa-times"></i>
            </button>
            <button class="scan-btn" v-if="!verifying" @click="scanCode">
              <i class="fas fa-qrcode"></i>
            </button>
          </div>
        </div>
        
        <button class="verify-btn" @click="verifyCodeInput" :disabled="!isValidFormat || verifying">
          <i class="fas" :class="verifying ? 'fa-spinner fa-spin' : 'fa-search'"></i>
          {{ verifying ? 'Verifying...' : 'Verify Code' }}
        </button>
        
        <div class="format-hint" v-if="codeInput && !isValidFormat">
          <i class="fas fa-exclamation-circle"></i>
          Invalid code format. Expected: XXXXXXXX-{{ protocolIdentifier }}-XXXXXXXX
        </div>
      </div>
      
      <!-- Verification result section -->
      <div class="verification-result" v-if="verificationResult">
        <div class="result-status" :class="verificationResult.status">
          <div class="status-icon">
            <i class="fas" :class="`fa-${getStatusInfo(verificationResult.status).icon}`"></i>
          </div>
          <div class="status-details">
            <h4>{{ getStatusInfo(verificationResult.status).name }}</h4>
            <p>{{ verificationResult.message }}</p>
          </div>
        </div>
        
        <div class="verified-details" v-if="verificationResult.valid">
          <div class="detail-row">
            <span class="label">Code:</span>
            <span class="value code">{{ verificationResult.data.code }}</span>
          </div>
          
          <div class="detail-row">
            <span class="label">Security Level:</span>
            <div class="security-level" :style="{ backgroundColor: getSecurityLevelInfo(verificationResult.data.securityLevel).color }">
              <i class="fas" :class="`fa-${getSecurityLevelInfo(verificationResult.data.securityLevel).icon}`"></i>
              {{ getSecurityLevelInfo(verificationResult.data.securityLevel).name }}
            </div>
          </div>
          
          <div class="detail-row">
            <span class="label">Content ID:</span>
            <span class="value">{{ verificationResult.data.contentId }}</span>
          </div>
          
          <div class="detail-row">
            <span class="label">User ID:</span>
            <span class="value">{{ verificationResult.data.userId }}</span>
          </div>
          
          <div class="detail-row">
            <span class="label">Payment:</span>
            <span class="value">{{ verificationResult.data.paymentAmount }} ETH</span>
          </div>
          
          <div class="detail-row">
            <span class="label">Expires:</span>
            <span class="value">{{ formatExpiryTime(verificationResult.data.expiryTime) }}</span>
          </div>
          
          <div class="actions-row" v-if="!hideActions">
            <button class="action-btn apply-btn" @click="applyCode" :disabled="applying">
              <i class="fas" :class="applying ? 'fa-spinner fa-spin' : 'fa-check-double'"></i>
              {{ applying ? 'Applying...' : 'Apply Code' }}
            </button>
            
            <button class="action-btn new-search-btn" @click="resetVerification">
              <i class="fas fa-search"></i>
              New Verification
            </button>
          </div>
        </div>
        
        <div class="failed-actions" v-else>
          <button class="action-btn retry-btn" @click="verifyCodeInput" :disabled="verifying">
            <i class="fas fa-redo"></i>
            Retry Verification
          </button>
          
          <button class="action-btn new-search-btn" @click="resetVerification">
            <i class="fas fa-search"></i>
            New Verification
          </button>
        </div>
      </div>
      
      <!-- Code Generator section -->
      <div class="code-generator" v-if="showGenerator && !verificationResult">
        <div class="section-divider" v-if="showInput">
          <span>OR</span>
        </div>
        
        <h4>Generate New Verification Code</h4>
        
        <form @submit.prevent="generateNewCode">
          <div class="form-row">
            <div class="form-group">
              <label>Content ID</label>
              <input type="text" v-model="newCodeData.contentId" placeholder="Enter content ID" required />
            </div>
            
            <div class="form-group">
              <label>User ID</label>
              <input type="text" v-model="newCodeData.userId" placeholder="Enter user ID" required />
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Payment Amount</label>
              <input type="number" v-model="newCodeData.paymentAmount" step="0.001" min="0" placeholder="0.000" />
            </div>
            
            <div class="form-group">
              <label>Expiry (minutes)</label>
              <input type="number" v-model="newCodeData.expiryMinutes" min="5" placeholder="60" />
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group security-select">
              <label>Security Level</label>
              <select v-model="newCodeData.securityLevel">
                <option v-for="(label, level) in securityLevels" :key="level" :value="level">
                  {{ getSecurityLevelInfo(level).name }}
                </option>
              </select>
            </div>
          </div>
          
          <button type="submit" class="generate-btn" :disabled="generating">
            <i class="fas" :class="generating ? 'fa-spinner fa-spin' : 'fa-magic'"></i>
            {{ generating ? 'Generating...' : 'Generate Code' }}
          </button>
        </form>
      </div>
      
      <!-- Generated Code section -->
      <div class="generated-code" v-if="generatedCode">
        <div class="section-header">
          <h4>Generated Code</h4>
          <button class="close-btn" @click="closeGeneratedCode">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="code-display">
          <div class="code-value">{{ generatedCode.code }}</div>
          <button class="copy-btn" @click="copyCodeToClipboard">
            <i class="fas" :class="copied ? 'fa-check' : 'fa-copy'"></i>
          </button>
        </div>
        
        <div class="code-qr">
          <div class="qr-placeholder">
            <!-- In a real app, this would be a QR code component -->
            <div class="mock-qr">
              <i class="fas fa-qrcode"></i>
            </div>
          </div>
        </div>
        
        <div class="code-details">
          <p><strong>Security Level:</strong> {{ getSecurityLevelInfo(generatedCode.securityLevel).name }}</p>
          <p><strong>Expires:</strong> {{ formatExpiryTime(generatedCode.expiryTime) }}</p>
        </div>
        
        <div class="code-actions">
          <button class="action-btn verify-generated-btn" @click="verifyGeneratedCode">
            <i class="fas fa-shield-check"></i>
            Verify This Code
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject, watch } from 'vue';
import * as TMCodemanService from '@/services/TMCodemanService';

const props = defineProps({
  mode: {
    type: String,
    default: 'full',
    validator: (value) => ['full', 'minimal', 'embedded'].includes(value)
  },
  initialCode: {
    type: String,
    default: ''
  },
  showInput: {
    type: Boolean,
    default: true
  },
  showGenerator: {
    type: Boolean,
    default: true
  },
  hideActions: {
    type: Boolean,
    default: false
  },
  transactionData: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits([
  'verification-success', 
  'verification-failed', 
  'code-applied',
  'code-generated'
]);

const theme = inject('currentTheme', 'roman-theme');

// State
const codeInput = ref(props.initialCode);
const isValidFormat = ref(false);
const verifying = ref(false);
const applying = ref(false);
const verificationResult = ref(null);
const generating = ref(false);
const generatedCode = ref(null);
const copied = ref(false);
const codeInputField = ref(null);

// New code form data
const newCodeData = ref({
  contentId: '',
  userId: '',
  paymentAmount: 0,
  expiryMinutes: 60,
  securityLevel: TMCodemanService.SECURITY_LEVELS.STANDARD
});

// Constants
const securityLevels = TMCodemanService.SECURITY_LEVELS;
const protocolIdentifier = TMCodemanService.PROTOCOL_IDENTIFIER;
const { getStatusInfo, getSecurityLevelInfo } = TMCodemanService;

// Initialize service when component mounts
onMounted(async () => {
  await TMCodemanService.initTMCodemanService();
  
  // Prefill with transaction data if available
  if (props.transactionData) {
    if (props.transactionData.contentId) {
      newCodeData.value.contentId = props.transactionData.contentId;
    }
    
    if (props.transactionData.userId) {
      newCodeData.value.userId = props.transactionData.userId;
    }
    
    if (props.transactionData.paymentAmount) {
      newCodeData.value.paymentAmount = props.transactionData.paymentAmount;
    }
  }
  
  // Check initial code
  if (props.initialCode) {
    validateInputFormat();
    if (isValidFormat.value) {
      verifyCodeInput();
    }
  }
});

// Watch for changes to initialCode prop
watch(() => props.initialCode, (newCode) => {
  if (newCode && newCode !== codeInput.value) {
    codeInput.value = newCode;
    validateInputFormat();
    if (isValidFormat.value) {
      verifyCodeInput();
    }
  }
});

// Methods
function validateInputFormat() {
  if (!codeInput.value) {
    isValidFormat.value = false;
    return;
  }
  
  // Use the service function to check format
  isValidFormat.value = TMCodemanService.isValidCodeFormat(codeInput.value);
}

async function verifyCodeInput() {
  if (!codeInput.value || verifying.value) return;
  
  try {
    verifying.value = true;
    verificationResult.value = null;
    
    const result = await TMCodemanService.verifyCode(codeInput.value);
    verificationResult.value = result;
    
    // Emit appropriate event
    if (result.valid) {
      emit('verification-success', result);
    } else {
      emit('verification-failed', result);
    }
  } catch (error) {
    console.error('Error verifying code:', error);
    verificationResult.value = {
      valid: false,
      status: TMCodemanService.VERIFICATION_STATUS.FAILED,
      message: `Verification error: ${error.message}`
    };
    emit('verification-failed', verificationResult.value);
  } finally {
    verifying.value = false;
  }
}

async function applyCode() {
  if (!verificationResult.value?.valid || applying.value) return;
  
  try {
    applying.value = true;
    
    // Use transaction data from props or create placeholder
    const transaction = props.transactionData || {
      id: `tx_${Date.now()}`,
      type: 'streaming',
      amount: verificationResult.value.data.paymentAmount,
      contentId: verificationResult.value.data.contentId,
      userId: verificationResult.value.data.userId
    };
    
    const result = await TMCodemanService.applyCodeToTransaction(
      verificationResult.value.data.code,
      transaction
    );
    
    // Emit result
    emit('code-applied', result);
    
    // Show temporary success message
    verificationResult.value = {
      ...verificationResult.value,
      message: result.success 
        ? 'Code successfully applied to transaction' 
        : `Failed to apply code: ${result.message}`
    };
  } catch (error) {
    console.error('Error applying code:', error);
    // Update message to show error
    verificationResult.value = {
      ...verificationResult.value,
      message: `Error applying code: ${error.message}`
    };
  } finally {
    applying.value = false;
  }
}

async function generateNewCode() {
  if (generating.value) return;
  
  try {
    generating.value = true;
    generatedCode.value = null;
    
    const result = await TMCodemanService.generateVerificationCode({
      contentId: newCodeData.value.contentId,
      userId: newCodeData.value.userId,
      paymentAmount: parseFloat(newCodeData.value.paymentAmount) || 0,
      expiryMinutes: parseInt(newCodeData.value.expiryMinutes) || 60,
      securityLevel: newCodeData.value.securityLevel
    });
    
    generatedCode.value = result;
    emit('code-generated', result);
  } catch (error) {
    console.error('Error generating code:', error);
    // Handle error
  } finally {
    generating.value = false;
  }
}

function copyCodeToClipboard() {
  if (!generatedCode.value) return;
  
  try {
    navigator.clipboard.writeText(generatedCode.value.code);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (error) {
    console.error('Failed to copy code:', error);
  }
}

function verifyGeneratedCode() {
  if (!generatedCode.value) return;
  
  codeInput.value = generatedCode.value.code;
  generatedCode.value = null;
  validateInputFormat();
  verifyCodeInput();
}

function resetVerification() {
  codeInput.value = '';
  verificationResult.value = null;
  isValidFormat.value = false;
  
  // Focus the input field
  setTimeout(() => {
    if (codeInputField.value) {
      codeInputField.value.focus();
    }
  }, 0);
}

function clearInput() {
  codeInput.value = '';
  isValidFormat.value = false;
  
  // Focus the input field
  if (codeInputField.value) {
    codeInputField.value.focus();
  }
}

function scanCode() {
  // In a real app, this would open a QR scanner
  alert('QR Scanning would be implemented here');
}

function closeGeneratedCode() {
  generatedCode.value = null;
}

function toggleExpand() {
  emit('expand');
}

function formatExpiryTime(timestamp) {
  if (!timestamp) return 'Unknown';
  
  const expiry = new Date(timestamp);
  const now = new Date();
  
  // If expired
  if (expiry < now) {
    return 'Expired';
  }
  
  // If less than an hour away
  const diffMs = expiry - now;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} remaining`;
  }
  
  // Format date/time
  return expiry.toLocaleString();
}
</script>

<style scoped>
.tm-codeman-verifier {
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  background-color: #fff;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.verifier-header {
  padding: 15px;
  background-color: #2c3e50;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.verifier-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.verifier-title i {
  font-size: 1.2rem;
}

.verifier-title h3 {
  margin: 0;
  font-size: 1.2rem;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.expand-btn {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 5px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.expand-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.verifier-content {
  padding: 20px;
}

.verifier-content.minimal {
  padding: 10px;
}

/* Code input section */
.code-input-section {
  margin-bottom: 20px;
}

.code-input-wrapper {
  position: relative;
  margin-bottom: 10px;
}

.code-input-wrapper input {
  width: 100%;
  padding: 12px 80px 12px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  font-family: monospace;
}

.input-actions {
  position: absolute;
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  gap: 5px;
}

.clear-btn, .scan-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px;
  border-radius: 4px;
  color: #7f8c8d;
  transition: background-color 0.2s, color 0.2s;
}

.clear-btn:hover, .scan-btn:hover {
  background-color: #f5f5f5;
  color: #34495e;
}

.verify-btn {
  width: 100%;
  padding: 12px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.verify-btn:hover:not(:disabled) {
  background-color: #2980b9;
}

.verify-btn:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

.format-hint {
  margin-top: 8px;
  color: #e74c3c;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 5px;
}

/* Verification result section */
.verification-result {
  border: 1px solid #ddd;
  border-radius: 6px;
  overflow: hidden;
}

.result-status {
  padding: 15px;
  display: flex;
  align-items: center;
  gap: 15px;
}

.result-status.verified {
  background-color: #d5f5e3;
  color: #27ae60;
}

.result-status.pending {
  background-color: #fef9e7;
  color: #f39c12;
}

.result-status.failed, 
.result-status.invalid {
  background-color: #fadbd8;
  color: #e74c3c;
}

.result-status.expired {
  background-color: #f2f3f4;
  color: #7f8c8d;
}

.status-icon {
  font-size: 1.6rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-details h4 {
  margin: 0 0 5px 0;
  font-size: 1.1rem;
}

.status-details p {
  margin: 0;
  font-size: 0.9rem;
}

.verified-details {
  padding: 15px;
  border-top: 1px solid #eee;
}

.detail-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  align-items: center;
}

.detail-row .label {
  font-weight: 500;
  min-width: 120px;
  color: #7f8c8d;
}

.detail-row .value.code {
  font-family: monospace;
  background-color: #f7f9f9;
  padding: 3px 6px;
  border-radius: 3px;
}

.security-level {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 20px;
  color: white;
  font-size: 0.85rem;
}

.actions-row {
  margin-top: 20px;
  display: flex;
  gap: 10px;
}

.action-btn {
  padding: 8px 15px;
  border-radius: 4px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: background-color 0.2s;
}

.apply-btn {
  background-color: #2ecc71;
  color: white;
}

.apply-btn:hover:not(:disabled) {
  background-color: #27ae60;
}

.apply-btn:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

.new-search-btn {
  background-color: #ecf0f1;
  color: #34495e;
}

.new-search-btn:hover {
  background-color: #dfe6e9;
}

.retry-btn {
  background-color: #f39c12;
  color: white;
}

.retry-btn:hover {
  background-color: #e67e22;
}

.failed-actions {
  padding: 15px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 10px;
}

/* Code Generator section */
.code-generator {
  margin-top: 20px;
}

.section-divider {
  position: relative;
  text-align: center;
  margin: 20px 0;
  height: 20px;
}

.section-divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  border-top: 1px solid #ddd;
  z-index: 1;
}

.section-divider span {
  position: relative;
  background-color: white;
  padding: 0 10px;
  z-index: 2;
  color: #7f8c8d;
}

.code-generator h4 {
  margin: 0 0 15px 0;
  text-align: center;
  color: #34495e;
}

.form-row {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
}

.form-group {
  flex: 1;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-size: 0.9rem;
  color: #7f8c8d;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.generate-btn {
  width: 100%;
  padding: 12px;
  background-color: #9b59b6;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.generate-btn:hover:not(:disabled) {
  background-color: #8e44ad;
}

.generate-btn:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

/* Generated Code section */
.generated-code {
  border: 1px solid #ddd;
  border-radius: 6px;
  overflow: hidden;
  margin-top: 20px;
}

.section-header {
  background-color: #f5f5f5;
  padding: 12px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header h4 {
  margin: 0;
  color: #34495e;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #7f8c8d;
  padding: 5px;
}

.close-btn:hover {
  color: #34495e;
}

.code-display {
  padding: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: #f9f9f9;
  border-bottom: 1px solid #eee;
}

.code-value {
  flex: 1;
  font-family: monospace;
  font-size: 1.2rem;
  word-break: break-all;
}

.copy-btn {
  padding: 5px 10px;
  background: none;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:hover {
  background-color: #ecf0f1;
}

.code-qr {
  padding: 20px;
  display: flex;
  justify-content: center;
}

.qr-placeholder {
  width: 150px;
  height: 150px;
  background-color: #f9f9f9;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mock-qr {
  font-size: 5rem;
  color: #7f8c8d;
}

.code-details {
  padding: 0 15px 15px 15px;
}

.code-details p {
  margin: 8px 0;
}

.code-actions {
  padding: 15px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: center;
}

.verify-generated-btn {
  background-color: #3498db;
  color: white;
}

.verify-generated-btn:hover {
  background-color: #2980b9;
}

/* Roman theme */
.roman-theme .verifier-header {
  background-color: #8B4513;
}

.roman-theme .verify-btn {
  background-color: #A0522D;
}

.roman-theme .verify-btn:hover:not(:disabled) {
  background-color: #8B4513;
}

.roman-theme .apply-btn {
  background-color: #006400;
}

.roman-theme .apply-btn:hover:not(:disabled) {
  background-color: #004d00;
}

.roman-theme .generate-btn {
  background-color: #800080;
}

.roman-theme .generate-btn:hover:not(:disabled) {
  background-color: #660066;
}

.roman-theme .verify-generated-btn {
  background-color: #A0522D;
}

.roman-theme .verify-generated-btn:hover {
  background-color: #8B4513;
}

/* Responsive styles */
@media (max-width: 600px) {
  .form-row {
    flex-direction: column;
    gap: 10px;
  }
}
</style>
