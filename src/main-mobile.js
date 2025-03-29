import { createApp } from 'vue';
import { createPinia } from 'pinia';
import MobileApp from './MobileApp.vue';
import router from './router';
import { world } from './core/world';
import { logger } from './modules/logger';

// Create a mobile-optimized logger
logger.configure({
    logLevel: 'warn', // Reduce logging on mobile devices
    logToConsole: true,
    logToFile: false
});

// Create app instance
const app = createApp(MobileApp);
const pinia = createPinia();

// Use plugins
app.use(pinia);
app.use(router);

// Add mobile flag for component conditionals
app.config.globalProperties.$isMobile = true;
app.provide('isMobile', true);

// Mount app
app.mount('#app');

// Initialize the world with mobile-specific settings
world.run({
    autoConnect: false,
    mobileMode: true,
    offlineFirst: true
}).then(success => {
    if (success) {
        logger.info('Mobile application world successfully initialized');
    } else {
        logger.error('Mobile application world initialization encountered issues');
    }
}).catch(error => {
    logger.error('Critical error during mobile world initialization:', error);
});

// Add global error handler
app.config.errorHandler = (err, instance, info) => {
    logger.error('Vue Error in mobile app:', err, info);
};

// Handle Android back button
document.addEventListener('backbutton', (e) => {
    e.preventDefault();

    if (window.history.length > 1) {
        router.back();
    } else {
        if (confirm('Do you want to exit the app?')) {
            navigator.app?.exitApp();
        }
    }
});
