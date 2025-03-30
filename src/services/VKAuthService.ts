/**
 * VKontakte Authentication Service
 * Handles authentication flow and API interactions with VK social network
 */

export interface VKUserProfile {
    id: number;
    first_name: string;
    last_name: string;
    photo_200: string; // Profile photo URL
    screen_name: string;
    verified?: 0 | 1;
    friend_status?: number;
    email?: string;
}

export interface VKAuthParams {
    clientId: string;
    redirectUri: string;
    scope: string[];
    responseType?: string;
}

export interface VKAuthResult {
    accessToken: string;
    expiresIn: number;
    userId: number;
    email?: string;
    profile?: VKUserProfile;
}

export class VKAuthService {
    private readonly BASE_AUTH_URL = 'https://oauth.vk.com/authorize';
    private readonly API_VERSION = '5.131';
    private readonly API_URL = 'https://api.vk.com/method';

    private accessToken: string | null = null;
    private userId: number | null = null;
    private expiresAt: number | null = null;

    constructor(private readonly clientId: string, private readonly redirectUri: string = window.location.origin) {
        // Load saved token on initialization
        this.loadSavedAuth();
    }

    /**
     * Check if user is currently authenticated with VK
     */
    public isAuthenticated(): boolean {
        if (!this.accessToken || !this.expiresAt) {
            return false;
        }

        // Check if token is expired
        return Date.now() < this.expiresAt;
    }

    /**
     * Initiate VK authentication flow
     * @param scope Requested permissions
     */
    public authorize(scope: string[] = ['friends', 'photos', 'email', 'wall']): void {
        const authParams = {
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            scope: scope.join(','),
            response_type: 'token',
            v: this.API_VERSION,
            display: 'popup',
            state: this.generateState()
        };

        // Build URL with query parameters
        const authUrl = `${this.BASE_AUTH_URL}?${new URLSearchParams(authParams).toString()}`;

        // Open authentication window
        window.location.href = authUrl;
    }

    /**
     * Process authentication response from VK OAuth redirect
     */
    public async handleAuthResponse(): Promise<VKAuthResult | null> {
        // Check if URL contains access token
        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        const accessToken = hashParams.get('access_token');
        const expiresIn = parseInt(hashParams.get('expires_in') || '0', 10);
        const userId = parseInt(hashParams.get('user_id') || '0', 10);
        const email = hashParams.get('email');

        if (!accessToken || !userId) {
            return null;
        }

        // Save authentication data
        this.setAuthData(accessToken, userId, expiresIn);

        // Get user profile
        const profile = await this.getUserProfile();

        return {
            accessToken,
            expiresIn,
            userId,
            email: email || undefined,
            profile
        };
    }

    /**
     * Get VK user profile information
     */
    public async getUserProfile(): Promise<VKUserProfile | undefined> {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated with VK');
        }

        try {
            const fields = [
                'first_name', 'last_name', 'screen_name',
                'photo_200', 'verified', 'friend_status'
            ].join(',');

            const response = await fetch(
                `${this.API_URL}/users.get?` +
                `access_token=${this.accessToken}&` +
                `user_ids=${this.userId}&` +
                `fields=${fields}&` +
                `v=${this.API_VERSION}`
            );

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.error_msg || 'Failed to get user profile');
            }

            return data.response?.[0];
        } catch (error) {
            console.error('Error fetching VK user profile:', error);
            return undefined;
        }
    }

    /**
     * Share content to VK wall
     * @param message Text message to share
     * @param attachments Optional attachments (photos, links, etc.)
     * @param latitude Optional location latitude
     * @param longitude Optional location longitude
     */
    public async shareToWall(
        message: string,
        attachments?: string[],
        latitude?: number,
        longitude?: number
    ): Promise<{ post_id: number } | undefined> {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated with VK');
        }

        try {
            const queryParams = new URLSearchParams({
                access_token: this.accessToken!,
                v: this.API_VERSION,
                message
            });

            if (attachments && attachments.length > 0) {
                queryParams.append('attachments', attachments.join(','));
            }

            if (latitude !== undefined && longitude !== undefined) {
                queryParams.append('lat', latitude.toString());
                queryParams.append('long', longitude.toString());
            }

            const response = await fetch(
                `${this.API_URL}/wall.post`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: queryParams.toString()
                }
            );

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.error_msg || 'Failed to share to wall');
            }

            return data.response;
        } catch (error) {
            console.error('Error sharing to VK wall:', error);
            return undefined;
        }
    }

    /**
     * Get VK friends list
     * @param fields Optional additional fields to request
     */
    public async getFriends(fields?: string[]): Promise<VKUserProfile[]> {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated with VK');
        }

        try {
            const queryParams = new URLSearchParams({
                access_token: this.accessToken!,
                v: this.API_VERSION,
                count: '1000',
                order: 'hints'
            });

            if (fields && fields.length > 0) {
                queryParams.append('fields', fields.join(','));
            }

            const response = await fetch(
                `${this.API_URL}/friends.get?${queryParams.toString()}`
            );

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.error_msg || 'Failed to get friends');
            }

            return data.response?.items || [];
        } catch (error) {
            console.error('Error fetching VK friends:', error);
            return [];
        }
    }

    /**
     * Logout from VK
     */
    public logout(): void {
        // Clear stored data
        this.accessToken = null;
        this.userId = null;
        this.expiresAt = null;

        // Remove from localStorage
        localStorage.removeItem('vk_auth_data');
    }

    // Private methods

    /**
     * Generate random state parameter for OAuth security
     */
    private generateState(): string {
        return Math.random().toString(36).substring(2);
    }

    /**
     * Save authentication data
     */
    private setAuthData(accessToken: string, userId: number, expiresIn: number): void {
        this.accessToken = accessToken;
        this.userId = userId;
        this.expiresAt = Date.now() + (expiresIn * 1000);

        // Save to localStorage for persistence
        localStorage.setItem('vk_auth_data', JSON.stringify({
            accessToken,
            userId,
            expiresAt: this.expiresAt
        }));
    }

    /**
     * Load saved authentication data
     */
    private loadSavedAuth(): void {
        const savedAuth = localStorage.getItem('vk_auth_data');

        if (savedAuth) {
            try {
                const { accessToken, userId, expiresAt } = JSON.parse(savedAuth);

                if (accessToken && userId && expiresAt && Date.now() < expiresAt) {
                    this.accessToken = accessToken;
                    this.userId = userId;
                    this.expiresAt = expiresAt;
                }
            } catch (error) {
                console.error('Error loading saved VK auth data:', error);
                localStorage.removeItem('vk_auth_data');
            }
        }
    }
}

// Create singleton instance with empty config (will be initialized later)
export const vkAuthService = new VKAuthService('');
export default vkAuthService;
