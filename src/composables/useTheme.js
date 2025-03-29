import { ref, provide, inject, computed } from 'vue';

export const themeDefinitions = {
  'roman-theme': {
    fonts: {
      heading: "'Trajan Pro', 'Times New Roman', serif",
      body: "'Cinzel', serif"
    },
    colors: {
      primary: '#8B4513',
      secondary: '#D4AF37',
      surface: '#fcf8f3',
      border: '#d5c3aa',
      text: '#5D4037'
    },
    shadows: {
      default: '0 2px 4px rgba(139, 69, 19, 0.2)',
      elevated: '0 4px 8px rgba(139, 69, 19, 0.3)'
    }
  },
  'arc-theme': {
    fonts: {
      heading: "'Montserrat', sans-serif",
      body: "'Inter', sans-serif"
    },
    colors: {
      primary: '#3498db',
      secondary: '#2ecc71',
      surface: '#f8f9fa',
      border: '#dee2e6',
      text: '#343a40'
    },
    shadows: {
      default: '0 2px 8px rgba(0, 0, 0, 0.1)',
      elevated: '0 8px 16px rgba(0, 0, 0, 0.1)'
    }
  },
  'vacay-theme': {
    fonts: {
      heading: "'Pacifico', cursive",
      body: "'Quicksand', sans-serif"
    },
    colors: {
      primary: '#00bcd4',
      secondary: '#ff9800',
      surface: '#e0f7fa',
      border: '#b2ebf2',
      text: '#006064'
    },
    shadows: {
      default: '0 2px 6px rgba(0, 188, 212, 0.2)',
      elevated: '0 6px 12px rgba(0, 188, 212, 0.3)'
    }
  }
};

export function provideTheme() {
  const currentTheme = ref('roman-theme');
  const themeProperties = computed(() => themeDefinitions[currentTheme.value]);

  function setTheme(themeName) {
    if (themeDefinitions[themeName]) {
      currentTheme.value = themeName;
      document.documentElement.className = themeName;
    }
  }

  provide('theme', {
    current: currentTheme,
    properties: themeProperties,
    setTheme
  });

  return {
    currentTheme,
    themeProperties,
    setTheme
  };
}

export function useTheme() {
  return inject('theme', {
    current: ref('roman-theme'),
    properties: computed(() => themeDefinitions['roman-theme']),
    setTheme: () => console.warn('Theme provider not found')
  });
}
