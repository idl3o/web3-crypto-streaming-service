<template>
    <div id="mobile-app">
        <div v-if="platform" class="platform-indicator" :class="platform">
            <span>{{ platform.toUpperCase() }}</span>
        </div>
        <App />
        <mobile-navigation v-if="isMobile" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import App from './App.vue';
import MobileNavigation from '@/components/mobile/MobileNavigation.vue';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar } from '@capacitor/status-bar';
import { mapAndroidLifecycle } from '@/android/resources';

const platform = ref('');
const isMobile = ref(false);

onMounted(async () => {
    // Detect platform
    platform.value = Capacitor.getPlatform();
    isMobile.value = platform.value === 'android' || platform.value === 'ios';

    // Configure platform specifics
    if (Capacitor.isNativePlatform()) {
        // Status bar configuration
        StatusBar.setStyle({ style: Capacitor.getPlatform() === 'android' ? 'DARK' : 'LIGHT' });
        StatusBar.setBackgroundColor({ color: '#ffffff' });

        // Hide splash screen after initialization
        setTimeout(() => {
            SplashScreen.hide();
        }, 1000);

        // Register Android lifecycle events
        if (platform.value === 'android') {
            const lifecycle = mapAndroidLifecycle();
            document.addEventListener('resume', lifecycle.onResume);
            document.addEventListener('pause', lifecycle.onPause);
        }

        // Notify main app about mobile environment
        document.dispatchEvent(new CustomEvent('platformReady', {
            detail: { platform: platform.value }
        }));
    }
});
</script>

<style>
/* Mobile-specific styles */
#mobile-app {
    height: 100vh;
    width: 100vw;
    overflow-x: hidden;
    position: relative;
}

.platform-indicator {
    position: fixed;
    bottom: 10px;
    right: 10px;
    background-color: rgba(0, 0, 0, 0.6);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 10px;
    z-index: 9999;
    opacity: 0.7;
}

/* Adjust global styles for mobile */
body {
    overscroll-behavior: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
}

/* Prevent iOS double-tap zoom */
button,
a {
    touch-action: manipulation;
}
</style>
