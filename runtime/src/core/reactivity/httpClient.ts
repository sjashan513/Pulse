import { createResource, Resource } from '../reactivity/createResource';
import type { HttpClientOptions, HttpGetOptions, IHttpClient } from './internals/types';
import { untrack } from './internals/untrack';

class HttpClient implements IHttpClient {
    private baseUrl: string;
    private defaultOptions: HttpClientOptions;

    constructor(baseUrl: string = '', defaultOptions: HttpClientOptions = {}) {
        this.baseUrl = baseUrl;
        this.defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...defaultOptions.headers,
            },
            ...defaultOptions,
        };
    }

    /**
     * The core request pipeline. All requests will pass through here.
     * This is where interceptors will be added in the future.
     */
    private async _request<T>(url: string, options: HttpClientOptions): Promise<T> {
        // --- INTERCEPTOR PIPELINE (Future Enhancement) ---
        // 1. Run request interceptors (e.g., to add auth tokens)
        // const finalOptions = this.runRequestInterceptors(options);

        const finalUrl = `${this.baseUrl}${url}`;
        const finalOptions = { ...this.defaultOptions, ...options };

        if (finalOptions.body) {
            finalOptions.body = JSON.stringify(finalOptions.body);
        }

        const response = await fetch(finalUrl, finalOptions as RequestInit);

        if (!response.ok) {
            // Create a structured error for better debugging.
            const errorPayload = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, payload: ${errorPayload}`);
        }

        // Handle cases where the response might be empty (e.g., a 204 No Content)
        const text = await response.text();
        return text ? JSON.parse(text) : ({} as T);

        // --- INTERCEPTOR PIPELINE (Future Enhancement) ---
        // 2. Run response interceptors (e.g., for global error logging)
    }

    /**
     * Performs a GET request. Always returns a Resource.
     * If a `source` is provided, the Resource is reactive.
     * If not, the Resource fetches once and then holds the state.
     */
    public get<T>(url: string, options: HttpGetOptions = {}): Resource<T> {
        const { source, ...fetchOptions } = options;

        // Our "Smart Router" logic. We always use createResource for GET requests.
        return createResource<any, T>(
            // If no source is provided, create a static one that runs once.
            source || (() => true),
            // The fetcher function that createResource will manage.
            async (_, { signal }) => {
                // We need to dynamically construct the URL if the source changes.
                // The untrack is important to avoid creating a dependency loop.
                const dynamicUrl = url.replace(/\{\{(.*?)\}\}/g, (_, key) => untrack(() => source ? source()[key] : ''));
                return this._request<T>(dynamicUrl, { ...fetchOptions, method: 'GET', signal });
            }
        );
    }

    /**
     * Performs a POST request. Returns a Promise for "fire and forget" actions.
     */
    public post<T>(url: string, options: HttpClientOptions = {}): Promise<T> {
        return this._request<T>(url, { ...options, method: 'POST' });
    }

    /**
     * Performs a PUT request. Returns a Promise.
     */
    public put<T>(url: string, options: HttpClientOptions = {}): Promise<T> {
        return this._request<T>(url, { ...options, method: 'PUT' });
    }

    /**
     * Performs a DELETE request. Returns a Promise.
     */
    public delete<T>(url: string, options: HttpClientOptions = {}): Promise<T> {
        return this._request<T>(url, { ...options, method: 'DELETE' });
    }
}

// Export a singleton instance for the developer to use throughout their app.
export const httpClient = new HttpClient();
