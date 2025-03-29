<template>
    <div class="dj-card" :class="[theme, viewMode, { 'is-live': isLive }]" @click="$emit('click')">
        <!-- Live indicator -->
        <div class="live-indicator" v-if="isLive">
            <span class="live-dot"></span>
            Live Now
        </div>

        <!-- DJ Image -->
        <div class="dj-image">
            <img v-if="djData.profileImage" :src="djData.profileImage" :alt="djData.name">
            <div v-else class="image-placeholder">
                <i class="fas fa-headphones"></i>
            </div>

            <!-- Popularity badge -->
            <div class="popularity-badge" v-if="showPopularity && djData.popularity">
                <i class="fas fa-fire"></i>
                {{ formatPopularity(djData.popularity) }}
            </div>
        </div>

        <!-- DJ Info -->
        <div class="dj-info">
            <h3 class="dj-name">{{ djData.name }}</h3>

            <div class="dj-genres" v-if="djData.genres && djData.genres.length > 0">
                <span v-for="(genre, index) in displayGenres" :key="index" class="genre-tag">
                    {{ genre }}
                </span>
                <span v-if="hasMoreGenres" class="more-genres">+{{ djData.genres.length - maxGenres }}</span>
            </div>

            <div class="dj-stats" v-if="viewMode !== 'compact'">
                <div class="stat">
                    <i class="fas fa-users"></i> {{ formatNumber(djData.followers) }}
                </div>
                <div class="stat">
                    <i class="fas fa-play"></i> {{ formatNumber(djData.playCount) }}
                </div>
                <div class="stat" v-if="djData.rating">
                    <i class="fas fa-star"></i> {{ djData.rating.toFixed(1) }}
                </div>
            </div>

            <p class="dj-bio" v-if="viewMode === 'list' && djData.bio">
                {{ truncateBio(djData.bio) }}
            </p>

            <!-- Featured session info (list view only) -->
            <div class="featured-session" v-if="viewMode === 'list' && djData.latestSession">
                <div class="session-title">
                    <i class="fas fa-music"></i> Latest: {{ djData.latestSession.title }}
                </div>
                <div class="session-date">{{ formatDate(djData.latestSession.date) }}</div>
            </div>
        </div>

        <!-- Actions (list view only) -->
        <div class="dj-actions" v-if="viewMode === 'list'">
            <button class="action-btn play-btn" @click.stop="$emit('play', djData.id)">
                <i class="fas fa-play"></i>
            </button>
            <button class="action-btn follow-btn" @click.stop="$emit('follow', djData.id)">
                <i class="fas fa-user-plus"></i>
            </button>
        </div>

        <!-- Token support (grid view only) -->
        <div class="token-support" v-if="viewMode === 'grid' && showTokenInfo">
            <div class="token-info">
                <div class="token-icon">
                    <img src="/images/token-icon.png" alt="Token" v-if="false">
                    <i class="fas fa-coin" v-else></i>
                </div>
                <div class="token-stats">
                    <div class="token-name">{{ djData.tokenSymbol || 'DJTKN' }}</div>
                    <div class="token-value">{{ djData.tokenValue || '$0.00' }}</div>
                </div>
            </div>
            <button class="support-btn" @click.stop="$emit('support', djData.id)">Support</button>
        </div>
    </div>
</template>

<script setup>
import { computed, inject } from 'vue';

const props = defineProps({
    djData: {
        type: Object,
        required: true
    },
    viewMode: {
        type: String,
        default: 'grid',
        validator: value => ['grid', 'list', 'compact'].includes(value)
    },
    isLive: {
        type: Boolean,
        default: false
    },
    showPopularity: {
        type: Boolean,
        default: true
    },
    showTokenInfo: {
        type: Boolean,
        default: true
    },
    maxGenres: {
        type: Number,
        default: 2
    },
    maxBioLength: {
        type: Number,
        default: 120
    }
});

const emit = defineEmits(['click', 'play', 'follow', 'support']);
const theme = inject('currentTheme', 'roman-theme');

// Computed properties
const displayGenres = computed(() => {
    if (!props.djData.genres) return [];
    return props.djData.genres.slice(0, props.maxGenres);
});

const hasMoreGenres = computed(() => {
    return props.djData.genres && props.djData.genres.length > props.maxGenres;
});

// Helper methods
function formatPopularity(popularity) {
    if (popularity > 90) return 'Hot';
    if (popularity > 75) return 'Trending';
    if (popularity > 50) return 'Popular';
    return '';
}

function formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function truncateBio(bio) {
    if (!bio) return '';
    if (bio.length <= props.maxBioLength) return bio;
    return bio.substring(0, props.maxBioLength) + '...';
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}
</script>

<style scoped>
.dj-card {
    background-color: white;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    border: 1px solid var(--border-color);
}

.dj-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

