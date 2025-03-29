<template>
    <div class="transcendental-dj-view">
        <header class="transcendental-header">
            <div class="header-content">
                <h1>Transcendental EDM.DJ</h1>
                <p class="subtitle">Immersive web3-powered audio-visual experiences</p>
            </div>
            <div class="header-visuals">
                <div class="waveform-visualization"></div>
            </div>
        </header>

        <section class="featured-session" v-if="featuredDj">
            <div class="featured-session-content">
                <h2>Featured Session</h2>
                <DjSessionVisualization :djId="featuredDj.id" :sessionData="featuredDj.latestSession"
                    :autoplay="false" />
            </div>
        </section>

        <section class="dj-browse-section">
            <div class="section-header">
                <h2>Explore Transcendental DJs</h2>
                <div class="filter-controls">
                    <select v-model="selectedGenre" class="genre-filter">
                        <option value="">All Genres</option>
                        <option v-for="genre in genres" :key="genre" :value="genre">{{ genre }}</option>
                    </select>

                    <div class="view-toggle">
                        <button class="toggle-btn" :class="{ active: viewMode === 'grid' }" @click="viewMode = 'grid'">
                            <i class="fas fa-th-large"></i>
                        </button>
                        <button class="toggle-btn" :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'">
                            <i class="fas fa-list"></i>
                        </button>
                    </div>
                </div>
            </div>

            <div class="dj-list" :class="viewMode">
                <TranscendentalDjCard v-for="dj in filteredDjs" :key="dj.id" :djData="dj" :viewMode="viewMode"
                    @click="viewDjProfile(dj.id)" />
            </div>

            <div class="load-more" v-if="hasMoreDjs">
                <button @click="loadMoreDjs" :disabled="loading">
                    <span v-if="!loading">Load More</span>
                    <span v-else><i class="fas fa-spinner fa-spin"></i> Loading...</span>
                </button>
            </div>
        </section>

        <section class="live-now-section" v-if="liveDjs.length > 0">
            <h2>Live Now <span class="pulse-dot"></span></h2>
            <div class="live-djs">
                <TranscendentalDjCard v-for="dj in liveDjs" :key="dj.id" :djData="dj" viewMode="compact" :isLive="true"
                    @click="joinLiveSession(dj.id)" />
            </div>
        </section>

        <section class="upcoming-events">
            <h2>Upcoming Transcendental Sessions</h2>
            <div class="events-timeline">
                <div v-for="event in upcomingEvents" :key="event.id" class="event-card">
                    <div class="event-date">
                        <div class="day">{{ formatEventDay(event.startTime) }}</div>
                        <div class="month">{{ formatEventMonth(event.startTime) }}</div>
                    </div>
                    <div class="event-details">
                        <h3>{{ event.title }}</h3>
                        <p class="dj-name">{{ event.djName }}</p>
                        <p class="event-time">{{ formatEventTime(event.startTime) }}</p>
                        <div class="event-tags">
                            <span v-for="(tag, i) in event.tags" :key="i" class="event-tag">{{ tag }}</span>
                        </div>
                    </div>
                    <button class="remind-btn" @click="setReminder(event.id)">
                        <i class="fas fa-bell"></i> Remind Me
                    </button>
                </div>
            </div>
        </section>

        <section class="token-integration">
            <h2>EDM.DJ Token Ecosystem</h2>
            <div class="token-info">
                <div class="token-card">
                    <div class="token-icon">
                        <i class="fas fa-ticket-alt"></i>
                    </div>
                    <h3>Access Tokens</h3>
                    <p>Unlock exclusive transcendental DJ sessions with access tokens</p>
                    <button class="token-action-btn">View Available Sessions</button>
                </div>
                <div class="token-card">
                    <div class="token-icon">
                        <i class="fas fa-crown"></i>
                    </div>
                    <h3>Creator Support</h3>
                    <p>Support your favorite DJs by staking tokens to their profiles</p>
                    <button class="token-action-btn">Explore DJ Staking</button>
                </div>
                <div class="token-card">
                    <div class="token-icon">
                        <i class="fas fa-palette"></i>
                    </div>
                    <h3>Visual NFTs</h3>
                    <p>Collect unique visual elements from immersive DJ sessions</p>
                    <button class="token-action-btn">Browse Visual NFTs</button>
                </div>
            </div>
        </section>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import TranscendentalDjCard from '@/components/music/TranscendentalDjCard.vue';
import DjSessionVisualization from '@/components/music/DjSessionVisualization.vue';
import { fetchDjs, fetchLiveDjs, fetchUpcomingEvents } from '@/services/MusicStreamingService';

const router = useRouter();

// State
const djs = ref([]);
const liveDjs = ref([]);
const upcomingEvents = ref([]);
const featuredDj = ref(null);
const loading = ref(false);
const hasMoreDjs = ref(true);
const viewMode = ref('grid');
const selectedGenre = ref('');
const page = ref(1);

