<template>
  <div class="toggle-switch" :class="{ 'toggle-disabled': disabled }">
    <input 
      type="checkbox" 
      :id="switchId" 
      :checked="value"
      @change="handleToggle"
      :disabled="disabled"
    />
    <label :for="switchId" class="toggle-track">
      <div class="toggle-indicator"></div>
    </label>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  value: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['input']);

// Generate a unique ID for the switch
const switchId = computed(() => {
  return `toggle-${Math.random().toString(36).substring(2, 9)}`;
});

function handleToggle(event) {
  emit('input', event.target.checked);
}
</script>

<style scoped>
.toggle-switch {
  position: relative;
  display: inline-block;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-track {
  display: block;
  width: 40px;
  height: 24px;
  background-color: #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.toggle-indicator {
  position: absolute;
  left: 3px;
  top: 3px;
  width: 18px;
  height: 18px;
  background-color: white;
  border-radius: 50%;
  transition: all 0.3s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

input:checked + .toggle-track {
  background-color: #3b82f6;
}

input:checked + .toggle-track .toggle-indicator {
  left: calc(100% - 21px);
}

.toggle-disabled .toggle-track {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
