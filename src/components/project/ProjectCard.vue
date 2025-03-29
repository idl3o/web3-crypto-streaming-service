<template>
  <div class="project-card" :class="[theme, { 'interactive': interactive }]" @click="handleCardClick">
    <div class="project-header">
      <div class="project-logo">
        <img v-if="project.logo" :src="project.logo" :alt="project.name">
        <div v-else class="placeholder-logo">
          {{ projectInitials }}
        </div>
      </div>
      <div class="project-title">
        <h4>{{ project.name }}</h4>
        <div class="project-stats">
          <span class="stat">
            <i class="fas fa-users"></i> {{ project.contributors }}
          </span>
          <span class="stat">
            <i class="fas fa-star"></i> {{ project.stars }}
          </span>
          <span v-if="project.trend" :class="['trend', project.trend]">
            <i :class="getTrendIcon(project.trend)"></i> {{ formatTrend(project.trend) }}
          </span>
        </div>
      </div>
    </div>
    
    <div class="project-content">
      <p class="project-description">{{ truncateDescription(project.description) }}</p>
      
      <div class="project-progress">
        <div class="progress-label">
          <span>Progress</span>
          <span>{{ project.completionPercentage }}%</span>
        </div>
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: `${project.completionPercentage}%` }"
          ></div>
        </div>
      </div>
      
      <div class="project-tags">
        <span v-if="project.category" class="category">{{ project.category }}</span>
        <span 
          v-for="tag in limitTags(project.tags)" 
          :key="tag" 
          class="tag"
          @click.stop="$emit('tag-click', tag)"
        >
          {{ tag }}
        </span>
      </div>
    </div>
    
    <div class="project-footer">
      <span class="license" v-if="project.license">
        <i class="fas fa-balance-scale"></i> {{ project.license }}
      </span>
      
      <div class="project-actions">
        <button v-if="project.githubUrl" class="action-btn github" @click.stop="openGitHub">
          <i class="fab fa-github"></i>
        </button>
        
        <button class="action-btn details" @click.stop="$emit('view-details', project)">
          <i class="fas fa-info-circle"></i>
        </button>
        
        <button class="action-btn join" @click.stop="$emit('join-project', project)">
          <i class="fas fa-user-plus"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue';

const props = defineProps({
  project: {
    type: Object,
    required: true
  },
  interactive: {
    type: Boolean,
    default: true
  },
  maxDescription: {
    type: Number,
    default: 100
  },
  maxTags: {
    type: Number,
    default: 3
  }
});

const emit = defineEmits(['view-details', 'join-project', 'tag-click', 'click']);

const theme = inject('currentTheme', 'roman-theme');

// Computed properties
const projectInitials = computed(() => {
  if (!props.project.name) return '??';
  return props.project.name
    .split(' ')
    .slice(0, 2)
    .map(word => word.charAt(0).toUpperCase())
    .join('');
});

// Helper functions
function truncateDescription(description) {
  if (!description) return '';
  if (description.length <= props.maxDescription) return description;
  return description.substring(0, props.maxDescription) + '...';
}

function limitTags(tags) {
  if (!tags || !Array.isArray(tags)) return [];
  return tags.slice(0, props.maxTags);
}

function getTrendIcon(trend) {
  switch (trend) {
    case 'rising': return 'fas fa-arrow-up';
    case 'falling': return 'fas fa-arrow-down';
    case 'stable': return 'fas fa-arrow-right';
    case 'new': return 'fas fa-star';
    default: return 'fas fa-minus';
  }
}

function formatTrend(trend) {
  switch (trend) {
    case 'rising': return 'Rising';
    case 'falling': return 'Declining';
    case 'stable': return 'Stable';
    case 'new': return 'New';
    default: return trend;
  }
}

function openGitHub() {
  if (props.project.githubUrl) {
    window.open(props.project.githubUrl, '_blank');
  }
}

function handleCardClick() {
  if (props.interactive) {
    emit('click', props.project);
  }
}
</script>

<style scoped>
.project-card {
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  padding: 16px;
  transition: all 0.2s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.project-card.interactive:hover {
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.project-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 15px;
}

.project-logo {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.project-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder-logo {
  width: 100%;
  height: 100%;
  background-color: #3498db;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 16px;
}

.project-title {
  flex-grow: 1;
  overflow: hidden;
}

.project-title h4 {
  margin: 0 0 5px 0;
  font-size: 1.1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.project-stats {
  display: flex;
  gap: 12px;
  font-size: 0.8rem;
  color: #666;
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
}

.trend {
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 0.7rem;
}

.trend.rising {
  background-color: rgba(46, 204, 113, 0.1);
  color: #2ecc71;
}

.trend.falling {
  background-color: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
}

.trend.stable {
  background-color: rgba(52, 152, 219, 0.1);
  color: #3498db;
}

.trend.new {
  background-color: rgba(155, 89, 182, 0.1);
  color: #9b59b6;
}

.project-content {
  flex-grow: 1;
  margin-bottom: 15px;
}

.project-description {
  font-size: 0.9rem;
  margin: 0 0 15px 0;
  color: #444;
  line-height: 1.4;
}

.project-progress {
  margin-bottom: 15px;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 5px;
}

.progress-bar {
  height: 6px;
  background-color: #eee;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #3498db;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.project-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.category {
  background-color: rgba(52, 152, 219, 0.1);
  color: #3498db;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.tag {
  background-color: #f5f5f5;
  color: #666;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.tag:hover {
  background-color: #e0e0e0;
}

.project-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #eee;
  padding-top: 12px;
}

.license {
  font-size: 0.8rem;
  color: #666;
  display: flex;
  align-items: center;
  gap: 5px;
}

.project-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background-color: #f5f5f5;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  transform: translateY(-2px);
}

.action-btn.github:hover {
  background-color: #333;
  color: white;
}

.action-btn.details:hover {
  background-color: #3498db;
  color: white;
}

.action-btn.join:hover {
  background-color: #2ecc71;
  color: white;
}

/* Roman theme styling */
.project-card.roman-theme {
  border: 1px solid #d5c3aa;
}

.roman-theme .placeholder-logo {
  background-color: #8B4513;
}

.roman-theme .trend.rising {
  background-color: rgba(107, 142, 35, 0.1);
  color: #6B8E23;
}

.roman-theme .trend.falling {
  background-color: rgba(178, 34, 34, 0.1);
  color: #B22222;
}

.roman-theme .trend.stable {
  background-color: rgba(139, 69, 19, 0.1);
  color: #8B4513;
}

.roman-theme .trend.new {
  background-color: rgba(160, 82, 45, 0.1);
  color: #A0522D;
}

.roman-theme .progress-fill {
  background-color: #8B4513;
}

.roman-theme .category {
  background-color: rgba(139, 69, 19, 0.1);
  color: #8B4513;
}

.roman-theme .project-footer {
  border-top-color: #d5c3aa;
}

.roman-theme .action-btn.details:hover {
  background-color: #8B4513;
}

.roman-theme .action-btn.join:hover {
  background-color: #6B8E23;
}
</style>
