<template>
    <div class="repository-card" :class="[theme, healthClass]">
        <div class="card-header">
            <div class="repo-icon">
                <i :class="getTypeIcon()"></i>
            </div>
            <div class="repo-name">{{ repository.metadata.name }}</div>
            <div class="repo-status">
                <div class="status-dot" :class="healthClass" :title="getStatusTooltip()"></div>
            </div>
        </div>

        <div class="card-body">
            <p class="repo-description">
                {{ shortenDescription(repository.metadata.description) }}
            </p>

            <div class="repo-stats">
                <div class="stat-item">
                    <i class="fas fa-layer-group"></i>
                    <span>{{ formatSize(repository.metadata.size) }}</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-file"></i>
                    <span>{{ repository.metadata.contentCount }} items</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-clock"></i>
                    <span>{{ formatDate(repository.metadata.updatedAt) }}</span>
                </div>
            </div>

            <div v-if="repository.status.issues && repository.status.issues.length > 0" class="issues-summary">
                <div class="issue-count">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>{{ repository.status.issues.length }} issue{{ repository.status.issues.length > 1 ? 's' : ''
                    }}</span>
                </div>

                <div v-if="repository.status.issues.length > 0" class="issue-preview">
                    {{ getFirstIssue() }}
                </div>
            </div>

            <div class="fee-metrics">
                <div class="fee-item">
                    <i class="fas fa-coins"></i>
                    <span>Fee Paid: {{ repository.feeMetrics.paid }}</span>
                </div>
                <div class="fee-item">
                    <i class="fas fa-balance-scale"></i>
                    <span>Fee Due: {{ repository.feeMetrics.due }}</span>
                </div>
            </div>
        </div>

        <div class="card-footer">
            <div class="pinned-status">
                <i v-if="repository.isPinned" class="fas fa-thumbtack" title="This repository is pinned"></i>
            </div>

            <div class="card-actions">
                <button @click.stop="$emit('view', repository)" class="action-btn view-btn">
                    <i class="fas fa-eye"></i>
                    <span>View</span>
                </button>
                <button @click.stop="$emit('verify', repository.id)" class="action-btn verify-btn">
                    <i class="fas fa-shield-alt"></i>
                    <span>Verify</span>
                </button>
                <button @click.stop="$emit('toggle-pin', repository)" class="action-btn pin-btn">
                    <i :class="repository.isPinned ? 'fas fa-unlink' : 'fas fa-link'"></i>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, inject } from 'vue';
import { formatRepositorySize } from '@/utils/RepositoryUtils';

const props = defineProps({
    repository: {
        type: Object,
        required: true
    }
});

const emit = defineEmits(['view', 'verify', 'toggle-pin']);
const theme = inject('currentTheme', 'roman-theme');

// Computed
const healthClass = computed(() => {
    return props.repository.status.healthy ? 'healthy' : 'unhealthy';
});

// Methods
function getTypeIcon() {
    switch (props.repository.metadata.type) {
        case 'content':
            return 'fas fa-file-alt';
        case 'metadata':
            return 'fas fa-database';
        case 'archive':
            return 'fas fa-archive';
        case 'program':
            return 'fas fa-code';
        case 'config':
            return 'fas fa-cog';
        default:
            return 'fas fa-folder';
    }
}

function getStatusTooltip() {
    if (props.repository.status.healthy) {
        return 'Repository is healthy';
    }

    return `Repository has ${props.repository.status.issues.length} issue(s)`;
}

function shortenDescription(description) {
    if (!description) return 'No description provided';

    return description.length > 100 ?
        description.substring(0, 100) + '...' :
        description;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    // If less than a day, show relative time
    if (diff < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diff / (60 * 60 * 1000));
        if (hours < 1) {
            const minutes = Math.floor(diff / (60 * 1000));
            return minutes === 0 ? 'Just now' : `${minutes}m ago`;
        }
        return `${hours}h ago`;
    }

    // If less than a month, show days ago
    if (diff < 30 * 24 * 60 * 60 * 1000) {
        const days = Math.floor(diff / (24 * 60 * 60 * 1000));
        return `${days}d ago`;
    }

    // Otherwise show the date
    return date.toLocaleDateString();
}

