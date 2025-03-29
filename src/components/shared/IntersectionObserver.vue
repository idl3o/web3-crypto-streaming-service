<template>
  <div ref="observerElement">
    <slot></slot>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  threshold: {
    type: Number,
    default: 0.1
  },
  rootMargin: {
    type: String,
    default: '0px'
  },
  rootElement: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['intersect', 'leave']);

const observerElement = ref(null);
let observer = null;

onMounted(() => {
  // Create IntersectionObserver with configurable options
  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        emit('intersect', entry);
      } else {
        emit('leave', entry);
      }
    });
  }, {
    root: props.rootElement,
    threshold: props.threshold,
    rootMargin: props.rootMargin
  });

  // Observe the element when mounted
  if (observerElement.value) {
    observer.observe(observerElement.value);
  }
});

onBeforeUnmount(() => {
  // Clean up observer to prevent memory leaks
  if (observer && observerElement.value) {
    observer.unobserve(observerElement.value);
    observer.disconnect();
  }
});
</script>