// Available genres
const genres = ['Psy-Trance', 'Deep House', 'Progressive', 'Techno', 'Ambient', 'Goa', 'Melodic Techno'];

// Computed
const filteredDjs = computed(() => {
    if (!selectedGenre.value) return djs.value;
    return djs.value.filter(dj => dj.genres.includes(selectedGenre.value));
});

// Methods
const loadDjs = async () => {
    if (loading.value) return;

    loading.value = true;
    try {
        const result = await fetchDjs({ page: page.value, limit: 12 });
        djs.value = [...djs.value, ...result.djs];
        hasMoreDjs.value = result.hasMore;

        if (page.value === 1 && result.featured) {
            featuredDj.value = result.featured;
        }
    } catch (error) {
        console.error('Failed to load DJs:', error);
    } finally {
        loading.value = false;
    }
};

const loadMoreDjs = async () => {
    page.value++;
    await loadDjs();
};

const loadLiveDjs = async () => {
    try {
        const result = await fetchLiveDjs();
        liveDjs.value = result;
    } catch (error) {
        console.error('Failed to load live DJs:', error);
    }
};

const loadUpcomingEvents = async () => {
    try {
        const result = await fetchUpcomingEvents();
        upcomingEvents.value = result;
    } catch (error) {
        console.error('Failed to load upcoming events:', error);
    }
};

const viewDjProfile = (djId) => {
    router.push(`/dj/${djId}`);
};

const joinLiveSession = (djId) => {
    router.push(`/dj/${djId}/live`);
};

const setReminder = (eventId) => {
    // This would integrate with the notification system
    alert(`Reminder set for event ${eventId}`);
};

// Date formatting
const formatEventDay = (dateString) => {
    return new Date(dateString).getDate();
};

const formatEventMonth = (dateString) => {
    return new Date(dateString).toLocaleString('default', { month: 'short' });
};

const formatEventTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit' });
};

// Lifecycle
onMounted(() => {
    loadDjs();
    loadLiveDjs();
    loadUpcomingEvents();

    // Set up waveform visualization
    initWaveformVisualization();
});

// Visualization
const initWaveformVisualization = () => {
    // Simple visualization initialization
    // In a real implementation, this would use Web Audio API
    const container = document.querySelector('.waveform-visualization');
    if (!container) return;

    for (let i = 0; i < 50; i++) {
        const bar = document.createElement('div');
        bar.className = 'wave-bar';
        bar.style.height = `${Math.random() * 80 + 20}%`;
        bar.style.animationDelay = `${Math.random() * 2}s`;
        container.appendChild(bar);
    }
};
</script>

<style scoped>
.transcendental-dj-view {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    color: var(--text-color);
}

.transcendental-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 40px;
    overflow: hidden;
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(139, 69, 19, 0.8), rgba(210, 180, 140, 0.7));
    padding: 40px;
    position: relative;
}

.transcendental-header::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('/images/transcendental-bg.jpg') center center;
    background-size: cover;
    opacity: 0.15;
    z-index: -1;
}

.header-content {
    z-index: 1;
}

.transcendental-header h1 {
    font-family: var(--heading-font);
    font-size: 2.5rem;
    margin: 0 0 10px 0;
    color: white;
    text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.5);
}

.subtitle {
    font-size: 1.2rem;
    color: rgba(255, 255, 255, 0.8);
    margin: 0;
    max-width: 400px;
}

.header-visuals {
    width: 300px;
    height: 120px;
    position: relative;
}

