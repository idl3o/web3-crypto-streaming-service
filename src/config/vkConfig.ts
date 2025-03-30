/**
 * VK (VKontakte) Integration Configuration
 */

interface VKConfig {
    clientId: string;
    apiVersion: string;
    scope: string[];
    useCommentsWidget: boolean;
    useShareWidget: boolean;
    useLikeWidget: boolean;
}

// Default VK configuration
export const vkConfig: VKConfig = {
    // Replace with your actual VK application ID
    clientId: import.meta.env.VITE_VK_CLIENT_ID || '12345678',

    apiVersion: '5.131',

    // Default requested permissions
    scope: [
        'friends',      // Access to friends list
        'photos',       // Access to photos
        'video',        // Access to videos
        'email',        // Get user email
        'wall',         // Post to user wall
        'offline',      // Token doesn't expire when user closes the browser
    ],

    // Enable/disable social widgets
    useCommentsWidget: true,
    useShareWidget: true,
    useLikeWidget: true
};

/**
 * Get VK auth callback URL
 * @returns The callback URL for VK OAuth
 */
export function getVKCallbackUrl(): string {
    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    return `${baseUrl}/auth/vk/callback`;
}

/**
 * Load the VK Open API script
 * @returns Promise that resolves when script is loaded
 */
export function loadVKOpenAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (window.VK) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://vk.com/js/api/openapi.js?169';
        script.async = true;

        script.onload = () => {
            // Initialize VK Open API
            window.VK.init({
                apiId: vkConfig.clientId,
                onlyWidgets: true
            });

            resolve();
        };

        script.onerror = () => {
            reject(new Error('Failed to load VK Open API'));
        };

        document.head.appendChild(script);
    });
}

// Add VK interface to Window object
declare global {
    interface Window {
        VK?: {
            init(params: { apiId: string; onlyWidgets?: boolean }): void;
            Widgets?: {
                Comments(elementId: string, options?: object): void;
                Like(elementId: string, options?: object): void;
            };
        };
    }
}

export default vkConfig;
