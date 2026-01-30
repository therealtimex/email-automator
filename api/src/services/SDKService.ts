import { RealtimeXSDK, ProvidersResponse } from '@realtimex/sdk';
import os from 'os';
import path from 'path';

/**
 * Centralized SDK Service
 * Manages RealTimeX SDK initialization and provides singleton access
 */
export class SDKService {
    private static instance: RealtimeXSDK | null = null;
    private static initAttempted = false;

    /**
     * Initialize SDK with required permissions
     * Safe to call multiple times - returns existing instance
     */
    static initialize(): RealtimeXSDK {
        if (!this.instance && !this.initAttempted) {
            this.initAttempted = true;

            try {
                this.instance = new RealtimeXSDK({
                    realtimex: {
                        // @ts-ignore - Dev Mode feature
                        apiKey: 'SXKX93J-QSWMB04-K9E0GRE-J5DA8J0'
                    },
                    permissions: [
                        'api.agents',       // List agents
                        'api.workspaces',   // List workspaces
                        'api.threads',      // List threads
                        'webhook.trigger',  // Trigger agents
                        'activities.read',  // Read activities
                        'activities.write', // Write activities
                        'llm.chat',         // Chat completion
                        'llm.embed',        // Generate embeddings
                        'llm.providers',    // List LLM providers (chat, embed)
                        'vectors.read',     // Query vectors
                        'vectors.write',    // Store vectors
                    ],
                });

                console.log('[SDKService] RealTimeX SDK initialized successfully');

                // Verify connection with Desktop App
                // @ts-ignore - Dev Mode feature
                this.instance.ping()
                    .then((status: any) => console.log('[SDKService] Desktop App Connection:', status))
                    .catch((err: any) => console.warn('[SDKService] Desktop App Connection failed:', err.message));

            } catch (error: any) {
                console.warn('[SDKService] Failed to initialize SDK:', error.message);
                this.instance = null;
            }
        }

        return this.instance!;
    }

    /**
     * Get SDK instance (initializes if needed)
     */
    static getSDK(): RealtimeXSDK | null {
        if (!this.instance && !this.initAttempted) {
            this.initialize();
        }
        return this.instance;
    }

    /**
     * Check if SDK is available and working
     */
    static async isAvailable(): Promise<boolean> {
        try {
            const sdk = this.getSDK();
            if (!sdk) return false;

            // Try to ping first (faster)
            try {
                // @ts-ignore - Dev Mode feature
                await sdk.ping();
                return true;
            } catch (e) {
                // Fallback to providers check if ping not available/fails
                await sdk.llm.chatProviders();
                return true;
            }
        } catch (error) {
            console.warn('[SDKService] SDK not available:', error);
            return false;
        }
    }

    /**
     * Helper to wrap a promise with a timeout
     */
    static async withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
        let timeoutHandle: any;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutHandle = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
        });

        try {
            const result = await Promise.race([promise, timeoutPromise]);
            return result as T;
        } finally {
            clearTimeout(timeoutHandle);
        }
    }
}
