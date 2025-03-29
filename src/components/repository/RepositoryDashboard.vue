<template>
    <div class="repository-dashboard" :class="theme">
        <div class="dashboard-header">
            <div class="title-section">
                <h2>Repository Health Dashboard</h2>
                <span class="subtitle">Monitoring and management of content repositories</span>
            </div>

            <div class="action-buttons">
                <button class="refresh-btn" @click="refreshData" :disabled="isLoading">
                    <i class="fas fa-sync" :class="{ 'fa-spin': isLoading }"></i>
                    Refresh
                </button>
                <button class="new-repo-btn" @click="openCreateModal">
                    <i class="fas fa-plus"></i> New Repository
                </button>
            </div>
        </div>

        <!-- Repository Stats Overview -->
        <div class="stats-overview">
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-database"></i>
                </div>
                <div class="stat-content">
                    <span class="stat-value">{{ stats.totalRepositories }}</span>
                    <span class="stat-label">Total Repositories</span>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="stat-content">
                    <span class="stat-value">{{ stats.healthyRepositories }}</span>
                    <span class="stat-label">Healthy</span>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon warning">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="stat-content">
                    <span class="stat-value">{{ stats.issuesCount }}</span>
                    <span class="stat-label">Issues Detected</span>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-thumbtack"></i>
                </div>
                <div class="stat-content">
                    <span class="stat-value">{{ stats.pinnedRepositories }}</span>
                    <span class="stat-label">Pinned Content</span>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-dollar-sign"></i>
                </div>
                <div class="stat-content">
                    <span class="stat-value">${{ stats.totalFeesDue }}</span>
                    <span class="stat-label">Total Fees Due</span>
                </div>
            </div>
        </div>

        <!-- Health Status Chart -->
        <div class="chart-section">
            <div class="section-header">
                <h3>Repository Health Trends</h3>
                <div class="time-selector">
                    <button v-for="period in timePeriods" :key="period.value"
                        :class="['time-btn', { active: selectedTimePeriod === period.value }]"
                        @click="selectedTimePeriod = period.value">
                        {{ period.label }}
                    </button>
                </div>
            </div>

            <div class="chart-container">
                <!-- Placeholder for chart - would be replaced with actual chart component -->
                <div class="chart-placeholder" v-if="!healthData.length">
                    <i class="fas fa-chart-line"></i>
                    <p>No health data available for the selected period</p>
                </div>
                <div v-else class="mock-chart">
                    <!-- Simplified visualization as placeholder -->
                    <div v-for="(point, index) in healthData" :key="index" class="chart-bar" :style="{
                        height: point.healthScore + '%',
                        backgroundColor: getHealthColor(point.healthScore)
                    }" :title="`${point.date}: Health Score ${point.healthScore}%`"></div>
                </div>
            </div>
        </div>

        <!-- Repository List with Filters -->
        <div class="repository-section">
            <div class="filter-controls">
                <div class="search-box">
                    <i class="fas fa-search"></i>
                    <input type="text" v-model="filters.search" placeholder="Search repositories..."
                        @input="applyFilters" />
                </div>

                <div class="filter-group">
                    <select v-model="filters.type" @change="applyFilters">
                        <option value="">All Types</option>
                        <option v-for="type in repositoryTypes" :key="type.value" :value="type.value">
                            {{ type.label }}
                        </option>
                    </select>

                    <select v-model="filters.health" @change="applyFilters">
                        <option value="">All Health Status</option>
                        <option value="healthy">Healthy</option>
                        <option value="issues">Has Issues</option>
                    </select>

                    <div class="toggle-filter">
                        <input type="checkbox" id="pinned-toggle" v-model="filters.onlyPinned" @change="applyFilters">
                        <label for="pinned-toggle">Only Pinned</label>
                    </div>
                </div>

                <div class="sort-control">
                    <label>Sort by:</label>
                    <select v-model="filters.sortBy" @change="applyFilters">
                        <option value="name">Name</option>
                        <option value="health">Health</option>
                        <option value="updatedAt">Last Updated</option>
                        <option value="size">Size</option>
                    </select>
                    <button class="sort-direction" @click="toggleSortDirection">
                        <i :class="filters.sortDir === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down'"></i>
                    </button>
                </div>
            </div>

            <!-- Repository List -->
            <div v-if="isLoading" class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading repositories...</span>
            </div>

            <div v-else-if="!filteredRepositories.length" class="empty-state">
                <i class="fas fa-folder-open"></i>
                <h3>No repositories found</h3>
                <p>Try adjusting your filters or create a new repository</p>
                <button class="create-btn" @click="openCreateModal">Create Repository</button>
            </div>

            <div v-else class="repository-list">
                <repository-health-card v-for="repo in filteredRepositories" :key="repo.id" :repository="repo"
                    @view="viewRepositoryDetails" @verify="verifyRepository" @toggle-pin="toggleRepositoryPin" />
            </div>

            <!-- Pagination -->
            <div v-if="filteredRepositories.length" class="pagination">
                <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--">
                    <i class="fas fa-chevron-left"></i>
                </button>

                <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>

                <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>

        <!-- Repository Detail Modal -->
        <div v-if="selectedRepository" class="modal-overlay" @click="closeDetailModal">
            <div class="modal-container" @click.stop>
                <div class="modal-header">
                    <h3>{{ selectedRepository.metadata.name }}</h3>
                    <button class="close-btn" @click="closeDetailModal">&times;</button>
                </div>

                <div class="modal-body">
                    <div class="repository-details">
                        <div class="detail-section">
                            <h4>Basic Information</h4>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <span class="label">ID:</span>
                                    <span class="value">{{ selectedRepository.id }}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="label">Type:</span>
                                    <span class="value">{{ getRepositoryTypeLabel(selectedRepository.metadata.type)
                                    }}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="label">Size:</span>
                                    <span class="value">{{ formatRepositorySize(selectedRepository.metadata.size)
                                    }}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="label">Items:</span>
                                    <span class="value">{{ selectedRepository.metadata.contentCount }}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="label">Created:</span>
                                    <span class="value">{{ formatDate(selectedRepository.metadata.createdAt) }}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="label">Last Updated:</span>
                                    <span class="value">{{ formatDate(selectedRepository.metadata.updatedAt) }}</span>
                                </div>
                            </div>
                        </div>

                        <div class="detail-section">
                            <h4>Description</h4>
                            <p class="repository-description">{{ selectedRepository.metadata.description || 'No
                                description provided.' }}</p>
                        </div>

                        <div class="detail-section">
                            <h4>Health Status</h4>
                            <div class="health-indicator"
                                :class="selectedRepository.status.healthy ? 'healthy' : 'unhealthy'">
                                <i
                                    :class="selectedRepository.status.healthy ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle'"></i>
                                <span>{{ selectedRepository.status.healthy ? 'Repository is healthy' : 'Repository has
                                    issues' }}</span>
                            </div>

                            <div v-if="selectedRepository.status.issues && selectedRepository.status.issues.length"
                                class="issues-list">
                                <h5>Detected Issues:</h5>
                                <ul>
                                    <li v-for="(issue, index) in selectedRepository.status.issues" :key="index">
                                        <span class="issue-type">{{ issue.type }}:</span> {{ issue.details }}
                                    </li>
                                </ul>
                            </div>

                            <div class="last-check">
                                Last checked: {{ formatDate(selectedRepository.status.lastCheck) }}
                            </div>
                        </div>

                        <div v-if="selectedRepository.metadata.tags && selectedRepository.metadata.tags.length"
                            class="detail-section">
                            <h4>Tags</h4>
                            <div class="tags-container">
                                <span v-for="(tag, index) in selectedRepository.metadata.tags" :key="index" class="tag">
                                    {{ tag }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="secondary-btn" @click="syncRepository(selectedRepository.id)">
                        <i class="fas fa-sync"></i> Sync
                    </button>
                    <button class="action-btn" :class="selectedRepository.isPinned ? 'warning-btn' : 'primary-btn'"
                        @click="toggleRepositoryPin(selectedRepository)">
                        <i :class="selectedRepository.isPinned ? 'fas fa-unlink' : 'fas fa-thumbtack'"></i>
                        {{ selectedRepository.isPinned ? 'Unpin' : 'Pin' }}
                    </button>
                    <button class="danger-btn" @click="confirmDeleteRepository(selectedRepository)">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </div>
            </div>
        </div>

        <!-- Create Repository Modal -->
        <div v-if="showCreateModal" class="modal-overlay" @click="closeCreateModal">
            <div class="modal-container" @click.stop>
                <!-- Modal content for creating a repository - similar to existing RepositoryManager.vue -->
            </div>
        </div>

        <!-- Confirmation Modal -->
        <div v-if="showConfirmModal" class="modal-overlay" @click="closeConfirmModal">
            <div class="confirmation-modal" @click.stop>
                <div class="confirm-header">
                    <h4>{{ confirmAction.title }}</h4>
                </div>
                <div class="confirm-body">
                    <p>{{ confirmAction.message }}</p>
                </div>
                <div class="confirm-footer">
                    <button class="cancel-btn" @click="closeConfirmModal">Cancel</button>
                    <button class="action-btn danger-btn" @click="executeConfirmAction"
                        :disabled="confirmAction.processing">
                        <span v-if="!confirmAction.processing">{{ confirmAction.confirmText }}</span>
                        <span v-else><i class="fas fa-spinner fa-spin"></i> Processing...</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue';
import {
    getAllRepositories,
    getRepositoryInfo,
    verifyRepositoryIntegrity,
    pinRepository,
    unpinRepository,
    unregisterRepository,
    syncRepository as syncRepositoryAction
} from '@/services/RepositoryHelper';
import { formatRepositorySize, getRepositoryTypeLabel } from '@/utils/RepositoryUtils';
import RepositoryHealthCard from './RepositoryHealthCard.vue';
import { REPOSITORY_TYPE } from '@/services/RepositoryHelper';
import { getRepositoryHealthHistory } from '@/services/RepositoryMetricsService';

// Inject theme
const theme = inject('currentTheme', 'roman-theme');

// State
const repositories = ref([]);
const filteredRepositories = ref([]);
const isLoading = ref(true);
const selectedRepository = ref(null);
const currentPage = ref(1);
const itemsPerPage = ref(12);
const showCreateModal = ref(false);
const showConfirmModal = ref(false);
const healthData = ref([]);
const selectedTimePeriod = ref('week');

// Filters
const filters = ref({
    search: '',
    type: '',
    health: '',
    onlyPinned: false,
    sortBy: 'updatedAt',
    sortDir: 'desc'
});

// Stats
const stats = ref({
    totalRepositories: 0,
    healthyRepositories: 0,
    issuesCount: 0,
    pinnedRepositories: 0,
    totalFeesDue: 0 // new property
});

// Confirm modal state
const confirmAction = ref({
    title: '',
    message: '',
    confirmText: 'Confirm',
    processing: false,
    action: null,
    params: null
});

// Repository types for filter
const repositoryTypes = [
    { value: REPOSITORY_TYPE.CONTENT, label: 'Content' },
    { value: REPOSITORY_TYPE.METADATA, label: 'Metadata' },
    { value: REPOSITORY_TYPE.ARCHIVE, label: 'Archive' },
    { value: REPOSITORY_TYPE.PROGRAM, label: 'Program' },
    { value: REPOSITORY_TYPE.CONFIG, label: 'Config' }
];

// Time periods for health chart
const timePeriods = [
    { value: 'day', label: '24h' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'quarter', label: '3 Months' },
];

// Computed
const totalPages = computed(() => {
    return Math.ceil(filteredRepositories.value.length / itemsPerPage.value);
});

// Methods
async function loadRepositories() {
    isLoading.value = true;

    try {
        repositories.value = await getAllRepositories();
        updateStats();
        applyFilters();
    } catch (error) {
        console.error('Error loading repositories:', error);
    } finally {
        isLoading.value = false;
    }
}

function updateStats() {
    const repoArray = repositories.value;

    stats.value = {
        totalRepositories: repoArray.length,
        healthyRepositories: repoArray.filter(repo => repo.status.healthy).length,
        issuesCount: repoArray.reduce((count, repo) =>
            count + (repo.status.issues ? repo.status.issues.length : 0), 0
        ),
        pinnedRepositories: repoArray.filter(repo => repo.isPinned).length,
        totalFeesDue: repoArray.reduce((total, repo) => total + (repo.feeMetrics?.due || 0), 0) // new calculation
    };
}

function applyFilters() {
    let filtered = [...repositories.value];

    // Search filter
    if (filters.value.search) {
        const query = filters.value.search.toLowerCase();
        filtered = filtered.filter(repo =>
            repo.id.toLowerCase().includes(query) ||
            repo.metadata.name.toLowerCase().includes(query) ||
            repo.metadata.description?.toLowerCase().includes(query)
        );
    }

    // Type filter
    if (filters.value.type) {
        filtered = filtered.filter(repo => repo.metadata.type === filters.value.type);
    }

    // Health filter
    if (filters.value.health === 'healthy') {
        filtered = filtered.filter(repo => repo.status.healthy);
    } else if (filters.value.health === 'issues') {
        filtered = filtered.filter(repo => !repo.status.healthy);
    }

    // Pinned filter
    if (filters.value.onlyPinned) {
        filtered = filtered.filter(repo => repo.isPinned);
    }

    // Sorting
    const sortDir = filters.value.sortDir === 'asc' ? 1 : -1;

    filtered.sort((a, b) => {
        switch (filters.value.sortBy) {
            case 'name':
                return sortDir * a.metadata.name.localeCompare(b.metadata.name);
            case 'health':
                return sortDir * (a.status.healthy === b.status.healthy ? 0 : a.status.healthy ? -1 : 1);
            case 'updatedAt':
                return sortDir * (new Date(b.metadata.updatedAt) - new Date(a.metadata.updatedAt));
            case 'size':
                return sortDir * (b.metadata.size - a.metadata.size);
            default:
                return 0;
        }
    });

    filteredRepositories.value = filtered;

    // Reset to first page when filters change
    currentPage.value = 1;
}

function toggleSortDirection() {
    filters.value.sortDir = filters.value.sortDir === 'asc' ? 'desc' : 'asc';
    applyFilters();
}

function viewRepositoryDetails(repository) {
    selectedRepository.value = repository;
}

async function verifyRepository(repositoryId) {
    try {
        const result = await verifyRepositoryIntegrity(repositoryId);

        // Update the repository in our list
        const index = repositories.value.findIndex(r => r.id === repositoryId);
        if (index !== -1) {
            repositories.value[index].status = {
                healthy: result.valid,
                lastCheck: new Date().toISOString(),
                issues: result.issues
            };

            // If we're viewing this repository, update the selected one too
            if (selectedRepository.value && selectedRepository.value.id === repositoryId) {
                selectedRepository.value = { ...repositories.value[index] };
            }

            updateStats();
            applyFilters();
        }

        return result;
    } catch (error) {
        console.error(`Error verifying repository ${repositoryId}:`, error);
        throw error;
    }
}

async function toggleRepositoryPin(repository) {
    try {
        if (repository.isPinned) {
            await unpinRepository(repository.id);
        } else {
            await pinRepository(repository.id);
        }

        // Update repository object
        repository.isPinned = !repository.isPinned;

        // Update stats
        updateStats();

        // If this is the selected repository, update that too
        if (selectedRepository.value && selectedRepository.value.id === repository.id) {
            selectedRepository.value.isPinned = repository.isPinned;
        }
    } catch (error) {
        console.error(`Error toggling pin for repository ${repository.id}:`, error);
    }
}

async function syncRepository(repositoryId) {
    try {
        await syncRepositoryAction(repositoryId);

        // Refresh the repository details
        const updatedRepo = await getRepositoryInfo(repositoryId);

        // Update in our list
        const index = repositories.value.findIndex(r => r.id === repositoryId);
        if (index !== -1) {
            repositories.value[index] = updatedRepo;

            // If we're viewing this repository, update the selected one too
            if (selectedRepository.value && selectedRepository.value.id === repositoryId) {
                selectedRepository.value = updatedRepo;
            }
        }
    } catch (error) {
        console.error(`Error syncing repository ${repositoryId}:`, error);
    }
}

function confirmDeleteRepository(repository) {
    confirmAction.value = {
        title: 'Delete Repository',
        message: `Are you sure you want to delete "${repository.metadata.name}"? This action cannot be undone.`,
        confirmText: 'Delete',
        processing: false,
        action: deleteRepository,
        params: repository.id
    };

    showConfirmModal.value = true;
}

async function deleteRepository(repositoryId) {
    try {
        confirmAction.value.processing = true;

        await unregisterRepository(repositoryId, { unpin: true });

        // Remove from our list
        repositories.value = repositories.value.filter(r => r.id !== repositoryId);

        // Close modals
        closeConfirmModal();
        closeDetailModal();

        // Update stats and filtered list
        updateStats();
        applyFilters();
    } catch (error) {
        console.error(`Error deleting repository ${repositoryId}:`, error);
    } finally {
        confirmAction.value.processing = false;
    }
}

function executeConfirmAction() {
    if (confirmAction.value.action && !confirmAction.value.processing) {
        confirmAction.value.action(confirmAction.value.params);
    }
}

// Modal handlers
function openCreateModal() {
    showCreateModal.value = true;
}

function closeCreateModal() {
    showCreateModal.value = false;
}

function closeDetailModal() {
    selectedRepository.value = null;
}

function closeConfirmModal() {
    showConfirmModal.value = false;
    confirmAction.value = {
        title: '',
        message: '',
        confirmText: 'Confirm',
        processing: false,
        action: null,
        params: null
    };
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
}

function refreshData() {
    loadRepositories();
    loadHealthData();
}

async function loadHealthData() {
    try {
        // Load health history based on selected time period
        healthData.value = await getRepositoryHealthHistory(selectedTimePeriod.value);
    } catch (error) {
        console.error('Error loading health data:', error);
        healthData.value = [];
    }
}

function getHealthColor(score) {
    if (score >= 90) return '#4CAF50';
    if (score >= 70) return '#8BC34A';
    if (score >= 50) return '#FFC107';
    if (score >= 30) return '#FF9800';
    return '#F44336';
}

// Watchers
function watchTimePeriod() {
    loadHealthData();
}

// Initialize
onMounted(() => {
    loadRepositories();
    loadHealthData();

    // Watch for changes to selected time period
    watchTimePeriod();
});
</script>

<style scoped>
.repository-dashboard {
    padding: 20px;
}

.dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
}

.title-section h2 {
    margin: 0;
    font-size: 24px;
}

.subtitle {
    color: #666;
    font-size: 0.9rem;
}

.action-buttons {
    display: flex;
    gap: 12px;
}

.refresh-btn,
.new-repo-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
}

.refresh-btn {
    background-color: #f5f5f5;
    color: #333;
}

.new-repo-btn {
    background-color: #4CAF50;
    color: white;
}

/* Stats overview */
.stats-overview {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
}

.stat-card {
    background-color: white;
    border-radius: 8px;
    padding: 16px;
    display: flex;
    align-items: center;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background-color: #E8F5E9;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16px;
    font-size: 20px;
    color: #4CAF50;
}

.stat-icon.warning {
    background-color: #FFF8E1;
    color: #FFC107;
}

.stat-content {
    display: flex;
    flex-direction: column;
}

.stat-value {
    font-size: 24px;
    font-weight: 500;
}

.stat-label {
    font-size: 14px;
    color: #666;
}

/* Chart section */
.chart-section {
    background-color: white;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 24px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.section-header h3 {
    margin: 0;
    font-size: 18px;
}

.time-selector {
    display: flex;
    gap: 8px;
}

.time-btn {
    background-color: #f5f5f5;
    border: none;
    border-radius: 4px;
    padding: 4px 12px;
    font-size: 0.9rem;
    cursor: pointer;
}

.time-btn.active {
    background-color: #E8F5E9;
    color: #4CAF50;
}

.chart-container {
    height: 200px;
    position: relative;
}

.chart-placeholder {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #ccc;
}

.chart-placeholder i {
    font-size: 48px;
    margin-bottom: 12px;
}

.mock-chart {
    height: 100%;
    display: flex;
    align-items: flex-end;
    gap: 2px;
    padding-top: 20px;
}

.chart-bar {
    flex: 1;
    min-width: 8px;
    border-radius: 2px 2px 0 0;
    transition: height 0.3s ease;
}

/* Repository section */
.repository-section {
    background-color: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.filter-controls {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 16px;
}

.search-box {
    position: relative;
    flex: 1;
    min-width: 200px;
}

.search-box input {
    width: 100%;
    padding: 8px 12px 8px 36px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
}

.search-box i {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #999;
}

.filter-group {
    display: flex;
    gap: 12px;
    align-items: center;
}

.filter-group select {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background-color: white;
    font-size: 14px;
}

.toggle-filter {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
}

.sort-control {
    display: flex;
    align-items: center;
    gap: 8px;
}

.sort-control label {
    font-size: 14px;
    color: #666;
}

.sort-direction {
    border: none;
    background: none;
    padding: 4px;
    cursor: pointer;
    font-size: 16px;
}

.loading-state,
.empty-state {
    padding: 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: #666;
}

.loading-state i,
.empty-state i {
    font-size: 48px;
    margin-bottom: 16px;
    color: #ddd;
}

.repository-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
}

.pagination {
    margin-top: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
}

.page-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid #ddd;
    background-color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}

.page-btn:disabled {
    color: #ccc;
    cursor: not-allowed;
}

.page-info {
    font-size: 14px;
    color: #666;
}

/* Modal styles */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-container {
    background-color: white;
    border-radius: 8px;
    width: 90%;
    max-width: 800px;
    max-height: 90vh;
    overflow-y: auto;
}

.confirmation-modal {
    background-color: white;
    border-radius: 8px;
    width: 90%;
    max-width: 400px;
    overflow-y: auto;
}

.modal-header,
.confirm-header {
    padding: 16px;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-header h3,
.confirm-header h4 {
    margin: 0;
}

.close-btn {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    padding: 0;
    color: #999;
}

.modal-body,
.confirm-body {
    padding: 20px;
}

.modal-footer,
.confirm-footer {
    padding: 16px;
    border-top: 1px solid #eee;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}

.detail-section {
    margin-bottom: 20px;
}

.detail-section h4 {
    margin-top: 0;
    margin-bottom: 8px;
    color: #333;
}

.detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
}

.detail-item {
    display: flex;
    flex-direction: column;
}

.label {
    font-size: 12px;
    color: #666;
    margin-bottom: 4px;
}

.value {
    font-weight: 500;
}

.repository-description {
    margin: 0;
    color: #555;
    line-height: 1.5;
}

.health-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 4px;
    margin-bottom: 12px;
}

.health-indicator.healthy {
    background-color: #E8F5E9;
    color: #4CAF50;
}

.health-indicator.unhealthy {
    background-color: #FFEBEE;
    color: #F44336;
}

.issues-list {
    margin-bottom: 12px;
}

.issues-list h5 {
    margin-top: 0;
    margin-bottom: 8px;
    font-size: 14px;
}

.issues-list ul {
    margin: 0;
    padding-left: 20px;
}

.issues-list li {
    margin-bottom: 4px;
    font-size: 14px;
}

.issue-type {
    font-weight: 500;
}

.last-check {
    font-size: 12px;
    color: #999;
}

.tags-container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.tag {
    background-color: #f0f0f0;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
}

.action-btn,
.secondary-btn,
.danger-btn,
.cancel-btn {
    padding: 8px 16px;
    border-radius: 4px;
    border: none;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
}

.action-btn i,
.secondary-btn i,
.danger-btn i {
    font-size: 14px;
}

.primary-btn {
    background-color: #4CAF50;
    color: white;
}

.secondary-btn {
    background-color: #f5f5f5;
    color: #333;
}

.warning-btn {
    background-color: #FF9800;
    color: white;
}

.danger-btn {
    background-color: #F44336;
    color: white;
}

.cancel-btn {
    background-color: #f5f5f5;
    color: #333;
}

/* Roman theme */
.roman-theme .new-repo-btn,
.roman-theme .primary-btn {
    background-color: var(--primary-color, #8B4513);
}

.roman-theme .stat-icon {
    background-color: rgba(139, 69, 19, 0.1);
    color: var(--primary-color, #8B4513);
}

.roman-theme .time-btn.active {
    background-color: rgba(139, 69, 19, 0.1);
    color: var(--primary-color, #8B4513);
}

.roman-theme .health-indicator.healthy {
    background-color: rgba(139, 69, 19, 0.1);
    color: var(--primary-color, #8B4513);
}
</style>