function formatSize(bytes) {
    return formatRepositorySize(bytes);
}

function getFirstIssue() {
    if (!props.repository.status.issues || props.repository.status.issues.length === 0) {
        return '';
    }

    const issue = props.repository.status.issues[0];
    return `${issue.type}: ${issue.details.substring(0, 50)}${issue.details.length > 50 ? '...' : ''}`;
}
</script>

<style scoped>
.repository-card {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    overflow: hidden;
}

.repository-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.card-header {
    padding: 16px;
    display: flex;
    align-items: center;
    border-bottom: 1px solid #f0f0f0;
}

.repo-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background-color: #F3F4F6;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 12px;
    color: #4B5563;
}

.repo-name {
    flex: 1;
    font-weight: 500;
    font-size: 16px;
    color: #111827;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.repo-status {
    margin-left: 8px;
}

.status-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
}

.status-dot.healthy {
    background-color: #4CAF50;
}

.status-dot.unhealthy {
    background-color: #F44336;
}

.card-body {
    padding: 16px;
    min-height: 100px;
}

.repo-description {
    margin: 0 0 12px 0;
    color: #4B5563;
    font-size: 14px;
    line-height: 1.4;
    height: 58px;
    overflow: hidden;
}

.repo-stats {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
    flex-wrap: wrap;
}

.stat-item {
    display: flex;
    align-items: center;
    font-size: 12px;
    color: #6B7280;
    margin-right: 8px;
}

.stat-item i {
    margin-right: 4px;
    font-size: 14px;
}

.issues-summary {
    background-color: #FFEBEE;
    border-radius: 4px;
    padding: 8px 12px;
    margin-top: 12px;
}

.issue-count {
    font-weight: 500;
    display: flex;
    align-items: center;
    color: #F44336;
    font-size: 14px;
    margin-bottom: 4px;
}

.issue-count i {
    margin-right: 8px;
}

.issue-preview {
    font-size: 12px;
    color: #D32F2F;
}

.fee-metrics {
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.fee-item {
    display: flex;
    align-items: center;
    font-size: 14px;
    color: #4B5563;
}

.fee-item i {
    margin-right: 8px;
}

.card-footer {
    padding: 12px 16px;
    border-top: 1px solid #f0f0f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.pinned-status i {
    color: #FFC107;
}

.card-actions {
    display: flex;
    gap: 8px;
}

.action-btn {
    padding: 6px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    display: flex;
    align-items: center;
    background-color: transparent;
    transition: background-color 0.2s;
}

.action-btn i {
    margin-right: 4px;
}

.view-btn:hover {
    background-color: #E8F5E9;
    color: #4CAF50;
}

.verify-btn:hover {
    background-color: #E3F2FD;
    color: #2196F3;
}

.pin-btn {
    padding: 6px;
    background-color: #f0f0f0;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.pin-btn:hover {
    background-color: #FFF8E1;
    color: #FFC107;
}

.pin-btn i {
    margin: 0;
}

/* Status borders */
.repository-card.healthy {
    border-left: 4px solid #4CAF50;
}

.repository-card.unhealthy {
    border-left: 4px solid #F44336;
}

/* Roman theme */
.roman-theme .repo-icon {
    background-color: rgba(139, 69, 19, 0.1);
    color: var(--primary-color, #8B4513);
}

.roman-theme .status-dot.healthy {
    background-color: var(--primary-color, #8B4513);
}

.roman-theme .view-btn:hover {
    background-color: rgba(139, 69, 19, 0.1);
    color: var(--primary-color, #8B4513);
}

.roman-theme .repository-card.healthy {
    border-left-color: var(--primary-color, #8B4513);
}
</style>
