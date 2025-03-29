<template>
    <div class="seasonal-status-card" :class="seasonClass">
        <div class="season-banner">
            <div class="season-icon">{{ seasonEmoji }}</div>
            <div class="season-info">
                <h3>{{ seasonName }}</h3>
                <div class="season-progression">
                    <div class="progress-bar">
                        <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
                    </div>
                    <div class="progress-text">{{ formatTimeRemaining }}</div>
                </div>
            </div>
        </div>

        <div class="realm-influences">
            <h4>Realm Influences</h4>
            <div class="influence-bars">
                <div v-for="(realm, index) in realms" :key="realm" class="influence-item">
                    <div class="realm-name">{{ capitalizeRealm(realm) }}</div>
                    <div class="influence-bar">
                        <div class="influence-fill" :class="`realm-${realm.toLowerCase()}`"
                            :style="{ width: `${getInfluencePercent(realm)}%` }">
                        </div>
                    </div>
                    <div class="influence-value">{{ getInfluenceValue(realm) }}</div>
                </div>
            </div>
        </div>

        <div class="seasonal-bonuses">
            <h4>Seasonal Bonuses</h4>
            <div class="bonuses-grid">
                <div class="bonus-item">
                    <div class="bonus-icon">✨</div>
                    <div class="bonus-details">
                        <div class="bonus-name">Token Minting</div>
                        <div class="bonus-value">+{{ getBonus('tokenMinting') }}%</div>
                    </div>
                </div>
                <div class="bonus-item">
                    <div class="bonus-icon">🌿</div>
                    <div class="bonus-details">
                        <div class="bonus-name">Essence Harvest</div>
                        <div class="bonus-value">+{{ getBonus('essenceHarvest') }}%</div>
                    </div>
                </div>
                <div class="bonus-item">
                    <div class="bonus-icon">🎯</div>
                    <div class="bonus-details">
                        <div class="bonus-name">Quest Rewards</div>
                        <div class="bonus-value">+{{ getBonus('questRewards') }}%</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="relaunch-section" v-if="faeStore.isRelaunchAvailable">
            <div class="relaunch-alert">
                <div class="alert-icon">🌙</div>
                <div class="alert-text">Seasonal Relaunch Available!</div>
            </div>
            <button class="relaunch-button" @click="$emit('relaunch')" :disabled="faeStore.relaunchInProgress">
                <span v-if="!faeStore.relaunchInProgress">Begin Seasonal Migration</span>
                <span v-else>Migration in Progress...</span>
            </button>
        </div>

        <div class="relaunch-countdown" v-else>
            <div class="countdown-label">Next relaunch available in:</div>
            <div class="countdown-timer">{{ formatRelaunchCountdown }}</div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { FaeRealm, SeasonalCycle } from '../../utils/fae-ecosystem';
import { useFaeStore } from '../../stores/fae';

const faeStore = useFaeStore();

const seasonEmoji = computed(() => {
    switch (faeStore.currentSeason) {
        case SeasonalCycle.Spring: return '🌱';
        case SeasonalCycle.Summer: return '☀️';
        case SeasonalCycle.Autumn: return '🍂';
        case SeasonalCycle.Winter: return '❄️';
        default: return '✨';
    }
});

const seasonName = computed(() => {
    if (!faeStore.currentSeason) return 'Unknown Season';

    return `${faeStore.currentSeason.charAt(0).toUpperCase()}${faeStore.currentSeason.slice(1)} Realm`;
});

const seasonClass = computed(() => {
    return `season-${faeStore.currentSeason?.toLowerCase() || 'unknown'}`;
});

const progressPercent = computed(() => {
    return Math.min(100, faeStore.seasonProgress * 100);
});

