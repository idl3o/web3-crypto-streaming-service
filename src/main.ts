import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { world } from './core/world';
import { logger } from './modules/logger';

// Create app instance
const app = createApp(App);
const pinia = createPinia();

// Use plugins
app.use(pinia);
app.use(router);

// Mount app
app.mount('#app');

// Initialize the world
world.run({ autoConnect: false })
    .then(success => {
        if (success) {
            logger.info('Application world successfully initialized');
        } else {
            logger.error('Application world initialization encountered issues');
        }
    })
    .catch(error => {
        logger.error('Critical error during world initialization:', error);
    });

// Add global error handler
app.config.errorHandler = (err, instance, info) => {
    logger.error('Vue Error:', err, info);
};

// Export the app instance
export default app;
