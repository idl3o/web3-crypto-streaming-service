<template>
    <div class="engagement-panel" :class="theme">
        <div class="engagement-reactions">
            <button v-for="reaction in availableReactions" :key="reaction.id" class="reaction-btn"
                :class="{ active: userReactions.includes(reaction.id) }" @click="toggleReaction(reaction.id)">
                <span class="reaction-emoji">{{ reaction.emoji }}</span>
                <span class="reaction-count" v-if="getReactionCount(reaction.id) > 0">{{ getReactionCount(reaction.id)
                    }}</span>
            </button>
        </div>

        <div class="engagement-actions">
            <button class="action-btn share-btn" @click="shareTransaction">
                <i class="fas fa-share-alt"></i>
                <span class="action-label">Share</span>
            </button>

            <button class="action-btn highlight-btn" @click="toggleHighlight">
                <i :class="isHighlighted ? 'fas fa-bookmark' : 'far fa-bookmark'"></i>
                <span class="action-label">{{ isHighlighted ? 'Saved' : 'Save' }}</span>
            </button>

            <button v-if="transaction.type === 'stream_payment'" class="action-btn review-btn"
                @click="openReviewDialog">
                <i class="fas fa-star-half-alt"></i>
                <span class="action-label">Review</span>
            </button>
        </div>

        <div v-if="transaction.achievements && transaction.achievements.length" class="engagement-achievements">
            <div v-for="achievement in transaction.achievements" :key="achievement.id" class="achievement-badge"
                :title="achievement.description">
                <span class="achievement-icon">{{ achievement.icon }}</span>
                <span class="achievement-name">{{ achievement.name }}</span>
            </div>
        </div>

        <!-- Share Dialog -->
        <div v-if="showShareDialog" class="share-dialog-backdrop" @click="showShareDialog = false">
            <div class="share-dialog" @click.stop>
                <div class="share-header">
                    <h4>Share Transaction</h4>
                    <button class="dialog-close" @click="showShareDialog = false">&times;</button>
                </div>

                <div class="share-content">
                    <p>Share your {{ getTransactionTypeText(transaction.type) }} with others:</p>

                    <div class="share-link">
                        <input type="text" readonly :value="shareUrl" ref="linkInput">
                        <button @click="copyShareLink" class="copy-btn">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>

                    <div class="share-options">
                        <button class="share-option twitter">
                            <i class="fab fa-twitter"></i>
                        </button>
                        <button class="share-option discord">
                            <i class="fab fa-discord"></i>
                        </button>
                        <button class="share-option telegram">
                            <i class="fab fa-telegram"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Review Dialog -->
        <div v-if="showReviewDialog" class="review-dialog-backdrop" @click="showReviewDialog = false">
            <div class="review-dialog" @click.stop>
                <div class="review-header">
                    <h4>Rate Content</h4>
                    <button class="dialog-close" @click="showReviewDialog = false">&times;</button>
                </div>

                <div class="review-content">
                    <p>How would you rate "{{ transaction.contentTitle || 'this content' }}"?</p>

                    <div class="star-rating">
                        <button v-for="i in 5" :key="i" class="star-btn" @click="setRating(i)">
                            <i :class="rating >= i ? 'fas fa-star' : 'far fa-star'"></i>
                        </button>
                    </div>

                    <textarea v-model="reviewComment" placeholder="Share your thoughts about this content..." rows="3"
                        class="review-comment"></textarea>

                    <div class="review-actions">
                        <button class="btn btn-secondary" @click="showReviewDialog = false">Cancel</button>
                        <button class="btn btn-primary" @click="submitReview" :disabled="!rating">Submit</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Toast Message -->
        <div v-if="toastMessage" class="toast-message" :class="{ 'show': toastMessage }">
            {{ toastMessage }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, PropType, nextTick } from 'vue';
import { Transaction, TransactionType } from '@/services/transactionService';
import { useEngagementStore } from '@/stores/engagementStore';
import { throttle, debounce } from '@/components/transaction/TransactionOptimizer';

const props = defineProps({
    transaction: {
        type: Object as PropType<Transaction>,
        required: true
    },
    theme: {
        type: String,
        default: 'roman-theme'
    }
});

const engagementStore = useEngagementStore();
const showShareDialog = ref(false);
const showReviewDialog = ref(false);
const rating = ref(0);
const reviewComment = ref('');
const toastMessage = ref('');
const linkInput = ref<HTMLInputElement | null>(null);

// Available reactions
const availableReactions = [
    { id: 'like', emoji: '👍' },
    { id: 'love', emoji: '❤️' },
    { id: 'laugh', emoji: '😂' },
    { id: 'wow', emoji: '😮' },
    { id: 'sad', emoji: '😢' },
];

// Computed properties
const userReactions = computed(() => {
    return engagementStore.getUserReactions(props.transaction.id);
});

const isHighlighted = computed(() => {
    return engagementStore.isTransactionHighlighted(props.transaction.id);
});

