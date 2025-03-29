import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

// Notification type
interface Notification {
    id: number;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    read: boolean;
    timestamp: Date;
    action?: {
        label: string;
        handler: () => void;
    };
}

// Alert type
interface Alert {
    id: number;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    autoClose?: boolean;
    duration?: number;
}

// Modal content type
interface ModalOptions {
    title: string;
    component?: any;
    props?: Record<string, any>;
    content?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    closeOnClick?: boolean;
    actions?: Array<{
        label: string;
        handler: () => void;
        variant?: 'primary' | 'secondary' | 'danger';
    }>;
}

/**
 * UI State - Manages user interface elements, themes, and UI-related state
 */
export const useUIStore = defineStore('ui', () => {
    // State
    const darkMode = ref(localStorage.getItem('darkMode') === 'true');
    const sidebarOpen = ref(false);
    const activeModal = ref<{ id: string, options: ModalOptions } | null>(null);
    const notifications = ref<Notification[]>([]);
    const alerts = ref<Alert[]>([]);
    const isMobileView = ref(window.innerWidth < 768);
    const isPageLoading = ref(false);

    // Getters
    const hasNotifications = computed(() => notifications.value.length > 0);
    const unreadNotificationsCount = computed(() =>
        notifications.value.filter(n => !n.read).length
    );
    const hasAlerts = computed(() => alerts.value.length > 0);

    // Actions
    function toggleDarkMode() {
        darkMode.value = !darkMode.value;
        localStorage.setItem('darkMode', darkMode.value.toString());
        document.documentElement.classList.toggle('dark-theme', darkMode.value);
    }

    function toggleSidebar() {
        sidebarOpen.value = !sidebarOpen.value;
    }

    function showModal(modalId: string, options: ModalOptions) {
        activeModal.value = { id: modalId, options };
    }

    function hideModal() {
        activeModal.value = null;
    }

    function addNotification(notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) {
        notifications.value.push({
            id: Date.now(),
            read: false,
            timestamp: new Date(),
            ...notification
        });
    }

    function markNotificationAsRead(id: number) {
        const notification = notifications.value.find(n => n.id === id);
        if (notification) {
            notification.read = true;
        }
    }

    function removeNotification(id: number) {
        const index = notifications.value.findIndex(n => n.id === id);
        if (index !== -1) {
            notifications.value.splice(index, 1);
        }
    }

    function addAlert(alert: Omit<Alert, 'id'>) {
        const id = Date.now();
        alerts.value.push({ id, ...alert });

        if (alert.autoClose !== false) {
            setTimeout(() => {
                removeAlert(id);
            }, alert.duration || 5000);
        }

        return id;
    }

    function removeAlert(id: number) {
        const index = alerts.value.findIndex(a => a.id === id);
        if (index !== -1) {
            alerts.value.splice(index, 1);
        }
    }

    function setMobileView(isMobile: boolean) {
        isMobileView.value = isMobile;
    }

    function setPageLoading(loading: boolean) {
        isPageLoading.value = loading;
    }

    // Initialize
    function initialize() {
        // Apply dark mode on initialization
        document.documentElement.classList.toggle('dark-theme', darkMode.value);

        // Set up responsive listener
        window.addEventListener('resize', () => {
            setMobileView(window.innerWidth < 768);
        });

        return true;
    }

    // Call initialize
    initialize();

    return {
        // State
        darkMode,
        sidebarOpen,
        activeModal,
        notifications,
        alerts,
        isMobileView,
        isPageLoading,

        // Getters
        hasNotifications,
        unreadNotificationsCount,
        hasAlerts,

        // Actions
        toggleDarkMode,
        toggleSidebar,
        showModal,
        hideModal,
        addNotification,
        markNotificationAsRead,
        removeNotification,
        addAlert,
        removeAlert,
        setMobileView,
        setPageLoading
    };
});
