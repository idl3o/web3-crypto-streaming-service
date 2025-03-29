<template>
    <div class="migration-result" v-if="result">
        <div class="result-header">
            <div class="season-icon">{{ seasonEmoji }}</div>
            <div class="header-content">
                <h3>Migration Complete</h3>
                <p>Welcome to the {{ result.season }} season!</p>
            </div>
            <button class="close-button" @click="$emit('close')">&times;</button>
        </div>

        <div class="result-summary">
            <div class="summary-item">
                <span class="summary-label">Tokens Migrated:</span>
                <span class="summary-value">{{ result.migratedTokens.length }}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Essence Bonus:</span>
                <span class="summary-value">+{{ result.essenceBonus.toFixed(2) }}</span>
            </div>
        </div>

        <div class="migration-details" v-if="result.migratedTokens.length > 0">
            <h4>Migrated Tokens</h4>
            <div class="token-migrations">
                <div class="migration-item" v-for="(token, index) in result.migratedTokens" :key="index">
                    <div class="token-name">Token #{{ tokenShortId(token.id) }}</div>
                    <div class="migration-path">
                        <div class="realm-badge" :class="`realm-${lastMigration(token).fromRealm}`">
                            {{ capitalizeRealm(lastMigration(token).fromRealm) }}
                        </div>
                        <div class="arrow">→</div>
                        <div class="realm-badge" :class="`realm-${lastMigration(token).toRealm}`">
                            {{ capitalizeRealm(lastMigration(token).toRealm) }}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="migration-message">
            <p>
                Your tokens have migrated to realms better suited for this season.
                Harvest essence and complete quests to take advantage of the new seasonal bonuses!
            </p>
        </div>

        <div class="action-buttons">
            <button class="primary-button" @click="$emit('close')">
                Explore {{ result.season }} Realm
            </button>
        </div>
    </div>
    <div class="fae-migration-result">
        <h3>Fae Migration Result</h3>
        <p>This is a Fae Migration Result component.</p>
    </div>
</template>

<script setup lang="ts">
import { computed, PropType } from 'vue';
import { FaeToken, SeasonalCycle } from '../../utils/fae-ecosystem';

const props = defineProps({
    result: {
        type: Object as PropType<{
            season: SeasonalCycle;
            migratedTokens: FaeToken[];
            essenceBonus: number;
        }>,
        required: true
    }
});

defineEmits(['close']);

const seasonEmoji = computed(() => {
    switch (props.result?.season) {
        case SeasonalCycle.Spring: return '🌱';
        case SeasonalCycle.Summer: return '☀️';
        case SeasonalCycle.Autumn: return '🍂';
        case SeasonalCycle.Winter: return '❄️';
        default: return '✨';
    }
});

function tokenShortId(id: string): string {
    return id.substring(0, 4);
}

function lastMigration(token: FaeToken) {
    return token.migrations[token.migrations.length - 1];
}

function capitalizeRealm(realm: string): string {
    return realm.charAt(0).toUpperCase() + realm.slice(1);
}
</script>

<style scoped>
.migration-result {
    background-color: white;
    border-radius: 12px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
    overflow: hidden;
}

.result-header {
    display: flex;
    align-items: center;
    padding: 1.5rem;
    background-color: #f9fafb;
}

.season-icon {
    font-size: 2.5rem;
    margin-right: 1rem;
}

.header-content {
    flex: 1;
}

.header-content h3 {
    margin: 0;
    font-size: 1.5rem;
}

.header-content p {
    margin: 0.25rem 0 0 0;
    color: #4b5563;
    font-size: 1rem;
}

.close-button {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #9ca3af;
    transition: color 0.2s ease;
}

.close-button:hover {
    color: #4b5563;
}

.result-summary {
    display: flex;
    padding: 1.5rem;
    background-color: #f3f4f6;
    border-bottom: 1px solid #e5e7eb;
    gap: 2rem;
}

.summary-item {
    display: flex;
    flex-direction: column;
}

.summary-label {
    font-size: 0.9rem;
    color: #6b7280;
}

.summary-value {
    font-size: 1.5rem;
    font-weight: 600;
    color: #111827;
}

.migration-details {
    padding: 1.5rem;
}

.migration-details h4 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    color: #4b5563;
}

.token-migrations {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: 200px;
    overflow-y: auto;
}

.migration-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background-color: #f9fafb;
    border-radius: 8px;
}

.token-name {
    font-size: 0.9rem;
    font-weight: 500;
    color: #4b5563;
}

.migration-path {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.realm-badge {
    font-size: 0.8rem;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    color: white;
    font-weight: 500;
}

.realm-seelie {
    background-color: #fbbf24;
}

.realm-unseelie {
    background-color: #8b5cf6;
}

.realm-wyldwood {
    background-color: #10b981;
}

.realm-twilight {
    background-color: #ec4899;
}

.arrow {
    color: #9ca3af;
}

.migration-message {
    padding: 0 1.5rem;
    color: #4b5563;
    font-size: 0.9rem;
    line-height: 1.5;
}

.action-buttons {
    padding: 1.5rem;
    display: flex;
    justify-content: center;
}

.primary-button {
    padding: 0.75rem 1.5rem;
    background-color: #8b5cf6;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease;
}

.primary-button:hover {
    background-color: #7c3aed;
}

.fae-migration-result {
    border: 1px solid #ccc;
    padding: 10px;
    margin-bottom: 10px;
}
</style>
