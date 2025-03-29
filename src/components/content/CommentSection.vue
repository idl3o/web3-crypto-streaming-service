<template>
  <div class="card border-0 shadow-sm mb-4">
    <div class="card-header bg-white">
      <h5 class="card-title mb-0">Discussion ({{ comments.length }})</h5>
    </div>
    <div class="card-body">
      <div class="mb-4">
        <div class="d-flex mb-3">
          <img :src="userAvatar" alt="User Avatar" class="rounded-circle me-2" width="40" height="40">
          <div class="flex-grow-1">
            <textarea class="form-control" rows="2" placeholder="Add a comment..." v-model="newComment"></textarea>
          </div>
        </div>
        <div class="text-end">
          <button class="btn btn-primary btn-sm" @click="addComment" :disabled="!newComment.trim()">
            Comment
          </button>
        </div>
      </div>

      <!-- Comment List -->
      <div class="comment-list">
        <div v-for="(comment, index) in comments" :key="index" class="d-flex mb-3">
          <img :src="comment.avatar" alt="User Avatar" class="rounded-circle me-2" width="32" height="32">
          <div>
            <div class="d-flex align-items-center mb-1">
              <h6 class="mb-0 me-2">{{ comment.author }}</h6>
              <small class="text-muted">{{ comment.time }}</small>
            </div>
            <p class="mb-1">{{ comment.text }}</p>
            <div class="d-flex align-items-center small">
              <a href="#" class="text-muted text-decoration-none me-3" @click.prevent="likeComment(index)">
                <i class="fas fa-thumbs-up me-1"></i> {{ comment.likes }}
              </a>
              <a href="#" class="text-muted text-decoration-none me-3" @click.prevent="replyToComment(index)">
                <i class="fas fa-reply me-1"></i> Reply
              </a>
            </div>

            <!-- Nested replies -->
            <div v-for="(reply, replyIndex) in comment.replies" :key="`reply-${index}-${replyIndex}`" class="d-flex mt-3">
              <img :src="reply.avatar" alt="User Avatar" class="rounded-circle me-2" width="28" height="28">
              <div>
                <div class="d-flex align-items-center mb-1">
                  <h6 class="mb-0 me-2">{{ reply.author }}</h6>
                  <small class="text-muted">{{ reply.time }}</small>
                </div>
                <p class="mb-1">{{ reply.text }}</p>
                <div class="d-flex align-items-center small">
                  <a href="#" class="text-muted text-decoration-none me-3" @click.prevent="likeReply(index, replyIndex)">
                    <i class="fas fa-thumbs-up me-1"></i> {{ reply.likes }}
                  </a>
                </div>
              </div>
            </div>

            <!-- Reply input (conditionally shown) -->
            <div v-if="replyingTo === index" class="d-flex mt-3">
              <div class="flex-grow-1">
                <textarea class="form-control form-control-sm" rows="1" placeholder="Write a reply..." v-model="newReply"></textarea>
                <div class="d-flex justify-content-end mt-2">
                  <button class="btn btn-sm btn-outline-secondary me-2" @click="cancelReply">Cancel</button>
                  <button class="btn btn-sm btn-primary" @click="submitReply(index)" :disabled="!newReply.trim()">Reply</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- More comments button -->
        <div v-if="hasMoreComments" class="text-center mt-4">
          <button class="btn btn-light" @click="loadMoreComments">
            Load more comments
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  contentId: {
    type: String,
    required: true
  },
  userAvatar: {
    type: String,
    default: 'https://via.placeholder.com/40?text=You'
  }
});

// State
const comments = ref([
  {
    author: 'Alice',
    avatar: 'https://via.placeholder.com/32?text=A',
    text: 'Great content! I\'m learning a lot from this series. Can\'t wait for the next episode.',
    time: '5 minutes ago',
    likes: 12,
    replies: []
  },
  {
    author: 'Bob',
    avatar: 'https://via.placeholder.com/32?text=B',
    text: 'Could you explain more about gas optimization? I\'m struggling with high transaction costs.',
    time: '10 minutes ago',
    likes: 5,
    replies: [
      {
        author: 'Crypto Academy',
        avatar: 'https://via.placeholder.com/28?text=CA',
        text: 'We\'ll cover gas optimization in episode 3! Stay tuned.',
        time: '3 minutes ago',
        likes: 3
      }
    ]
  }
]);
const newComment = ref('');
const newReply = ref('');
const replyingTo = ref(null);

// Computed
const hasMoreComments = computed(() => comments.value.length < 10);

// Methods
function addComment() {
  if (!newComment.value.trim()) return;
  
  comments.value.unshift({
    author: 'You',
    avatar: props.userAvatar,
    text: newComment.value,
    time: 'Just now',
    likes: 0,
    replies: []
  });
  
  newComment.value = '';
}

function replyToComment(index) {
  replyingTo.value = index;
  newReply.value = '';
}

function cancelReply() {
  replyingTo.value = null;
  newReply.value = '';
}

function submitReply(index) {
  if (!newReply.value.trim()) return;
  
  comments.value[index].replies.push({
    author: 'You',
    avatar: props.userAvatar,
    text: newReply.value,
    time: 'Just now',
    likes: 0
  });
  
  cancelReply();
}

function likeComment(index) {
  comments.value[index].likes++;
}

function likeReply(commentIndex, replyIndex) {
  comments.value[commentIndex].replies[replyIndex].likes++;
}

function loadMoreComments() {
  // Add more mock comments
  comments.value.push(
    {
      author: 'Charlie',
      avatar: 'https://via.placeholder.com/32?text=C',
      text: 'This explanation about Web3 primitives is really helpful!',
      time: '20 minutes ago',
      likes: 3,
      replies: []
    },
    {
      author: 'Diana',
      avatar: 'https://via.placeholder.com/32?text=D',
      text: 'Are you planning to cover cross-chain functionality in future videos?',
      time: '30 minutes ago',
      likes: 2,
      replies: []
    }
  );
}
</script>
