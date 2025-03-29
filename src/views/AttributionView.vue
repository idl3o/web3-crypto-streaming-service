<template>
  <div class="attribution-view">
    <div class="hero-section">
      <div class="container">
        <h1>Attribution & Accreditation</h1>
        <p class="lead">
          Acknowledging the people, projects, and technologies that make Web3 Crypto Streaming Service possible
        </p>
      </div>
    </div>
    
    <div class="container py-5">
      <!-- Render markdown content -->
      <div class="row justify-content-center">
        <div class="col-lg-10">
          <div class="card border-0 shadow-sm">
            <div class="card-body p-4">
              <div class="markdown-content" v-html="attributionHtml"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Credits component -->
    <CreditsSection />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { marked } from 'marked';
import CreditsSection from '@/components/layout/CreditsSection.vue';

const attributionHtml = ref('');

onMounted(async () => {
  try {
    const response = await fetch('/ATTRIBUTION.md');
    if (!response.ok) throw new Error('Failed to load attribution file');
    
    const markdown = await response.text();
    attributionHtml.value = marked(markdown);
  } catch (error) {
    console.error('Error loading attribution:', error);
    attributionHtml.value = '<p class="text-danger">Failed to load attribution information. Please try again later.</p>';
  }
});
</script>

<style>
.attribution-view .hero-section {
  background: var(--gradient-primary);
  color: white;
  padding: 5rem 0;
  text-align: center;
}

.attribution-view .hero-section h1 {
  color: white;
  margin-bottom: 1.5rem;
  font-size: 3rem;
}

.attribution-view .hero-section .lead {
  font-size: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
  opacity: 0.9;
}

.attribution-view .markdown-content {
  line-height: 1.7;
}

.attribution-view .markdown-content h1,
.attribution-view .markdown-content h2 {
  margin-top: 2rem;
  margin-bottom: 1rem;
}

.attribution-view .markdown-content h3 {
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

.attribution-view .markdown-content ul {
  margin-bottom: 1.5rem;
}

.attribution-view .markdown-content a {
  color: var(--primary);
  text-decoration: none;
}

.attribution-view .markdown-content a:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .attribution-view .hero-section {
    padding: 3rem 0;
  }
  
  .attribution-view .hero-section h1 {
    font-size: 2.5rem;
  }
  
  .attribution-view .hero-section .lead {
    font-size: 1.2rem;
  }
}
</style>
