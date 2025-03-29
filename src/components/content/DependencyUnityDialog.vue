<template>
  <div class="dependency-dialog" :class="theme">
    <div class="dialog-header">
      <h3>Dependencies for "{{ content.title }}"</h3>
      <button class="close-btn" @click="closeDialog">
        <i class="fas fa-times"></i>
      </button>
    </div>
    
    <div class="dialog-body">
      <div class="unity-summary">
        <div class="unity-status" :class="unityStatusClass">
          <i :class="unityIconClass"></i>
          <div class="unity-status-details">
            <h4>{{ unityStatusText }}</h4>
            <p>{{ unityStatusDescription }}</p>
          </div>
        </div>
        
        <div class="unity-actions" v-if="needsSync">
          <button class="sync-btn" @click="syncDependencies" :disabled="isSyncing">
            <i :class="isSyncing ? 'fas fa-sync fa-spin' : 'fas fa-sync'"></i>
            {{ isSyncing ? 'Synchronizing...' : 'Synchronize Dependencies' }}
          </button>
        </div>
      </div>
      
      <!-- Parent Stream (if forked) -->
      <div class="parent-stream" v-if="content.forkedFrom !== undefined">
        <h4>Parent Stream</h4>
        <div class="dependency-item">
          <div class="dependency-info" v-if="parentStream">
            <div class="dep-thumbnail">
              <img v-if="parentStream.thumbnail" :src="parentStream.thumbnail" :alt="parentStream.title">
              <div v-else class="placeholder-thumbnail">
                <i class="fas fa-photo-video"></i>
              </div>
            </div>
            <div class="dep-details">
              <h5>{{ parentStream.title }}</h5>
              <p class="dep-creator">by {{ parentStream.creator }}</p>
              <div class="dep-meta">
                <span class="dep-id">#{{ parentStream.id }}</span>
                <span class="dep-status" :class="getRelationClass(content.parentStatus || 'unknown')">
                  {{ getRelationStatus(content.parentStatus || 'unknown') }}
                </span>
              </div>
            </div>
          </div>
          <div class="dependency-info" v-else>
            <div class="placeholder-thumbnail">
              <i class="fas fa-question"></i>
            </div>
            <div class="dep-details">
              <h5>Unknown Stream</h5>
              <p class="dep-creator">ID: {{ content.forkedFrom }}</p>
              <div class="dep-meta">
                <span class="dep-status status-error">
                  Parent not found
                </span>
              </div>
            </div>
          </div>
          <div class="dependency-actions">
            <button @click="viewDependency(parentStream || { id: content.forkedFrom })" class="dep-action-btn">
              <i class="fas fa-eye"></i>
            </button>
          </div>
        </div>
      </div>
      
      <!-- External Dependencies -->
      <div class="external-dependencies" v-if="hasDependencies">
        <h4>External Dependencies</h4>
        <div class="dependency-item" v-for="dep in content.dependencies" :key="dep.id">
          <div class="dependency-info">
            <div class="dep-thumbnail">
              <img v-if="dep.thumbnail" :src="dep.thumbnail" :alt="dep.name">
              <div v-else class="placeholder-thumbnail">
                <i :class="getDependencyIcon(dep.type)"></i>
              </div>
            </div>
            <div class="dep-details">
              <h5>{{ dep.name }}</h5>
              <p class="dep-creator">{{ dep.type }} | {{ dep.version }}</p>
              <div class="dep-meta">
                <span class="dep-status" :class="getRelationClass(dep.status)">
                  {{ getRelationStatus(dep.status) }}
                </span>
              </div>
            </div>
          </div>
          <div class="dependency-actions">
            <button @click="updateDependency(dep)" class="dep-action-btn" v-if="dep.status === 'outdated'">
              <i class="fas fa-arrow-up"></i>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Dependent Streams -->
      <div class="dependent-streams" v-if="hasStreamDependents">
        <h4>Dependent Streams</h4>
        <div class="dependency-item" v-for="stream in dependentStreams" :key="stream.id">
          <div class="dependency-info">
            <div class="dep-thumbnail">
              <img v-if="stream.thumbnail" :src="stream.thumbnail" :alt="stream.title">
              <div v-else class="placeholder-thumbnail">
                <i class="fas fa-photo-video"></i>
              </div>
            </div>
            <div class="dep-details">
              <h5>{{ stream.title }}</h5>
              <p class="dep-creator">by {{ stream.creator }}</p>
              <div class="dep-meta">
                <span class="dep-id">#{{ stream.id }}</span>
                <span class="dep-status" :class="getRelationClass(stream.unityStatus || 'unknown')">
                  {{ getRelationStatus(stream.unityStatus || 'unknown') }}
                </span>
              </div>
            </div>
          </div>
          <div class="dependency-actions">
            <button @click="viewDependency(stream)" class="dep-action-btn">
              <i class="fas fa-eye"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted } from 'vue';