const shareUrl = computed(() => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/share/transaction/${props.transaction.id}`;
});

// Methods
function getReactionCount(reactionId: string): number {
    return engagementStore.getReactionCount(props.transaction.id, reactionId);
}

// Use throttled version of toggleReaction to prevent excessive updates
const throttledToggleReaction = throttle((reactionId) => {
    engagementStore.toggleReaction(props.transaction.id, reactionId);
}, 300);

function toggleReaction(reactionId: string) {
    throttledToggleReaction(reactionId);
}

function shareTransaction() {
    showShareDialog.value = true;
}

function toggleHighlight() {
    engagementStore.toggleHighlight(props.transaction.id);
}

function openReviewDialog() {
    // Reset review form
    rating.value = engagementStore.getUserRating(props.transaction.id) || 0;
    reviewComment.value = engagementStore.getUserReview(props.transaction.id) || '';

    // Show dialog
    showReviewDialog.value = true;
}

function setRating(value: number) {
    rating.value = value;
}

// Debounced review submission
const debouncedSubmitReview = debounce(() => {
    engagementStore.saveReview(props.transaction.id, {
        rating: rating.value,
        comment: reviewComment.value,
        timestamp: Date.now()
    });

    // Show success message
    showReviewDialog.value = false;
    showToast('Review submitted successfully');
}, 300);

function submitReview() {
    debouncedSubmitReview();
}

function copyShareLink() {
    if (!linkInput.value) return;

    linkInput.value.select();
    document.execCommand('copy');

    showToast('Link copied to clipboard');
}

function showToast(message: string) {
    toastMessage.value = message;

    setTimeout(() => {
        toastMessage.value = '';
    }, 3000);
}

function getTransactionTypeText(type: TransactionType): string {
    switch (type) {
        case TransactionType.STREAM_PAYMENT:
            return 'streaming payment';
        case TransactionType.ESSENCE_EARNED:
            return 'essence earned';
        case TransactionType.TOKEN_MINTED:
            return 'minted token';
        case TransactionType.TOKEN_ENCHANTED:
            return 'enchanted token';
        default:
            return 'transaction';
    }
}
</script>

<style scoped>
.engagement-panel {
    padding: 0.75rem 0 0;
}

.engagement-reactions {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
}

.reaction-btn {
    background: none;
    border: none;
    padding: 0.25rem 0.5rem;
    border-radius: 50px;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.875rem;
}

.reaction-emoji {
    display: inline-block;
    transform: scale(1);
    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.reaction-btn:hover .reaction-emoji {
    transform: scale(1.2);
}

.reaction-count {
    font-size: 0.75rem;
}

.engagement-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
}

.action-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    background: none;
    border: none;
    padding: 0.25rem 0.5rem;
    font-size: 0.8125rem;
    cursor: pointer;
    transition: all 0.2s ease;
}

.action-label {
    font-size: 0.75rem;
}

.engagement-achievements {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
}

.achievement-badge {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border-radius: 50px;
    font-size: 0.75rem;
}

.achievement-icon {
    font-size: 0.875rem;
}

/* Share Dialog */
.share-dialog-backdrop,
.review-dialog-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1050;
}

.share-dialog,
.review-dialog {
    width: 90%;
    max-width: 400px;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
    overflow: hidden;
}

.share-header,
.review-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #eee;
}

.share-header h4,
.review-header h4 {
    margin: 0;
    font-size: 1.125rem;
}

.dialog-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    opacity: 0.6;
}

.dialog-close:hover {
    opacity: 1;
}

.share-content,
.review-content {
    padding: 1rem;
}

.share-link {
    display: flex;
    margin: 1rem 0;
}

.share-link input {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-right: none;
    border-radius: 4px 0 0 4px;
}

.copy-btn {
    background: #f0f0f0;
    border: 1px solid #ddd;
    border-radius: 0 4px 4px 0;
    padding: 0 0.75rem;
    cursor: pointer;
}

.share-options {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 1.5rem;
}

.share-option {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    color: white;
    cursor: pointer;
}

.share-option.twitter {
    background-color: #1DA1F2;
}

.share-option.discord {
    background-color: #5865F2;
}

.share-option.telegram {
    background-color: #0088cc;
}

/* Star Rating */
.star-rating {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin: 1rem 0;
}

.star-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: #f59e0b;
    cursor: pointer;
}

.review-comment {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin: 1rem 0;
    font-family: inherit;
}

.review-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
}

/* Toast Message */
.toast-message {
    position: fixed;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%) translateY(100%);
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 50px;
    font-size: 0.875rem;
    z-index: 1060;
    opacity: 0;
    transition: all 0.3s ease;
}

.toast-message.show {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
}

/* Theme-specific styles */
.roman-theme .reaction-btn {
    background-color: rgba(213, 195, 170, 0.1);
}

.roman-theme .reaction-btn.active {
    background-color: rgba(212, 175, 55, 0.15);
}

.roman-theme .achievement-badge {
    background-color: #f9f5ef;
    border: 1px solid #d5c3aa;
    color: #8B4513;
}

.roman-theme .share-dialog,
.roman-theme .review-dialog {
    background-color: #fcf8f3;
    border: 1px solid #d5c3aa;
}

/* Arc theme styles */
.arc-theme .reaction-btn {
    background-color: rgba(226, 232, 240, 0.3);
}

.arc-theme .reaction-btn.active {
    background-color: rgba(99, 102, 241, 0.1);
    color: var(--arc-primary);
}

.arc-theme .achievement-badge {
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    color: var(--arc-text-primary);
}

.arc-theme .share-dialog,
.arc-theme .review-dialog {
    background-color: white;
    border: none;
    border-radius: 16px;
    box-shadow: var(--arc-shadow);
}

/* Vacay theme styles */
.vacay-theme .reaction-btn {
    background-color: rgba(224, 247, 250, 0.3);
}

.vacay-theme .reaction-btn.active {
    background-color: rgba(33, 150, 243, 0.1);
    color: var(--vacay-primary);
}

.vacay-theme .achievement-badge {
    background-color: rgba(255, 255, 255, 0.7);
    box-shadow: var(--vacay-shadow-sm);
    color: var(--vacay-text);
}

.vacay-theme .share-dialog,
.vacay-theme .review-dialog {
    background-color: white;
    border-radius: 16px;
    box-shadow: var(--vacay-shadow);
}
</style>
