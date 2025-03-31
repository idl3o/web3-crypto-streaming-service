<template>
  <div class="youtube-player">
    <div v-if="!loaded && showThumbnail" class="youtube-thumbnail" @click="loadVideo">
      <img :src="thumbnailUrl" alt="Video thumbnail">
      <div class="play-button">
        <svg viewBox="0 0 24 24" width="64" height="64">
          <path fill="#fff" d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>
    <div v-if="loaded || !showThumbnail" class="youtube-frame-container" :style="{ paddingBottom: aspectRatioPadding }">
      <iframe 
        v-if="loaded || !showThumbnail"
        class="youtube-iframe"
        :src="embedUrl" 
        :title="title"
        frameborder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
        allowfullscreen>
      </iframe>
    </div>
    <div v-if="showTitle" class="youtube-title">
      {{ title }}
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'YoutubePlayer',
  props: {
    videoId: {
      type: String,
      required: true
    },
    title: {
      type: String,
      default: 'YouTube Video'
    },
    autoplay: {
      type: Boolean,
      default: false
    },
    showControls: {
      type: Boolean,
      default: true
    },
    showTitle: {
      type: Boolean,
      default: true
    },
    showThumbnail: {
      type: Boolean,
      default: true
    },
    aspectRatio: {
      type: String,
      default: '16:9',
      validator: (value: string) => /^\d+:\d+$/.test(value)
    }
  },
  data() {
    return {
      loaded: false
    };
  },
  computed: {
    embedUrl(): string {
      const params = new URLSearchParams({
        rel: '0',
        controls: this.showControls ? '1' : '0',
        autoplay: (!this.showThumbnail || this.loaded) && this.autoplay ? '1' : '0'
      });
      
      return `https://www.youtube.com/embed/${this.videoId}?${params.toString()}`;
    },
    thumbnailUrl(): string {
      // YouTube provides multiple thumbnail sizes, maxresdefault is highest quality
      return `https://img.youtube.com/vi/${this.videoId}/maxresdefault.jpg`;
    },
    aspectRatioPadding(): string {
      const [width, height] = this.aspectRatio.split(':').map(Number);
      return `${(height / width) * 100}%`;
    }
  },
  methods: {
    loadVideo() {
      this.loaded = true;
      this.$emit('video-loaded');
    }
  },
  mounted() {
    if (!this.showThumbnail || this.autoplay) {
      this.loadVideo();
    }
  }
}
</script>

<style scoped>
.youtube-player {
  max-width: 100%;
  margin-bottom: 20px;
}

.youtube-frame-container {
  position: relative;
  width: 100%;
  background-color: #000;
  overflow: hidden;
  border-radius: 8px;
}

.youtube-iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 8px;
}

.youtube-thumbnail {
  position: relative;
  cursor: pointer;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  background-color: #000;
}

.youtube-thumbnail img {
  width: 100%;
  display: block;
  transition: opacity 0.3s ease;
}

.youtube-thumbnail:hover img {
  opacity: 0.7;
}

.play-button {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 64px;
  height: 64px;
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease, background-color 0.3s ease;
}

.youtube-thumbnail:hover .play-button {
  background-color: var(--primary-color, #6c5ce7);
  transform: translate(-50%, -50%) scale(1.1);
}

.youtube-title {
  margin-top: 10px;
  font-weight: 500;
  color: var(--text-color, #333);
}
</style>
