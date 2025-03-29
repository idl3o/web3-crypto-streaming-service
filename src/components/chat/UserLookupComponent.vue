<template>
    <div class="user-lookup-component" :class="theme">
        <div class="search-container">
            <div class="search-input-wrapper">
                <input type="text" class="search-input" v-model="searchQuery"
                    placeholder="Search users by name or wallet address..." @input="handleSearchInput"
                    @focus="focused = true" />
                <div class="search-icon">
                    <i class="fas" :class="isSearching ? 'fa-spinner fa-spin' : 'fa-search'"></i>
                </div>
            </div>

            <div class="search-results" v-show="focused && (searchResults.length > 0 || isSearching)">
                <div v-if="isSearching" class="loading-indicator">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Searching...</span>
                </div>

                <template v-else>
                    <div v-for="user in searchResults" :key="user.id" class="user-result" @click="selectUser(user)">
                        <div class="user-avatar">
                            <img v-if="user.avatar" :src="user.avatar" :alt="user.username" class="avatar-image" />
                            <div v-else class="avatar-placeholder">
                                {{ getInitials(user.username) }}
                            </div>
                            <div v-if="user.verified" class="verified-badge" title="Verified User">
                                <i class="fas fa-check"></i>
                            </div>
                        </div>

                        <div class="user-info">
                            <div class="username">{{ user.username }}</div>
                            <div class="wallet-address">{{ truncateAddress(user.walletAddress) }}</div>
                        </div>

                        <div class="user-role" :class="`role-${user.role}`">
                            {{ formatRole(user.role) }}
                        </div>
                    </div>

                    <div v-if="searchResults.length === 0 && searchQuery.length >= 2" class="no-results">
                        No users found matching "{{ searchQuery }}"
                    </div>
                </template>
            </div>
        </div>

        <div v-if="selectedUser" class="user-profile">
            <div class="profile-header">
                <h3>User Profile</h3>
                <button class="close-btn" @click="closeProfile">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="profile-content">
                <div class="profile-avatar">
                    <img v-if="selectedUser.avatar" :src="selectedUser.avatar" :alt="selectedUser.username"
                        class="avatar-image" />
                    <div v-else class="avatar-placeholder large">
                        {{ getInitials(selectedUser.username) }}
                    </div>
                    <div v-if="selectedUser.verified" class="verified-badge" title="Verified User">
                        <i class="fas fa-check"></i>
                    </div>
                </div>

                <div class="profile-details">
                    <div class="profile-username">{{ selectedUser.username }}</div>

                    <div class="profile-role" :class="`role-${selectedUser.role}`">
                        {{ formatRole(selectedUser.role) }}
                    </div>

                    <div class="profile-wallet">
                        <div class="detail-label">Wallet Address</div>
                        <div class="detail-value">{{ selectedUser.walletAddress }}</div>
                    </div>

                    <div class="profile-joined">
                        <div class="detail-label">Joined</div>
                        <div class="detail-value">{{ formatDate(selectedUser.joinedAt) }}</div>
                    </div>

                    <div class="profile-actions">
                        <button class="action-btn message-btn" @click="messageUser">
                            <i class="fas fa-comment"></i>
                            Message
                        </button>

                        <button class="action-btn tip-btn" @click="tipUser">
                            <i class="fas fa-coins"></i>
                            Send Tip
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, inject, watch, onMounted, onUnmounted } from 'vue';
import { lookupUsers, getUserProfile, USER_ROLE } from '@/services/ChatService';
import debounce from 'lodash/debounce';

const props = defineProps({
    initialQuery: {
        type: String,
        default: ''
    }
});

const emit = defineEmits(['select-user', 'message-user', 'tip-user']);
const theme = inject('currentTheme', 'roman-theme');

// State
const searchQuery = ref(props.initialQuery || '');
const searchResults = ref([]);
const isSearching = ref(false);
const selectedUser = ref(null);
const focused = ref(false);
const searchTimeout = ref(null);

// Create a debounced search function
const debouncedSearch = debounce(async (query) => {
    if (!query || query.length < 2) {
        searchResults.value = [];
        isSearching.value = false;
        return;
    }

    isSearching.value = true;

    try {
        const results = await lookupUsers(query);
        searchResults.value = results;
    } catch (error) {
        console.error('Error searching users:', error);
    } finally {
        isSearching.value = false;
    }
}, 300);

// Methods
function handleSearchInput() {
    debouncedSearch(searchQuery.value);
}

async function selectUser(user) {
    try {
        // Fetch full user profile
        const profile = await getUserProfile(user.id);
        selectedUser.value = profile;
        emit('select-user', profile);
    } catch (error) {
        console.error(`Error fetching profile for ${user.id}:`, error);
        // Fall back to the basic user data we already have
        selectedUser.value = user;
        emit('select-user', user);
    }
}

function closeProfile() {
    selectedUser.value = null;
}

function messageUser() {
    if (selectedUser.value) {
        emit('message-user', selectedUser.value);
    }
}

function tipUser() {
    if (selectedUser.value) {
        emit('tip-user', selectedUser.value);
    }
}

function getInitials(username) {
    if (!username) return '?';

    return username.charAt(0).toUpperCase();
}