const formatTimeRemaining = computed(() => {
    const timeRemaining = faeStore.seasonTimeRemaining;
    const days = Math.floor(timeRemaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((timeRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    return `${days}d ${hours}h remaining`;
});

const formatRelaunchCountdown = computed(() => {
    // Simplified - in real app would calculate based on required progress
    const timeRemaining = faeStore.seasonTimeRemaining;
    const days = Math.floor(timeRemaining / (24 * 60 * 60 * 1000));

    return `${Math.max(0, 90 - (90 - days))} days`;
});

const realms = computed(() => Object.values(FaeRealm));

function getInfluencePercent(realm: FaeRealm): number {
    if (!faeStore.ecosystemStatus?.realmInfluence) return 50;

    const influence = faeStore.ecosystemStatus.realmInfluence.get(realm) || 1.0;
    return Math.round(influence * 50); // Scale to percentage for UI
}

function getInfluenceValue(realm: FaeRealm): string {
    if (!faeStore.ecosystemStatus?.realmInfluence) return '1.0x';

    const influence = faeStore.ecosystemStatus.realmInfluence.get(realm) || 1.0;
    return `${influence.toFixed(1)}x`;
}

function getBonus(type: string): string {
    if (!faeStore.ecosystemStatus?.seasonalBonuses) return '0';

    const bonus = faeStore.ecosystemStatus.seasonalBonuses[type as keyof typeof faeStore.ecosystemStatus.seasonalBonuses] || 1.0;
    // Convert to percentage increase
    return ((bonus - 1.0) * 100).toFixed(0);
}

function capitalizeRealm(realm: string): string {
    return realm.charAt(0).toUpperCase() + realm.slice(1);
}

defineEmits(['relaunch']);
</script>

<style scoped>
.seasonal-status-card {
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    background-color: #fff;
    position: relative;
    overflow: hidden;
}

.season-banner {
    display: flex;
    align-items: center;
    margin-bottom: 1rem;
}

.season-icon {
    font-size: 2.5rem;
    margin-right: 1rem;
}

.season-info {
    flex: 1;
}

.season-info h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
}

.season-progression {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.progress-bar {
    height: 8px;
    background-color: #f0f0f0;
    border-radius: 4px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    border-radius: 4px;
    background: linear-gradient(90deg, #4facfe, #00f2fe);
}

.progress-text {
    font-size: 0.8rem;
    color: #666;
}

.realm-influences {
    margin-bottom: 1.5rem;
}

.realm-influences h4,
.seasonal-bonuses h4 {
    font-size: 1rem;
    margin-bottom: 0.75rem;
    color: #333;
}

.influence-bars {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.influence-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.realm-name {
    width: 80px;
    font-size: 0.9rem;
}

.influence-bar {
    flex: 1;
    height: 8px;
    background-color: #f0f0f0;
    border-radius: 4px;
    overflow: hidden;
}

.influence-fill {
    height: 100%;
    border-radius: 4px;
}

.realm-seelie {
    background: linear-gradient(90deg, #ffd700, #ffffe0);
}

.realm-unseelie {
    background: linear-gradient(90deg, #483d8b, #9370db);
}

.realm-wyldwood {
    background: linear-gradient(90deg, #228b22, #7cfc00);
}

.realm-twilight {
    background: linear-gradient(90deg, #8a2be2, #da70d6);
}

.influence-value {
    width: 40px;
    text-align: right;
    font-size: 0.9rem;
    font-weight: 500;
}

.seasonal-bonuses {
    margin-bottom: 1.5rem;
}

.bonuses-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 1rem;
}

.bonus-item {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    padding: 0.75rem;
    background-color: #f9fafb;
    border-radius: 8px;
}

.bonus-icon {
    font-size: 1.25rem;
}

.bonus-name {
    font-size: 0.8rem;
    color: #666;
}

.bonus-value {
    font-size: 0.9rem;
    font-weight: 600;
    color: #10b981;
}

.relaunch-section {
    margin-top: 1.5rem;
    text-align: center;
}

.relaunch-alert {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background-color: #fef3c7;
    border-radius: 8px;
}

.alert-icon {
    font-size: 1.25rem;
}

.alert-text {
    font-size: 1rem;
    font-weight: 600;
    color: #92400e;
}

.relaunch-button {
    width: 100%;
    padding: 0.75rem;
    border: none;
    border-radius: 8px;
    background-color: #8b5cf6;
    color: white;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
}

.relaunch-button:hover:not(:disabled) {
    background-color: #7c3aed;
}

.relaunch-button:disabled {
    background-color: #c4b5fd;
    cursor: not-allowed;
}

.relaunch-countdown {
    margin-top: 1.5rem;
    text-align: center;
}

.countdown-label {
    font-size: 0.9rem;
    color: #666;
}

.countdown-timer {
    font-size: 1.25rem;
    font-weight: 600;
    color: #4b5563;
}

.season-spring {
    border-top: 5px solid #4ade80;
}

.season-summer {
    border-top: 5px solid #fbbf24;
}

.season-autumn {
    border-top: 5px solid #fb923c;
}

.season-winter {
    border-top: 5px solid #93c5fd;
}

@media (max-width: 768px) {
    .bonuses-grid {
        grid-template-columns: 1fr;
    }
}
</style>