const props = defineProps({
  content: {
    type: Object,
    required: true
  },
  allStreams: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['close', 'view', 'syncDependencies']);
const theme = inject('currentTheme', 'roman-theme');

const isSyncing = ref(false);
const parentStream = ref(null);
const dependentStreams = ref([]);

// Find parent stream and dependent streams
onMounted(() => {
  if (props.content.forkedFrom) {
    parentStream.value = props.allStreams.find(s => s.id === props.content.forkedFrom);
  }
  
  dependentStreams.value = props.allStreams.filter(s => s.forkedFrom === props.content.id);
});

const hasDependencies = computed(() => {
  return props.content.dependencies && props.content.dependencies.length > 0;
});

const hasStreamDependents = computed(() => {
  return dependentStreams.value.length > 0;
});

const needsSync = computed(() => {
  if (props.content.unityStatus === 'outdated' || props.content.unityStatus === 'diverged') {
    return true;
  }
  
  if (hasDependencies.value) {
    return props.content.dependencies.some(dep => dep.status === 'outdated');
  }
  
  return false;
});

const unityStatusClass = computed(() => {
  const status = props.content.unityStatus || 'unknown';
  return `status-${status}`;
});

const unityIconClass = computed(() => {
  const status = props.content.unityStatus || 'unknown';
  switch (status) {
    case 'synced': return 'fas fa-check-circle';
    case 'diverged': return 'fas fa-code-branch';
    case 'outdated': return 'fas fa-exclamation-triangle';
    default: return 'fas fa-question-circle';
  }
});

const unityStatusText = computed(() => {
  const status = props.content.unityStatus || 'unknown';
  switch (status) {
    case 'synced': return 'Dependencies Unified';
    case 'diverged': return 'Dependencies Diverged';
    case 'outdated': return 'Dependencies Outdated';
    default: return 'Unity Status Unknown';
  }
});

const unityStatusDescription = computed(() => {
  const status = props.content.unityStatus || 'unknown';
  switch (status) {
    case 'synced': 
      return 'All dependencies are synchronized and up-to-date.';
    case 'diverged':
      return 'This stream has intentionally diverged from its parent or dependencies.';
    case 'outdated':
      return 'Some dependencies have updates available that could affect stream behavior.';
    default:
      return 'Dependency status could not be determined.';
  }
});

function getDependencyIcon(type) {
  switch (type?.toLowerCase()) {
    case 'contract': return 'fas fa-file-contract';
    case 'library': return 'fas fa-book';
    case 'api': return 'fas fa-cloud';
    case 'service': return 'fas fa-server';
    case 'protocol': return 'fas fa-network-wired';
    default: return 'fas fa-cube';
  }
}

function getRelationClass(status) {
  switch (status) {
    case 'synced': return 'status-synced';
    case 'diverged': return 'status-diverged';
    case 'outdated': return 'status-outdated';
    default: return 'status-unknown';
  }
}

function getRelationStatus(status) {
  switch (status) {
    case 'synced': return 'In sync';
    case 'diverged': return 'Diverged';
    case 'outdated': return 'Outdated';
    default: return 'Unknown';
  }
}

async function syncDependencies() {
  try {
    isSyncing.value = true;
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    emit('syncDependencies', props.content);
  } catch (error) {
    console.error('Failed to sync dependencies:', error);
  } finally {
    isSyncing.value = false;
  }
}

function updateDependency(dependency) {
  // This would typically update a specific dependency
  syncDependencies();
}

function viewDependency(dependency) {
  emit('view', dependency);
}

function closeDialog() {
  emit('close');
}
</script>

<style scoped>
.dependency-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  width: 650px;
  max-width: 95%;
  max-height: 90vh;
  overflow-y: auto;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.dialog-header h3 {
  margin: 0;
  font-size: 1.3rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.close-btn:hover {
  opacity: 1;
}

.unity-summary {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.unity-status {
  display: flex;
  align-items: center;
  gap: 15px;
}

.unity-status i {
  font-size: 2rem;
}

.unity-status-details h4 {
  margin: 0 0 5px 0;
  font-size: 1.1rem;
}

.unity-status-details p {
  margin: 0;
  font-size: 0.9rem;
  color: #666;
  max-width: 350px;
}

.status-synced i {
  color: #2ecc71;
}

.status-diverged i {
  color: #3498db;
}

.status-outdated i {
  color: #f39c12;
}

.status-unknown i {
  color: #95a5a6;
}

.status-error {
  color: #e74c3c !important;
}

.unity-actions {
  flex-shrink: 0;
}

.sync-btn {
  padding: 8px 16px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s;
}

.sync-btn:hover {
  background-color: #2980b9;
}

.sync-btn:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}

.parent-stream,
.external-dependencies,
.dependent-streams {
  margin-bottom: 25px;
}

.parent-stream h4,
.external-dependencies h4,
.dependent-streams h4 {
  margin: 0 0 10px 0;
  font-size: 1rem;
  font-weight: 600;
  color: #555;
  padding-bottom: 5px;
  border-bottom: 1px solid #eee;
}

.dependency-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #eee;
  margin-bottom: 10px;
}

.dependency-info {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-grow: 1;
}

.dep-thumbnail {
  width: 60px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
}

.dep-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder-thumbnail {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  color: #aaa;
  font-size: 1.5rem;
}

.dep-details h5 {
  margin: 0 0 4px 0;
  font-size: 1rem;
}

.dep-creator {
  margin: 0 0 4px 0;
  font-size: 0.85rem;
  color: #666;
}

.dep-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dep-id {
  font-size: 0.8rem;
  color: #888;
}

.dep-status {
  font-size: 0.8rem;
  padding: 2px 6px;
  border-radius: 10px;
}

.status-synced {
  background-color: rgba(46, 204, 113, 0.1);
  color: #27ae60;
}

.status-diverged {
  background-color: rgba(52, 152, 219, 0.1);
  color: #2980b9;
}

.status-outdated {
  background-color: rgba(243, 156, 18, 0.1);
  color: #f39c12;
}

.status-unknown {
  background-color: rgba(149, 165, 166, 0.1);
  color: #7f8c8d;
}

.dependency-actions {
  flex-shrink: 0;
}

.dep-action-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background-color: #f5f5f5;
  color: #555;
  cursor: pointer;
  transition: all 0.2s;
}