function truncateAddress(address) {
    if (!address) return '';
    if (address.length < 10) return address;

    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

function formatRole(role) {
    switch (role) {
        case USER_ROLE.ADMIN:
            return 'Admin';
        case USER_ROLE.MODERATOR:
            return 'Mod';
        case USER_ROLE.CREATOR:
            return 'Creator';
        case USER_ROLE.VIP:
            return 'VIP';
        case USER_ROLE.USER:
            return 'User';
        default:
            return 'Guest';
    }
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';

    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays < 1) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 30) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString();
    }
}

// Handle clicks outside the component to close search results
function handleClickOutside(event) {
    const component = document.querySelector('.user-lookup-component');
    if (component && !component.contains(event.target)) {
        focused.value = false;
    }
}

// Lifecycle hooks
onMounted(() => {
    document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
    debouncedSearch.cancel();
});

// Watch for changes to the initial query
watch(() => props.initialQuery, (newQuery) => {
    if (newQuery && newQuery !== searchQuery.value) {
        searchQuery.value = newQuery;
        debouncedSearch(newQuery);
    }
});
</script>

<style scoped>
.user-lookup-component {
    width: 100%;
}

.search-container {
    position: relative;
    width: 100%;
}

.search-input-wrapper {
    position: relative;
    width: 100%;
}

.search-input {
    width: 100%;
    padding: 10px 36px 10px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    background-color: white;
    transition: border-color 0.2s;
}

.search-input:focus {
    outline: none;
    border-color: #4CAF50;
}

.search-icon {
    position: absolute;
    top: 50%;
    right: 12px;
    transform: translateY(-50%);
    color: #888;
}

.search-results {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    max-height: 300px;
    overflow-y: auto;
    background-color: white;
    border: 1px solid #ddd;
    border-top: none;
    border-radius: 0 0 6px 6px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    z-index: 10;
}

.loading-indicator {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 15px;
    gap: 8px;
    color: #888;
}

.user-result {
    display: flex;
    align-items: center;
    padding: 10px 12px;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    transition: background-color 0.2s;
}

.user-result:last-child {
    border-bottom: none;
}

.user-result:hover {
    background-color: #f5f5f5;
}

.user-avatar {
    position: relative;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    margin-right: 12px;
}

.avatar-image {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
}

.avatar-placeholder {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-color: #e0e0e0;
    color: #757575;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
}

.avatar-placeholder.large {
    width: 80px;
    height: 80px;
    font-size: 24px;
}

.verified-badge {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background-color: #2196F3;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8px;
    border: 1px solid white;
}

.user-info {
    flex: 1;
}

.username {
    font-weight: 500;
    color: #333;
}

.wallet-address {
    font-size: 12px;
    color: #888;
}

.user-role {
    padding: 3px 6px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
    margin-left: 8px;
}

.role-admin {
    background-color: #F44336;
    color: white;
}

.role-moderator {
    background-color: #2196F3;
    color: white;
}

.role-creator {
    background-color: #9C27B0;
    color: white;
}

.role-vip {
    background-color: #FFC107;
    color: #333;
}

.role-user {
    background-color: #E0E0E0;
    color: #555;
}

.role-guest {
    background-color: #F5F5F5;
    color: #999;
}

.no-results {
    padding: 15px;
    text-align: center;
    color: #888;
    font-style: italic;
}

.user-profile {
    margin-top: 20px;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;
}

.profile-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
}

.profile-header h3 {
    margin: 0;
    font-size: 16px;
    color: #333;
}

.close-btn {
    background: none;
    border: none;
    color: #888;
    cursor: pointer;
    font-size: 16px;
    padding: 4px;
}

.profile-content {
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.profile-avatar {
    position: relative;
    margin-bottom: 16px;
}

.profile-details {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.profile-username {
    font-size: 18px;
    font-weight: 500;
    margin-bottom: 4px;
}

.profile-role {
    margin-bottom: 16px;
    padding: 4px 10px;
}

.profile-wallet,
.profile-joined {
    width: 100%;
    margin-bottom: 12px;
}

.detail-label {
    font-size: 12px;
    color: #888;
    margin-bottom: 4px;
}

.detail-value {
    font-size: 14px;
    word-break: break-all;
}

.profile-actions {
    display: flex;
    gap: 12px;
    margin-top: 16px;
}

.action-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 500;
    transition: background-color 0.2s;
}

.message-btn {
    background-color: #4CAF50;
    color: white;
}

.message-btn:hover {
    background-color: #3d9140;
}

.tip-btn {
    background-color: #FFC107;
    color: #333;
}

.tip-btn:hover {
    background-color: #e6ae06;
}

/* Roman theme */
.roman-theme .search-input:focus {
    border-color: var(--primary-color, #8B4513);
}

.roman-theme .message-btn {
    background-color: var(--primary-color, #8B4513);
}

.roman-theme .message-btn:hover {
    background-color: var(--primary-dark-color, #704012);
}

.roman-theme .tip-btn {
    background-color: var(--secondary-color, #CD853F);
    color: white;
}

.roman-theme .tip-btn:hover {
    background-color: #bc774a;
}
</style>
