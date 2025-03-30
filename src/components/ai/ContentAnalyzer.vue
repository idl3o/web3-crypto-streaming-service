<template>
  <div class="content-analyzer">
    <h3 class="analyzer-title">AI Content Analysis</h3>
    
    <div class="analyzer-controls">
      <label for="analysis-prompt">Prompt:</label>
      <div class="prompt-container">
        <textarea 
          id="analysis-prompt" 
          v-model="prompt" 
          placeholder="Enter your prompt for analyzing the content..."
          rows="3"
        ></textarea>
        <button 
          class="template-button" 
          title="Use analysis template"
          @click="useTemplate"
        >
          📋
        </button>
      </div>
      
      <button 
        class="analyze-button" 
        @click="analyzeContent" 
        :disabled="isAnalyzing || !prompt"
      >
        <span v-if="isAnalyzing" class="loader"></span>
        <span v-else>Analyze Content</span>
      </button>
    </div>
    
    <div v-if="analysis" class="analysis-results">
      <h4>Analysis Results</h4>
      <div class="results-content" v-html="formattedAnalysis"></div>
    </div>
    
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { aiService } from '../../services/aiService';

export default defineComponent({
  name: 'ContentAnalyzer',
  
  props: {
    contentId: {
      type: String,
      required: true
    },
    contentTitle: {
      type: String,
      default: ''
    },
    contentType: {
      type: String,
      default: 'video'
    },
    contentDescription: {
      type: String,
      default: ''
    }
  },
  
  setup(props) {
    const prompt = ref('');
    const analysis = ref('');
    const error = ref('');
    const isAnalyzing = ref(false);
    
    const formattedAnalysis = computed(() => {
      if (!analysis.value) return '';
      
      // Convert markdown-like features to HTML for better display
      return analysis.value
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
        .replace(/^# (.*$)/gm, '<h3>$1</h3>') // H1
        .replace(/^## (.*$)/gm, '<h4>$1</h4>') // H2
        .replace(/^### (.*$)/gm, '<h5>$1</h5>') // H3
        .replace(/^- (.*$)/gm, '<li>$1</li>') // List items
        .replace(/<li>(.+?)<\/li>/g, function(match) {
          return '<ul>' + match + '</ul>';
        }) // Wrap list items in ul, simple implementation
        .replace(/<\/ul><ul>/g, '') // Fix adjacent lists
        .replace(/\n/g, '<br>'); // New lines
    });
    
    const useTemplate = () => {
      prompt.value = `Analyze this ${props.contentType} titled "${props.contentTitle}" with the description: "${props.contentDescription}"\n\nProvide insights on its potential audience, key topics, and market potential.`;
    };
    
    const analyzeContent = async () => {
      if (!prompt.value) return;
      
      isAnalyzing.value = true;
      error.value = '';
      
      try {
        analysis.value = await aiService.generateWithGemini(prompt.value, {
          temperature: 0.7,
          maxOutputTokens: 1024
        });
      } catch (err: any) {
        error.value = `Analysis failed: ${err.message}`;
        analysis.value = '';
      } finally {
        isAnalyzing.value = false;
      }
    };
    
    return {
      prompt,
      analysis,
      error,
      isAnalyzing,
      formattedAnalysis,
      useTemplate,
      analyzeContent
    };
  }
});
</script>

<style scoped>
.content-analyzer {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.analyzer-title {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #333;
}

.analyzer-controls {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.prompt-container {
  position: relative;
  margin-bottom: 1rem;
}

textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
  font-family: inherit;
  font-size: 0.9rem;
  line-height: 1.5;
}

.template-button {
  position: absolute;
  right: 8px;
  top: 8px;
  background: transparent;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.template-button:hover {
  opacity: 1;
}

.analyze-button {
  background: #4a7dff;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.analyze-button:hover:not(:disabled) {
  background: #3a6ae9;
}

.analyze-button:disabled {
  background: #a0b4e6;
  cursor: not-allowed;
}

.analysis-results {
  background: white;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 1rem;
}

.analysis-results h4 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  color: #333;
}

.results-content {
  line-height: 1.6;
  font-size: 0.95rem;
}

.error-message {
  background: #ffebee;
  color: #c62828;
  padding: 0.75rem;
  border-radius: 4px;
  margin-top: 1rem;
}

.loader {
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
</style>
