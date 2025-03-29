import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/responsive.css'
import './assets/minimal-mode.css';

const app = createApp(App)

// Initialize global theme system
app.provide('currentTheme', 'roman-theme')

app.use(router)
app.mount('#app')

// Bootstrap services that need to be initialized on startup
import * as BlockchainService from './services/BlockchainService'
import * as RiceSecurityService from './services/RiceAdvancedNetworkSecurityService'
import * as MinimalModeService from './services/MinimalModeService';

// Initialize core services
async function initializeServices() {
    try {
        await BlockchainService.init();
    } catch (error) {
        console.error(error);
    }

    try {
        await RiceSecurityService.initSecurityService();
    } catch (error) {
        console.error(error);
    }

    try {
        await MinimalModeService.initMinimalModeService();
        console.log('MinimalMode Service initialized');
    } catch (error) {
        console.error('Error initializing MinimalMode Service:', error);
    }
}

initializeServices();
