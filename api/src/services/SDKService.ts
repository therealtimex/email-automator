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

    // Cache for default providers (avoid repeated SDK calls)
    private static defaultChatProvider: { provider: string; model: string } | null = null;
    private static defaultEmbedProvider: { provider: string; model: string } | null = null;

    /**
     * Get default chat provider/model from SDK dynamically
     * Caches result to avoid repeated SDK calls
     */
    static async getDefaultChatProvider(): Promise<{ provider: string; model: string }> {
        // Return cached if available
        if (this.defaultChatProvider) {
            return this.defaultChatProvider;
        }

        const sdk = this.getSDK();
        if (!sdk) {
            throw new Error('RealTimeX SDK not available. Cannot determine default LLM provider.');
        }

        try {
            const { providers } = await this.withTimeout<ProvidersResponse>(
                sdk.llm.chatProviders(),
                30000,
                'Chat providers fetch timed out'
            );

            if (!providers || providers.length === 0) {
                throw new Error('No LLM providers available. Please configure a provider in RealTimeX Desktop.');
            }

            // Find first provider with available models
            for (const p of providers) {
                if (p.models && p.models.length > 0) {
                    this.defaultChatProvider = {
                        provider: p.provider,
                        model: p.models[0].id
                    };
                    console.log(`[SDKService] Default chat provider: ${this.defaultChatProvider.provider}/${this.defaultChatProvider.model}`);
                    return this.defaultChatProvider;
                }
            }

            throw new Error('No LLM models available. Please configure a model in RealTimeX Desktop.');
        } catch (error: any) {
            console.error('[SDKService] Failed to get default chat provider:', error.message);
            throw error;
        }
    }

    /**
     * Get default embedding provider/model from SDK dynamically
     * Caches result to avoid repeated SDK calls
     */
    static async getDefaultEmbedProvider(): Promise<{ provider: string; model: string }> {
        // Return cached if available
        if (this.defaultEmbedProvider) {
            return this.defaultEmbedProvider;
        }

        const sdk = this.getSDK();
        if (!sdk) {
            throw new Error('RealTimeX SDK not available. Cannot determine default embedding provider.');
        }

        try {
            const { providers } = await this.withTimeout<ProvidersResponse>(
                sdk.llm.embedProviders(),
                30000,
                'Embed providers fetch timed out'
            );

            if (!providers || providers.length === 0) {
                throw new Error('No embedding providers available. Please configure a provider in RealTimeX Desktop.');
            }

            // Find first provider with available models
            for (const p of providers) {
                if (p.models && p.models.length > 0) {
                    this.defaultEmbedProvider = {
                        provider: p.provider,
                        model: p.models[0].id
                    };
                    console.log(`[SDKService] Default embed provider: ${this.defaultEmbedProvider.provider}/${this.defaultEmbedProvider.model}`);
                    return this.defaultEmbedProvider;
                }
            }

            throw new Error('No embedding models available. Please configure a model in RealTimeX Desktop.');
        } catch (error: any) {
            console.error('[SDKService] Failed to get default embed provider:', error.message);
            throw error;
        }
    }

    // Default provider/model configuration
    // realtimexai routes through RealTimeX Desktop to user's configured providers
    static readonly DEFAULT_LLM_PROVIDER = 'realtimexai';
    static readonly DEFAULT_LLM_MODEL = 'gpt-4o-mini';
    static readonly DEFAULT_EMBED_PROVIDER = 'realtimexai';
    static readonly DEFAULT_EMBED_MODEL = 'text-embedding-3-small';

    /**
     * Resolve LLM provider/model - use settings if available, otherwise use defaults
     */
    static async resolveChatProvider(settings: { llm_provider?: string; llm_model?: string }): Promise<{ provider: string; model: string }> {
        // If both provider and model are set in settings, use them
        if (settings.llm_provider && settings.llm_model) {
            return { provider: settings.llm_provider, model: settings.llm_model };
        }

        // Try to get from SDK discovery first
        try {
            return await this.getDefaultChatProvider();
        } catch (error) {
            // Fallback to hardcoded defaults if SDK discovery fails
            console.log(`[SDKService] Using default LLM: ${this.DEFAULT_LLM_PROVIDER}/${this.DEFAULT_LLM_MODEL}`);
            return { provider: this.DEFAULT_LLM_PROVIDER, model: this.DEFAULT_LLM_MODEL };
        }
    }

    /**
     * Resolve embedding provider/model - use settings if available, otherwise use defaults
     */
    static async resolveEmbedProvider(settings: { embedding_provider?: string; embedding_model?: string }): Promise<{ provider: string; model: string }> {
        // If both provider and model are set in settings, use them
        if (settings.embedding_provider && settings.embedding_model) {
            return { provider: settings.embedding_provider, model: settings.embedding_model };
        }

        // Try to get from SDK discovery first
        try {
            return await this.getDefaultEmbedProvider();
        } catch (error) {
            // Fallback to hardcoded defaults if SDK discovery fails
            console.log(`[SDKService] Using default embedding: ${this.DEFAULT_EMBED_PROVIDER}/${this.DEFAULT_EMBED_MODEL}`);
            return { provider: this.DEFAULT_EMBED_PROVIDER, model: this.DEFAULT_EMBED_MODEL };
        }
    }

    /**
     * Clear provider cache (useful when providers change)
     */
    static clearProviderCache(): void {
        this.defaultChatProvider = null;
        this.defaultEmbedProvider = null;
    }
}
