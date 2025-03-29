import { ref } from 'vue';

// Toast options interface
interface ToastOptions {
    type?: 'success' | 'error' | 'warning' | 'info' | '';
    duration?: number;
    closable?: boolean;
    withProgress?: boolean;
}

// Global toast handler component reference
const toastHandler = ref<any>(null);

// Service methods
export const toastService = {
    setHandler(handler: any) {
        toastHandler.value = handler;
    },

    show(message: string, options?: ToastOptions) {
        if (!toastHandler.value) {
            console.warn('Toast handler not set. Call setHandler first.');
            return;
        }
        return toastHandler.value.show(message, options);
    },

    success(message: string, options?: ToastOptions) {
        if (!toastHandler.value) {
            console.warn('Toast handler not set. Call setHandler first.');
            return;
        }
        return toastHandler.value.success(message, options);
    },

    error(message: string, options?: ToastOptions) {
        if (!toastHandler.value) {
            console.warn('Toast handler not set. Call setHandler first.');
            return;
        }
        return toastHandler.value.error(message, options);
    },

    warning(message: string, options?: ToastOptions) {
        if (!toastHandler.value) {
            console.warn('Toast handler not set. Call setHandler first.');
            return;
        }
        return toastHandler.value.warning(message, options);
    },

    info(message: string, options?: ToastOptions) {
        if (!toastHandler.value) {
            console.warn('Toast handler not set. Call setHandler first.');
            return;
        }
        return toastHandler.value.info(message, options);
    },

    dismiss(id: number) {
        if (!toastHandler.value) return;
        toastHandler.value.dismiss(id);
    },

    clear() {
        if (!toastHandler.value) return;
        toastHandler.value.clear();
    }
};
