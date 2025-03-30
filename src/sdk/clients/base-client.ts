/**
 * Base Client for SDK API calls
 * Provides common functionality for all service clients
 */

import { SDKOptions, ApiResponse, ErrorResponse } from '../types';

export class BaseClient {
    protected baseUrl: string;
    protected options: SDKOptions;
    protected authToken?: string;

    constructor(baseUrl: string, options: SDKOptions) {
        this.baseUrl = baseUrl;
        this.options = options;
        this.authToken = options.authToken;
    }

    /**
     * Set authentication token for API requests
     */
    public setAuthToken(token: string): void {
        this.authToken = token;
    }

    /**
     * Make an API request with automatic retry and error handling
     * @protected
     */
    protected async request<T>(
        endpoint: string,
        method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
        body?: any,
        queryParams?: Record<string, string>,
        customHeaders?: Record<string, string>
    ): Promise<ApiResponse<T>> {
        const url = this.buildUrl(endpoint, queryParams);
        const headers = this.buildHeaders(customHeaders);

        let attempts = 0;
        const maxAttempts = this.options.retryAttempts || 3;

        while (attempts < maxAttempts) {
            try {
                attempts++;

                const response = await this.executeRequest<T>(url, method, headers, body);
                return response;

            } catch (error) {
                // If this was the last attempt, throw the error
                if (attempts >= maxAttempts) {
                    throw error;
                }

                // Otherwise, wait and retry
                const delay = Math.min(1000 * (2 ** (attempts - 1)), 10000);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        // This should never be reached due to the throw in the catch block above
        throw new Error('Maximum retry attempts exceeded');
    }

    /**
     * Execute a fetch request
     * @private
     */
    private async executeRequest<T>(
        url: string,
        method: string,
        headers: HeadersInit,
        body?: any
    ): Promise<ApiResponse<T>> {
        const requestOptions: RequestInit = {
            method,
            headers,
            ...(body && { body: JSON.stringify(body) }),
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeout || 30000);
        requestOptions.signal = controller.signal;

        try {
            const response = await fetch(url, requestOptions);
            clearTimeout(timeoutId);

            const responseData = await response.json();

            if (!response.ok) {
                const errorResponse: ErrorResponse = {
                    code: responseData.error?.code || `HTTP_${response.status}`,
                    message: responseData.error?.message || response.statusText,
                    details: responseData.error?.details
                };

                return {
                    success: false,
                    error: errorResponse,
                    meta: responseData.meta
                };
            }

            return {
                success: true,
                data: responseData.data,
                meta: responseData.meta
            };
        } catch (error: any) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new Error('Request timed out');
            }

            throw error;
        }
    }

    /**
     * Build a complete URL from endpoint and query parameters
     * @private
     */
    private buildUrl(endpoint: string, queryParams?: Record<string, string>): string {
        let url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

        if (queryParams && Object.keys(queryParams).length > 0) {
            const params = new URLSearchParams();

            for (const [key, value] of Object.entries(queryParams)) {
                if (value !== undefined && value !== null) {
                    params.append(key, value);
                }
            }

            url += `?${params.toString()}`;
        }

        return url;
    }

    /**
     * Build request headers including authorization if available
     * @private
     */
    private buildHeaders(customHeaders?: Record<string, string>): HeadersInit {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-SDK-Version': '1.0.0',
            ...customHeaders
        };

        if (this.options.apiKey) {
            headers['X-API-Key'] = this.options.apiKey;
        }

        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        return headers;
    }
}
