<template>
  <div class="meta-analysis-page">
    <div class="page-header">
      <h1>Project Meta Analysis</h1>
      <p class="subtitle">Architectural visualization and metadata insight explorer</p>
    </div>
    
    <div class="page-content">
      <meta-analysis-viewer v-if="!loading" />
      
      <div v-else class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading meta analysis...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import MetaAnalysisViewer from '@/components/MetaAnalysisViewer.vue';
import { useMetaStore } from '@/stores/meta';

const metaStore = useMetaStore();
const loading = ref(true);

onMounted(async () => {
  try {
    await metaStore.loadMetaAnalysis();
  } catch (error) {
    console.error('Failed to load meta analysis:', error);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.meta-analysis-page {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
  text-align: center;
}

.subtitle {
  color: #666;
  font-size: 1.1rem;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: var(--primary-color);
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