.waveform-visualization {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.wave-bar {
    width: 3px;
    background-color: rgba(255, 255, 255, 0.7);
    border-radius: 1px;
    animation: wave 1.5s ease-in-out infinite;
}

@keyframes wave {

    0%,
    100% {
        height: 20%;
    }

    50% {
        height: 80%;
    }
}

.featured-session {
    margin-bottom: 40px;
    background-color: rgba(139, 69, 19, 0.05);
    border-radius: 12px;
    padding: 20px;
}

.featured-session h2 {
    font-family: var(--heading-font);
    font-size: 1.5rem;
    margin-top: 0;
    color: var(--primary-color);
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.section-header h2 {
    font-family: var(--heading-font);
    font-size: 1.5rem;
    margin: 0;
    color: var(--primary-color);
}

.filter-controls {
    display: flex;
    gap: 15px;
    align-items: center;
}

.genre-filter {
    padding: 8px 12px;
    border: 1px solid var(--border-color);
    border-radius: 20px;
    background-color: white;
    font-size: 0.9rem;
    color: var(--text-color);
}

.view-toggle {
    display: flex;
    background-color: rgba(139, 69, 19, 0.1);
    border-radius: 20px;
    overflow: hidden;
}

.toggle-btn {
    background: none;
    border: none;
    padding: 8px 12px;
    cursor: pointer;
    color: var(--light-text-color);
}

.toggle-btn.active {
    background-color: var(--primary-color);
    color: white;
}

.dj-list {
    display: grid;
    gap: 20px;
    margin-bottom: 30px;
}

.dj-list.grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

.dj-list.list {
    grid-template-columns: 1fr;
}

.load-more {
    text-align: center;
    margin-top: 20px;
    margin-bottom: 40px;
}

.load-more button {
    background-color: transparent;
    border: 1px solid var(--primary-color);
    color: var(--primary-color);
    padding: 10px 20px;
    border-radius: 20px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
}

.load-more button:hover:not(:disabled) {
    background-color: var(--primary-color);
    color: white;
}

.load-more button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.live-now-section {
    margin-bottom: 40px;
}

.live-now-section h2 {
    font-family: var(--heading-font);
    font-size: 1.5rem;
    margin-top: 0;
    color: var(--primary-color);
    display: flex;
    align-items: center;
    gap: 10px;
}

.pulse-dot {
    width: 12px;
    height: 12px;
    background-color: #e74c3c;
    border-radius: 50%;
    display: inline-block;
    animation: pulse 1.5s infinite;
}

@keyframes pulse {
    0% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.7);
    }

    70% {
        transform: scale(1);
        box-shadow: 0 0 0 10px rgba(231, 76, 60, 0);
    }

    100% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(231, 76, 60, 0);
    }
}

.live-djs {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 15px;
}

.upcoming-events {
    margin-bottom: 40px;
}

.upcoming-events h2 {
    font-family: var(--heading-font);
    font-size: 1.5rem;
    margin-top: 0;
    color: var(--primary-color);
}

.events-timeline {
    display: grid;
    gap: 15px;
}

.event-card {
    display: flex;
    background-color: white;
    border-radius: 10px;
    padding: 15px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    border: 1px solid var(--border-color);
}

.event-date {
    width: 60px;
    height: 60px;
    background-color: var(--primary-color);
    color: white;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    margin-right: 15px;
    flex-shrink: 0;
}

.day {
    font-size: 1.4rem;
}

.month {
    font-size: 0.8rem;
    text-transform: uppercase;
}

.event-details {
    flex-grow: 1;
}

.event-details h3 {
    margin: 0 0 5px 0;
    font-size: 1.1rem;
}

.dj-name {
    margin: 0 0 5px 0;
    font-size: 0.9rem;
    color: var(--light-text-color);
}

.event-time {
    margin: 0 0 8px 0;
    font-size: 0.9rem;
}

.event-tags {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
}

.event-tag {
    background-color: rgba(139, 69, 19, 0.1);
    color: var(--primary-color);
    padding: 3px 8px;
    border-radius: 10px;
    font-size: 0.7rem;
}

.remind-btn {
    background: none;
    border: 1px solid var(--primary-color);
    color: var(--primary-color);
    border-radius: 20px;
    padding: 8px 15px;
    font-size: 0.8rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
    align-self: center;
    white-space: nowrap;
}

.remind-btn:hover {
    background-color: var(--primary-color);
    color: white;
}

.token-integration {
    margin-bottom: 40px;
}

.token-integration h2 {
    font-family: var(--heading-font);
    font-size: 1.5rem;
    margin-top: 0;
    color: var(--primary-color);
}

.token-info {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
}

.token-card {
    background-color: white;
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    border: 1px solid var(--border-color);
    text-align: center;
}

.token-icon {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background-color: rgba(139, 69, 19, 0.1);
    color: var(--primary-color);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    margin: 0 auto 15px;
}

.token-card h3 {
    margin: 0 0 10px 0;
    color: var(--primary-color);
}

.token-card p {
    margin: 0 0 15px 0;
    color: var(--light-text-color);
    font-size: 0.9rem;
}

.token-action-btn {
    background-color: var(--primary-color);
    color: white;
    border: none;
    padding: 8px 15px;
    border-radius: 20px;
    cursor: pointer;
    font-size: 0.9rem;
}

.token-action-btn:hover {
    background-color: #6B4226;
}

@media (max-width: 768px) {
    .transcendental-header {
        flex-direction: column;
        padding: 30px 20px;
    }

    .header-content {
        margin-bottom: 20px;
    }

    .header-visuals {
        width: 100%;
    }

    .section-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 15px;
    }

    .filter-controls {
        width: 100%;
        justify-content: space-between;
    }

    .genre-filter {
        flex-grow: 1;
    }

    .event-card {
        flex-direction: column;
        align-items: flex-start;
    }

    .event-date {
        margin-bottom: 10px;
    }

    .remind-btn {
        align-self: flex-start;
        margin-top: 10px;
    }
}
</style>
