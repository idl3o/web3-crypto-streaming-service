<template>
  <div class="tabnine-contact-page">
    <div class="page-header">
      <h1>Contact Us</h1>
      <p class="subtitle">Get support for your Web3 Crypto Streaming experience</p>
    </div>
    
    <TabNineContactForm />
    
    <div class="contact-resources">
      <h3>Additional Resources</h3>
      <div class="resources-grid">
        <div class="resource-card">
          <h4>Documentation</h4>
          <p>Browse our comprehensive guides and tutorials</p>
          <a href="/docs" class="resource-link">View Documentation</a>
        </div>
        
        <div class="resource-card">
          <h4>FAQ</h4>
          <p>Find answers to frequently asked questions</p>
          <a href="/faq" class="resource-link">Visit FAQ</a>
        </div>
        
        <div class="resource-card">
          <h4>Community Forum</h4>
          <p>Join discussions with other users and our team</p>
          <a href="/community" class="resource-link">Join Community</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import TabNineContactForm from '../components/support/TabNineContactForm.vue';

export default defineComponent({
  name: 'TabNineContact',
  components: {
    TabNineContactForm
  }
});
</script>

<style scoped>
.tabnine-contact-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.page-header {
  text-align: center;
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 2.5rem;
  margin: 0 0 0.5rem;
  color: #333;
}

.subtitle {
  font-size: 1.2rem;
  color: #666;
  margin: 0;
}

.contact-resources {
  margin-top: 4rem;
}

.contact-resources h3 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: #333;
}

.resources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.resource-card {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  border: 1px solid #e9ecef;
}

.resource-card h4 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  color: #333;
}

.resource-card p {
  margin-bottom: 1.25rem;
  color: #6c757d;
}

.resource-link {
  display: inline-block;
  padding: 0.5rem 1rem;
  background-color: #339af0;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.resource-link:hover {
  background-color: #228be6;
}

@media (max-width: 768px) {
  .page-header h1 {
    font-size: 2rem;
  }
  
  .subtitle {
    font-size: 1rem;
  }
}
</style>
