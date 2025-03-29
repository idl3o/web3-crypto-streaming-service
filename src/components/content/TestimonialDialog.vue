<template>
  <div class="testimonial-dialog" :class="theme">
    <div class="dialog-header">
      <h3>Testimonials for "{{ content.title }}"</h3>
      <button class="close-btn" @click="closeDialog">
        <i class="fas fa-times"></i>
      </button>
    </div>
    
    <div class="dialog-body">
      <div class="testimonial-stats">
        <div class="stat-rating">
          <div class="big-rating">{{ averageRating.toFixed(1) }}</div>
          <div class="rating-stars">
            <div class="stars">
              <i class="fas fa-star" v-for="i in Math.floor(averageRating)" :key="i"></i>
              <i class="fas fa-star-half-alt" v-if="averageRating % 1 >= 0.5"></i>
              <i class="far fa-star" v-for="i in (5-Math.ceil(averageRating))" :key="`empty-${i}`"></i>
            </div>
            <div class="rating-count">{{ content.testimonials?.length || 0 }} reviews</div>
          </div>
        </div>
        
        <div class="rating-breakdown">
          <div class="rating-bar" v-for="i in 5" :key="`bar-${i}`">
            <span class="star-level">{{ 6-i }} stars</span>
            <div class="bar-container">
              <div class="bar-fill" :style="{ width: ratingPercentage(6-i) + '%' }"></div>
            </div>
            <span class="bar-count">{{ ratingCount(6-i) }}</span>
          </div>
        </div>
      </div>
      
      <div class="testimonial-actions">
        <button class="add-testimonial-btn" @click="showAddForm = !showAddForm">
          <i class="fas" :class="showAddForm ? 'fa-chevron-up' : 'fa-plus'"></i>
          {{ showAddForm ? 'Cancel' : 'Add Your Testimonial' }}
        </button>
        <div class="filter-actions">
          <label>
            <span>Sort by:</span>
            <select v-model="sortOption">
              <option value="newest">Newest first</option>
              <option value="highest">Highest rated</option>
              <option value="lowest">Lowest rated</option>
            </select>
          </label>
        </div>
      </div>
      
      <!-- Add testimonial form -->
      <div class="add-testimonial-form" v-if="showAddForm">
        <div v-if="formError" class="form-error">{{ formError }}</div>
        
        <div class="form-group">
          <label>Your Rating</label>
          <div class="rating-input">
            <i 
              v-for="star in 5" 
              :key="`input-star-${star}`"
              :class="[
                'rating-star', 
                star <= newRating ? 'fas fa-star selected' : 'far fa-star'
              ]"
              @click="newRating = star"
            ></i>
          </div>
        </div>
        
        <div class="form-group">
          <label>Your Name</label>
          <input type="text" v-model="newAuthor" placeholder="Enter your name">
        </div>
        
        <div class="form-group">
          <label>Your Testimonial</label>
          <textarea 
            v-model="newText" 
            placeholder="Share your experience with this content..."
            rows="3"
          ></textarea>
        </div>
        
        <button class="submit-btn" @click="submitTestimonial" :disabled="isSubmitting">
          <span v-if="isSubmitting"><i class="fas fa-spinner fa-spin"></i> Submitting...</span>
          <span v-else>Submit Testimonial</span>
        </button>
      </div>
      
      <!-- Testimonial list -->
      <div class="testimonial-list" v-if="hasTestimonials">
        <div 
          v-for="(testimonial, index) in sortedTestimonials" 
          :key="testimonial.id || index" 
          class="testimonial-item"
        >
          <div class="testimonial-header">
            <div class="testimonial-author">{{ testimonial.author }}</div>
            <div class="testimonial-date">{{ formatDate(testimonial.date) }}</div>
          </div>
          
          <div class="testimonial-rating">
            <i class="fas fa-star" v-for="i in testimonial.rating" :key="`t-star-${i}-${index}`"></i>
            <i class="far fa-star" v-for="i in (5-testimonial.rating)" :key="`t-empty-${i}-${index}`"></i>
          </div>
          
          <p class="testimonial-text">{{ testimonial.text }}</p>
        </div>
      </div>
      
      <div v-else-if="!isSubmitting" class="no-testimonials">
        <i class="fas fa-comments"></i>
        <p>No testimonials yet. Be the first to leave a review!</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue';

