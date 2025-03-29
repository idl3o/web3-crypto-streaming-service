<template>
  <div class="theme-toggler" :class="currentTheme">
    <div class="theme-options">
      <button 
        v-for="theme in availableThemes" 
        :key="theme.name"
        :class="['theme-option', { active: currentTheme === theme.name }]"
        :title="`Switch to ${theme.label} theme`"
        @click="setTheme(theme.name)"
      >
        <span class="theme-icon" :style="{ backgroundColor: theme.color }">
          <span v-if="currentTheme === theme.name" class="active-indicator"></span>
        </span>
        <span class="theme-label">{{ theme.label }}</span>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ThemeToggler',
  props: {
    initialTheme: {
      type: String,
      default: 'default-theme'
    }
  },
  data() {
    return {
      currentTheme: this.initialTheme,
      availableThemes: [
        { name: 'default-theme', label: 'Default', color: '#3498db' },
        { name: 'dark-theme', label: 'Dark', color: '#2c3e50' },
        { name: 'roman-theme', label: 'Roman', color: '#8B4513' },
        { name: 'uranium-theme', label: 'Uranium', color: '#4eff91' }
      ]
    };
  },
  methods: {
    setTheme(theme) {
      // Remove current theme class from document
      document.documentElement.classList.remove(this.currentTheme);
      
      // Set new theme
      this.currentTheme = theme;
      document.documentElement.classList.add(theme);
      
      // Store preference
      localStorage.setItem('preferredTheme', theme);
      
      // Emit event for parent components
      this.$emit('theme-changed', theme);
    }
  },
  mounted() {
    // Check for saved preference
    const savedTheme = localStorage.getItem('preferredTheme');
    if (savedTheme && this.availableThemes.some(t => t.name === savedTheme)) {
      this.setTheme(savedTheme);
    } else if (this.initialTheme) {
      this.setTheme(this.initialTheme);
    }
  }
};
</script>

<style scoped>
.theme-toggler {
  display: inline-block;
  margin: 10px 0;
  padding: 5px;
  border-radius: 8px;
}

.theme-options {
  display: flex;
  gap: 8px;
}

.theme-option {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-option:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.theme-option.active {
  border-color: currentColor;
  background-color: rgba(0, 0, 0, 0.1);
}

.theme-icon {
  height: 20px;
  width: 20px;
  border-radius: 50%;
  margin-right: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
}

.theme-label {
  font-size: 0.9rem;
  font-weight: 500;
}

.active-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: white;
}

/* Theme-specific styles */
.uranium-theme .theme-toggler {
  background-color: var(--uranium-bg-medium);
  border: 1px solid var(--uranium-border);
  box-shadow: var(--uranium-shadow-sm);
}

.uranium-theme .theme-option {
  color: var(--uranium-text-primary);
}

.uranium-theme .theme-option:hover {
  background-color: var(--uranium-bg-light);
}

.uranium-theme .theme-option.active {
  border-color: var(--uranium-primary);
  background-color: var(--uranium-secondary);
  box-shadow: var(--uranium-primary-glow);
}

@media screen and (max-width: 768px) {
  .theme-label {
    display: none;
  }
  
  .theme-icon {
    margin-right: 0;
  }
  
  .theme-option {
    padding: 6px;
  }
}
</style>
