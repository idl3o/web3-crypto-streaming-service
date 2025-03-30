<template>
  <div class="tabnine-contact">
    <div class="contact-header">
      <h2>Technical Support</h2>
      <p class="powered-by">Powered by TabNine AI Support</p>
    </div>

    <div class="contact-options">
      <div class="option-card" @click="selectOption('technicalSupport')">
        <div class="option-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
          </svg>
        </div>
        <h3>Technical Support</h3>
        <p>Get help with streaming issues, device connectivity, and account problems</p>
      </div>

      <div class="option-card" @click="selectOption('billingInquiry')">
        <div class="option-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2"></rect>
            <line x1="2" y1="10" x2="22" y2="10"></line>
          </svg>
        </div>
        <h3>Billing Inquiries</h3>
        <p>Questions about payments, subscriptions, or transaction history</p>
      </div>

      <div class="option-card" @click="selectOption('featureRequest')">
        <div class="option-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
        </div>
        <h3>Feature Requests</h3>
        <p>Suggest new features or improvements to our platform</p>
      </div>
    </div>

    <div v-if="selectedOption" class="contact-form">
      <h3>{{ formTitle }}</h3>
      
      <form @submit.prevent="submitForm">
        <div class="form-group">
          <label for="name">Name</label>
          <input 
            type="text" 
            id="name" 
            v-model="formData.name" 
            required
            placeholder="Your name"
          />
        </div>

        <div class="form-group">
          <label for="email">Email</label>
          <input 
            type="email" 
            id="email" 
            v-model="formData.email" 
            required
            placeholder="your.email@example.com"
          />
        </div>

        <div class="form-group">
          <label for="subject">Subject</label>
          <input 
            type="text" 
            id="subject" 
            v-model="formData.subject" 
            required
            placeholder="Brief summary of your inquiry"
          />
        </div>

        <div class="form-group">
          <label for="message">Message</label>
          <textarea 
            id="message" 
            v-model="formData.message" 
            required
            placeholder="Please describe your issue in detail"
            rows="6"
          ></textarea>
        </div>

        <div v-if="selectedOption === 'technicalSupport'" class="form-group">
          <label for="deviceInfo">Device Information</label>
          <textarea 
            id="deviceInfo" 
            v-model="formData.deviceInfo" 
            placeholder="Operating system, browser version, etc."
            rows="3"
          ></textarea>
          <button type="button" @click="collectSystemInfo" class="secondary-button">
            Auto-Detect System Info
          </button>
        </div>

        <div class="form-action">
          <button type="submit" class="submit-button" :disabled="isSubmitting">
            <span v-if="isSubmitting" class="loading-spinner"></span>
            <span v-else>Submit</span>
          </button>
          <button type="button" @click="resetForm" class="cancel-button">
            Cancel
          </button>
        </div>

        <div class="alternative-options">
          <p>You can also reach out to us directly:</p>
          <a href="https://www.tabnine.com/contact-us/?utm_source=app&utm_medium=inapp&utm_campaign=contact" target="_blank" rel="noopener noreferrer" class="external-link">
            TabNine Contact Form
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        </div>
      </form>
    </div>

    <!-- Submission Confirmation -->
    <div v-if="showConfirmation" class="submission-confirmation">
      <div class="confirmation-icon">✓</div>
      <h3>Thank You!</h3>
      <p>Your request has been submitted successfully.</p>
      <p>We'll get back to you as soon as possible at {{ formData.email }}.</p>
      <p>Reference ID: {{ referenceId }}</p>
      <button @click="resetForm" class="primary-button">Submit Another Request</button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';

