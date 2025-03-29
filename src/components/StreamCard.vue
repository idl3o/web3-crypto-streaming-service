<template>
  <div class="stream-card" :class="{ 'is-loading': loading }">
    <div class="card-content">
      <h3 class="title">{{ title }}</h3>
      <p class="description">{{ description }}</p>
    </div>
    
    <div class="preview" v-if="!loading">
      <img v-if="previewType === 'image'" :src="previewUrl" alt="Content preview" class="preview-image" />
      <video v-else-if="previewType === 'video'" controls class="preview-video">
        <source :src="previewUrl" :type="mimeType">
        Your browser does not support video playback.
      </video>
      <div v-else class="preview-placeholder">
        <icon-document />
      </div>
    </div>
    
    <div v-else class="loading-indicator">
      <spinner-icon />
      <span>Loading preview...</span>
    </div>
    
    <div class="card-footer">
      <div class="creator">
        <img :src="creatorAvatar" alt="Creator" class="creator-avatar" />
        <span>{{ creator }}</span>
      </div>
      <license-badge :license="license" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useContentStore } from '@/stores/content';
import LicenseBadge from '@/components/LicenseBadge.vue';
import SpinnerIcon from '@/components/icons/SpinnerIcon.vue';
import IconDocument from '@/components/icons/IconDocument.vue';

const props = defineProps({
  contentId: {
    type: String,
    required: true
  }
});

const contentStore = useContentStore();
const loading = ref(true);
const title = ref('');
const description = ref('');
const creator = ref('');
const creatorAvatar = ref('');
const license = ref('');
const previewUrl = ref('');
const previewType = ref('');
const mimeType = ref('');

const fetchContent = async () => {
  try {
    loading.value = true;
    const content = await contentStore.getContentById(props.contentId);
    
    if (content) {
      title.value = content.title;
      description.value = content.description;
      creator.value = content.creator;
      creatorAvatar.value = content.creatorAvatar || '/img/default-avatar.png';
      license.value = content.license;
      previewUrl.value = content.preview;
      previewType.value = content.type;
      mimeType.value = content.mimeType || '';
    }
  } catch (error) {
    console.error('Failed to load content:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchContent();
});
</script>

<style scoped>
.stream-card {
  border-radius: var(--border-radius, 8px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  background-color: white;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stream-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.card-content {
  padding: 1.5rem;
  padding-bottom: 1rem;
}

.title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--primary-color);
}

.description {
  margin-top: 0.5rem;
  color: var(--text-color);
  font-size: 0.9rem;
  line-height: 1.5;
}

.preview {
  width: 100%;
  height: 200px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.preview-image,
.preview-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.loading-indicator {
  width: 100%;
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  color: #666;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-top: 1px solid #f0f0f0;
}

.creator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.creator-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}
</style>