/* Grid Mode */
.dj-card.grid {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.grid .dj-image {
    aspect-ratio: 16 / 9;
    position: relative;
}

.grid .dj-info {
    padding: 15px;
    flex-grow: 1;
}

.grid .token-support {
    padding: 12px 15px;
    border-top: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

/* List Mode */
.dj-card.list {
    display: flex;
    align-items: center;
    padding: 12px;
}

.list .dj-image {
    width: 100px;
    height: 100px;
    flex-shrink: 0;
    border-radius: 8px;
    overflow: hidden;
    position: relative;
}

.list .dj-info {
    flex-grow: 1;
    padding: 0 15px;
}

.list .dj-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-left: auto;
}

/* Compact Mode */
.dj-card.compact {
    display: flex;
    flex-direction: column;
    max-width: 180px;
    text-align: center;
}

.compact .dj-image {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    overflow: hidden;
    margin: 15px auto 10px;
    position: relative;
}

.compact .dj-info {
    padding: 0 10px 15px;
}

.compact .dj-name {
    font-size: 1rem;
}

.dj-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.image-placeholder {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, var(--secondary-color), var(--primary-color));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    color: white;
}

.dj-name {
    margin: 0 0 8px 0;
    font-size: 1.1rem;
    color: var(--text-color);
}

.dj-genres {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
}

.genre-tag {
    background-color: rgba(139, 69, 19, 0.1);
    color: var(--primary-color);
    font-size: 0.7rem;
    padding: 3px 8px;
    border-radius: 12px;
}

.more-genres {
    font-size: 0.7rem;
    color: var(--light-text-color);
}

.dj-stats {
    display: flex;
    gap: 12px;
    font-size: 0.8rem;
    color: var(--light-text-color);
}

.stat {
    display: flex;
    align-items: center;
    gap: 4px;
}

.dj-bio {
    margin: 10px 0;
    font-size: 0.9rem;
    color: var(--light-text-color);
    line-height: 1.4;
}

.featured-session {
    margin-top: 10px;
    font-size: 0.85rem;
}

.session-title {
    color: var(--primary-color);
    margin-bottom: 3px;
}

.session-date {
    color: var(--light-text-color);
}

.action-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.play-btn {
    background-color: var(--primary-color);
    color: white;
}

.follow-btn {
    background-color: rgba(139, 69, 19, 0.1);
    color: var(--primary-color);
}

.token-info {
    display: flex;
    align-items: center;
    gap: 8px;
}

.token-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background-color: #FFD700;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
}

.token-name {
    font-size: 0.7rem;
    color: var(--light-text-color);
}

.token-value {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-color);
}

.support-btn {
    background-color: rgba(139, 69, 19, 0.1);
    color: var(--primary-color);
    border: none;
    border-radius: 15px;
    padding: 5px 12px;
    font-size: 0.8rem;
    cursor: pointer;
}

.support-btn:hover {
    background-color: var(--primary-color);
    color: white;
}

.popularity-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    background-color: rgba(0, 0, 0, 0.6);
    color: white;
    padding: 3px 8px;
    border-radius: 12px;
    font-size: 0.7rem;
    display: flex;
    align-items: center;
    gap: 5px;
}

.live-indicator {
    position: absolute;
    top: 10px;
    left: 10px;
    background-color: rgba(231, 76, 60, 0.9);
    color: white;
    padding: 3px 8px;
    border-radius: 12px;
    font-size: 0.7rem;
    display: flex;
    align-items: center;
    gap: 5px;
    z-index: 2;
}

.live-dot {
    width: 8px;
    height: 8px;
    background-color: white;
    border-radius: 50%;
    animation: pulse 1.5s infinite;
}

.is-live .dj-image::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(to top, rgba(231, 76, 60, 0.3), transparent);
    pointer-events: none;
}

@keyframes pulse {
    0% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7);
    }

    70% {
        transform: scale(1);
        box-shadow: 0 0 0 5px rgba(255, 255, 255, 0);
    }

    100% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
    }
}

/* Roman Theme Styling */
.dj-card.roman-theme {
    border: 1px solid var(--border-color);
    box-shadow: 0 2px 8px rgba(139, 69, 19, 0.05);
}

.roman-theme .image-placeholder {
    background: linear-gradient(135deg, #D2B48C, #8B4513);
}

.roman-theme .genre-tag {
    background-color: rgba(139, 69, 19, 0.1);
    color: #8B4513;
}

.roman-theme .play-btn {
    background-color: #8B4513;
}

.roman-theme .follow-btn {
    background-color: rgba(139, 69, 19, 0.1);
    color: #8B4513;
}

.roman-theme .support-btn {
    background-color: rgba(139, 69, 19, 0.1);
    color: #8B4513;
}

.roman-theme .support-btn:hover {
    background-color: #8B4513;
    color: white;
}
</style>