const props = defineProps({
  content: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['close', 'addTestimonial']);
const theme = inject('currentTheme', 'roman-theme');

// State for testimonial list
const sortOption = ref('newest');
const showAddForm = ref(false);
const formError = ref('');
const isSubmitting = ref(false);

// New testimonial form data
const newRating = ref(5);
const newAuthor = ref('');
const newText = ref('');

const hasTestimonials = computed(() => {
  return props.content.testimonials && props.content.testimonials.length > 0;
});

const averageRating = computed(() => {
  if (!hasTestimonials.value) return 0;
  
  const sum = props.content.testimonials.reduce((acc, t) => acc + (t.rating || 0), 0);
  return sum / props.content.testimonials.length;
});

const sortedTestimonials = computed(() => {
  if (!hasTestimonials.value) return [];
  
  const testimonials = [...props.content.testimonials];
  
  switch(sortOption.value) {
    case 'newest':
      return testimonials.sort((a, b) => new Date(b.date) - new Date(a.date));
    case 'highest':
      return testimonials.sort((a, b) => b.rating - a.rating);
    case 'lowest':
      return testimonials.sort((a, b) => a.rating - b.rating);
    default:
      return testimonials;
  }
});

function ratingCount(stars) {
  if (!hasTestimonials.value) return 0;
  return props.content.testimonials.filter(t => t.rating === stars).length;
}

function ratingPercentage(stars) {
  if (!hasTestimonials.value) return 0;
  const count = ratingCount(stars);
  return (count / props.content.testimonials.length) * 100;
}

function formatDate(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

async function submitTestimonial() {
  // Form validation
  if (newAuthor.value.trim() === '') {
    formError.value = 'Please enter your name';
    return;
  }
  
  if (newText.value.trim() === '') {
    formError.value = 'Please enter your testimonial';
    return;
  }
  
  try {
    isSubmitting.value = true;
    formError.value = '';
    
    // Create testimonial object
    const testimonial = {
      id: Date.now().toString(),
      author: newAuthor.value.trim(),
      text: newText.value.trim(),
      rating: newRating.value,
      date: new Date().toISOString()
    };
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Emit event to parent component
    emit('addTestimonial', testimonial);
    
    // Reset form
    newAuthor.value = '';
    newText.value = '';
    newRating.value = 5;
    showAddForm.value = false;
    
  } catch (error) {
    console.error('Error submitting testimonial:', error);
    formError.value = 'Failed to submit testimonial. Please try again.';
  } finally {
    isSubmitting.value = false;
  }
}

function closeDialog() {
  emit('close');
}
</script>

<style scoped>
.testimonial-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  width: 600px;
  max-width: 95%;
  max-height: 90vh;
  overflow-y: auto;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.dialog-header h3 {
  margin: 0;
  font-size: 1.3rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.close-btn:hover {
  opacity: 1;
}

.dialog-body {
  margin-bottom: 20px;
}

.testimonial-stats {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.stat-rating {
  display: flex;
  align-items: center;
}

.big-rating {
  font-size: 2.5rem;
  font-weight: bold;
  margin-right: 15px;
}

.rating-stars {
  display: flex;
  flex-direction: column;
}

.stars {
  color: #FFB400;
  font-size: 1rem;
}

.rating-count {
  margin-top: 5px;
  font-size: 0.85rem;
  color: #666;
}

.rating-breakdown {
  flex-grow: 1;
  max-width: 60%;
}

.rating-bar {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
}

.star-level {
  width: 55px;
  font-size: 0.85rem;
  text-align: right;
  margin-right: 10px;
}

.bar-container {
  flex-grow: 1;
  height: 8px;
  background-color: #eee;
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background-color: #FFB400;
}

.bar-count {
  width: 25px;
  font-size: 0.85rem;
  margin-left: 10px;
  text-align: left;
}

.testimonial-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.add-testimonial-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 20px;
  background-color: #4CAF50;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: background-color 0.2s;
}

.add-testimonial-btn:hover {
  background-color: #43A047;
}

.add-testimonial-btn i {
  font-size: 0.85rem;
}

.filter-actions {
  display: flex;
  align-items: center;
}

.filter-actions label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
}

.filter-actions select {
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.add-testimonial-form {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}

.form-error {
  background-color: #ffebee;
  color: #d32f2f;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
  font-size: 0.9rem;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 5px;
  font-size: 0.9rem;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
}

.rating-input {
  display: flex;
  gap: 5px;
}

.rating-star {
  font-size: 1.5rem;
  cursor: pointer;
  color: #ccc;
  transition: color 0.2s;
}

.rating-star:hover {
  color: #FFB400;
}

.rating-star.selected {
  color: #FFB400;
}

.submit-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background-color: #4CAF50;
  color: white;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.submit-btn:hover {
  background-color: #43A047;
}

.submit-btn:disabled {
  background-color: #A5D6A7;
  cursor: not-allowed;
}

.testimonial-list {
  margin-top: 20px;
}

.testimonial-item {
  padding: 15px;
  border-bottom: 1px solid #eee;
}

.testimonial-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.testimonial-author {
  font-weight: 600;
}

.testimonial-date {
  font-size: 0.85rem;
  color: #666;
}

.testimonial-rating {
  color: #FFB400;
  margin-bottom: 8px;
}

.testimonial-text {
  margin: 0;
  line-height: 1.5;
}

.no-testimonials {
  text-align: center;
  padding: 30px 0;
  color: #777;
}

.no-testimonials i {
  font-size: 2.5rem;
  color: #ddd;
  margin-bottom: 10px;
}

/* Roman theme overrides */
.roman-theme .testimonial-dialog {
  border: 1px solid #d5c3aa;
  background-color: #fcf8f3;
}

.roman-theme .dialog-header h3 {
  font-family: 'Trajan Pro', 'Times New Roman', serif;
  color: #8B4513;
}

.roman-theme .stars,
.roman-theme .testimonial-rating,
.roman-theme .rating-star.selected,
.roman-theme .rating-star:hover {
  color: #CD7F32;
}

.roman-theme .bar-fill {
  background-color: #CD7F32;
}

.roman-theme .testimonial-stats {
  border-bottom-color: #d5c3aa;
}

.roman-theme .add-testimonial-btn {
  background-color: #8B4513;
}

.roman-theme .add-testimonial-btn:hover {
  background-color: #A0522D;
}

.roman-theme .submit-btn {
  background-color: #8B4513;
}

.roman-theme .submit-btn:hover {
  background-color: #A0522D;
}

.roman-theme .submit-btn:disabled {
  background-color: #DEB887;
}

.roman-theme .testimonial-item {
  border-bottom-color: #d5c3aa;
}

.roman-theme .add-testimonial-form {
  background-color: #f5eee6;
}
</style>
