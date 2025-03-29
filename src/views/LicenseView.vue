<template>
  <div class="license-view">
    <div class="hero-section">
      <div class="container">
        <h1>License Information</h1>
        <p class="lead">
          Web3 Crypto Streaming Service License (W3CS-L)
        </p>
      </div>
    </div>
    
    <div class="container py-5">
      <!-- Render markdown content -->
      <div class="row justify-content-center">
        <div class="col-lg-10">
          <div class="card border-0 shadow-sm">
            <div class="card-body p-4">
              <div class="markdown-content" v-html="licenseHtml"></div>
            </div>
          </div>
          
          <div class="license-buttons text-center mt-4">
            <a href="/LICENSE.md" download class="btn btn-primary me-3">
              <i class="fas fa-file-download me-2"></i> Download License
            </a>
            <a href="https://github.com/web3-crypto-streaming-service/web3-crypto-streaming-service/blob/main/LICENSE.md" 
               target="_blank" rel="noopener" class="btn btn-outline-primary">
              <i class="fab fa-github me-2"></i> View on GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { marked } from 'marked';

const licenseHtml = ref('');

onMounted(async () => {
  try {
    const response = await fetch('/LICENSE.md');
    if (!response.ok) throw new Error('Failed to load license file');
    
    const markdown = await response.text();
    licenseHtml.value = marked(markdown);
  } catch (error) {
    console.error('Error loading license:', error);
    licenseHtml.value = '<p class="text-danger">Failed to load license information. Please try again later.</p>';
  }
});
</script>

<style>
.license-view .hero-section {
  background: var(--gradient-secondary);
  color: white;
  padding: 5rem 0;
  text-align: center;
}

.license-view .hero-section h1 {
  color: white;
  margin-bottom: 1.5rem;
  font-size: 3rem;
}

.license-view .hero-section .lead {
  font-size: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
  opacity: 0.9;
}

.license-view .markdown-content {
  line-height: 1.7;
}

.license-view .markdown-content h1,
.license-view .markdown-content h2 {
  margin-top: 2rem;
  margin-bottom: 1rem;
}

.license-view .markdown-content h3 {
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

.license-view .markdown-content hr {
  margin: 2rem 0;
}

@media (max-width: 768px) {
  .license-view .hero-section {
    padding: 3rem 0;
  }
  
  .license-view .hero-section h1 {
    font-size: 2.5rem;
  }
  
  .license-view .hero-section .lead {
    font-size: 1.2rem;
  }
}
</style>