export default defineComponent({
  name: 'TabNineContactForm',
  
  setup() {
    const selectedOption = ref<string | null>(null);
    const isSubmitting = ref(false);
    const showConfirmation = ref(false);
    const referenceId = ref('');
    
    const formData = ref({
      name: '',
      email: '',
      subject: '',
      message: '',
      deviceInfo: ''
    });
    
    const formTitle = computed(() => {
      switch (selectedOption.value) {
        case 'technicalSupport':
          return 'Technical Support Request';
        case 'billingInquiry':
          return 'Billing Inquiry';
        case 'featureRequest':
          return 'Feature Request';
        default:
          return 'Contact Us';
      }
    });
    
    const selectOption = (option: string) => {
      selectedOption.value = option;
      
      // Set default subject based on option
      switch (option) {
        case 'technicalSupport':
          formData.value.subject = 'Technical Support: ';
          break;
        case 'billingInquiry':
          formData.value.subject = 'Billing Inquiry: ';
          break;
        case 'featureRequest':
          formData.value.subject = 'Feature Request: ';
          break;
      }
    };
    
    const collectSystemInfo = async () => {
      try {
        // In a real implementation, we would use a library to collect system info
        const browser = navigator.userAgent;
        const platform = navigator.platform;
        const screenResolution = `${window.screen.width}x${window.screen.height}`;
        const language = navigator.language;
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        formData.value.deviceInfo = `Browser: ${browser}\nPlatform: ${platform}\nScreen: ${screenResolution}\nLanguage: ${language}\nTime Zone: ${timeZone}`;
      } catch (error) {
        console.error('Failed to collect system info:', error);
        formData.value.deviceInfo = 'Failed to collect system information automatically.';
      }
    };
    
    const submitForm = async () => {
      isSubmitting.value = true;
      
      try {
        // In a real implementation, we would send the form data to an API
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Generate a reference ID
        referenceId.value = `REQ-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        
        // Show confirmation
        showConfirmation.value = true;
      } catch (error) {
        console.error('Error submitting form:', error);
        alert('Failed to submit your request. Please try again later.');
      } finally {
        isSubmitting.value = false;
      }
    };
    
    const resetForm = () => {
      selectedOption.value = null;
      showConfirmation.value = false;
      formData.value = {
        name: '',
        email: '',
        subject: '',
        message: '',
        deviceInfo: ''
      };
    };
    
    return {
      selectedOption,
      formData,
      formTitle,
      isSubmitting,
      showConfirmation,
      referenceId,
      selectOption,
      collectSystemInfo,
      submitForm,
      resetForm
    };
  }
});
</script>

<style scoped>
.tabnine-contact {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.contact-header {
  margin-bottom: 2rem;
  text-align: center;
}

.contact-header h2 {
  margin: 0 0 0.5rem;
  color: #333;
  font-size: 1.8rem;
}

.powered-by {
  color: #666;
  font-size: 0.9rem;
  margin: 0;
}

.contact-options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.option-card {
  padding: 1.5rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.option-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.05);
}

.option-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: #e7f5ff;
  color: #339af0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.option-card h3 {
  margin: 0 0 0.5rem;
  color: #333;
}

.option-card p {
  margin: 0;
  color: #6c757d;
  font-size: 0.9rem;
}

.contact-form {
  padding: 1.5rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.contact-form h3 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #333;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #495057;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background-color: white;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: #339af0;
  outline: none;
  box-shadow: 0 0 0 3px rgba(51, 154, 240, 0.1);
}

.form-action {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.submit-button,
.secondary-button,
.cancel-button,
.primary-button {
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.submit-button {
  background-color: #339af0;
  color: white;
  border: none;
  flex: 1;
}

.submit-button:hover {
  background-color: #228be6;
}

.submit-button:disabled {
  background-color: #adb5bd;
  cursor: not-allowed;
}

.secondary-button {
  background-color: #e9ecef;
  color: #495057;
  border: none;
  font-size: 0.85rem;
  padding: 0.5rem 0.75rem;
  margin-top: 0.5rem;
}

.secondary-button:hover {
  background-color: #dee2e6;
}

.cancel-button {
  background-color: transparent;
  color: #495057;
  border: 1px solid #ced4da;
}

.cancel-button:hover {
  background-color: #f8f9fa;
}

.primary-button {
  background-color: #339af0;
  color: white;
  border: none;
  display: block;
  margin: 1.5rem auto 0;
}

.primary-button:hover {
  background-color: #228be6;
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

.alternative-options {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #dee2e6;
  text-align: center;
  font-size: 0.9rem;
  color: #6c757d;
}

.external-link {
  display: inline-flex;
  align-items: center;
  color: #339af0;
  text-decoration: none;
  font-weight: 500;
  margin-top: 0.5rem;
  gap: 0.25rem;
}

.external-link:hover {
  text-decoration: underline;
}

.submission-confirmation {
  text-align: center;
  padding: 2rem;
}

.confirmation-icon {
  width: 60px;
  height: 60px;
  background-color: #d3f9d8;
  color: #2b8a3e;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
  font-size: 1.5rem;
  font-weight: bold;
}

.submission-confirmation h3 {
  margin: 0 0 1rem;
  color: #2b8a3e;
}

.submission-confirmation p {
  margin: 0 0 0.5rem;
  color: #495057;
}
</style>