.dep-action-btn:hover {
  background-color: #e0e0e0;
}

/* Roman theme overrides */
.roman-theme .dependency-dialog {
  border: 1px solid #d5c3aa;
  background-color: #fcf8f3;
}

.roman-theme .dialog-header h3 {
  font-family: 'Trajan Pro', 'Times New Roman', serif;
  color: #8B4513;
}

.roman-theme .unity-summary {
  background-color: #f5eee6;
}

.roman-theme .parent-stream h4,
.roman-theme .external-dependencies h4,
.roman-theme .dependent-streams h4 {
  color: #8B4513;
  border-bottom-color: #d5c3aa;
}

.roman-theme .dependency-item {
  border-color: #d5c3aa;
}

.roman-theme .status-synced i,
.roman-theme .status-synced {
  color: #8B4513;
}

.roman-theme .status-diverged i,
.roman-theme .status-diverged {
  color: #A0522D;
}

.roman-theme .status-outdated i,
.roman-theme .status-outdated {
  color: #CD853F;
}

.roman-theme .status-synced {
  background-color: rgba(139, 69, 19, 0.1);
}

.roman-theme .status-diverged {
  background-color: rgba(160, 82, 45, 0.1);
}

.roman-theme .status-outdated {
  background-color: rgba(205, 133, 63, 0.1);
}

.roman-theme .sync-btn {
  background-color: #8B4513;
}

.roman-theme .sync-btn:hover {
  background-color: #A0522D;
}

.roman-theme .dep-action-btn {
  background-color: #f0e6d2;
}

.roman-theme .dep-action-btn:hover {
  background-color: #e0d6c2;
}
</style>
