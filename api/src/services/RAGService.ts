/**
 * RAG Service - Retrieval-Augmented Generation
 * Handles semantic search and context retrieval from knowledge base
 * Follows realtimex-alchemy pattern for embedding provider resolution
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { SDKService } from './SDKService.js';

export interface RetrievedChunk {
    id: string;
    content: string;
    source_file: string;
    section_title?: string;
    similarity: number;
}

export interface RAGContext {
    chunks: RetrievedChunk[];
    contextText: string;
    sources: string[];
}

export class RAGService {
    private supabase: SupabaseClient;

    constructor(supabase: SupabaseClient) {
        this.supabase = supabase;
    }

    /**
     * Generate embedding for a query using RealTimeX SDK
     * Follows realtimex-alchemy pattern with provider resolution
     */
    async embedQuery(
        query: string,
        settings?: { embedding_provider?: string; embedding_model?: string }
    ): Promise<number[]> {
        const sdk = SDKService.getSDK();
        if (!sdk) {
            throw new Error('RealTimeX SDK not available for embedding');
        }

        try {
            // Resolve embedding provider dynamically from SDK (realtimex-alchemy pattern)
            const { provider, model } = await SDKService.resolveEmbedProvider(settings || {});

            console.log(`[RAGService] Using embedding provider: ${provider}/${model}`);

            // Generate embedding with resolved provider/model
            const response = await sdk.llm.embed(query, {
                provider,
                model
            });

            // Extract first embedding from response (realtimex-alchemy pattern)
            const embedding = response.embeddings?.[0];
            if (!embedding) {
                throw new Error('No embedding returned from SDK');
            }

            return embedding;
        } catch (error: any) {
            console.error('[RAGService] Embedding failed:', error);
            throw new Error(`Failed to generate embedding: ${error.message}`);
        }
    }

    /**
     * Retrieve relevant knowledge chunks for a query
     */
    async retrieve(
        query: string,
        options: {
            topK?: number;
            similarityThreshold?: number;
            sourceFilter?: string[];
            lang?: string;
            settings?: { embedding_provider?: string; embedding_model?: string };
        } = {}
    ): Promise<RAGContext> {
        const {
            topK = 5,
            similarityThreshold = 0.7,
            sourceFilter,
            lang = 'en',
            settings
        } = options;

        // 1. Generate query embedding
        console.log('[RAGService] Generating query embedding...');
        const queryEmbedding = await this.embedQuery(query, settings);

        // 2. Search knowledge base
        console.log(`[RAGService] Searching knowledge base (topK=${topK}, threshold=${similarityThreshold}, lang=${lang})...`);
        console.log(`[RAGService] Query embedding dimensions: ${queryEmbedding.length}`);

        // Try searching with language filter
        let { data, error } = await this.supabase.rpc('search_knowledge', {
            query_embedding: queryEmbedding,
            match_threshold: similarityThreshold,
            match_count: topK,
            model_filter: null,
            lang_filter: lang
        });

        // Fallback: If no results found with language filter (or if lang is invalid), try without filter (only if lang wasn't 'en')
        // This handles cases where a specific language might not have content yet, falling back to English (default)
        if (!error && (!data || data.length === 0) && lang !== 'en') {
            console.log(`[RAGService] No results for lang='${lang}', falling back to 'en'...`);
            const fallbackResult = await this.supabase.rpc('search_knowledge', {
                query_embedding: queryEmbedding,
                match_threshold: similarityThreshold,
                match_count: topK,
                model_filter: null,
                lang_filter: 'en'
            });
            
            if (!fallbackResult.error) {
                data = fallbackResult.data;
                error = null;
            }
        }

        if (error) {
            console.error('[RAGService] Search failed:', error);
            console.error('[RAGService] Error details:', JSON.stringify(error, null, 2));
            throw new Error(`Knowledge base search failed: ${error.message}`);
        }

        if (!data || data.length === 0) {
            console.warn('[RAGService] No relevant chunks found with threshold', similarityThreshold);
            console.warn('[RAGService] Try lowering the similarity threshold or check if embeddings are properly stored');
            return {
                chunks: [],
                contextText: '',
                sources: []
            };
        }

        // 3. Filter by source if specified
        let chunks = data as RetrievedChunk[];
        if (sourceFilter && sourceFilter.length > 0) {
            chunks = chunks.filter(c => sourceFilter.includes(c.source_file));
        }

        console.log(`[RAGService] Retrieved ${chunks.length} relevant chunks`);
        chunks.forEach(c => {
            console.log(`  - ${c.source_file} (${c.section_title || 'Untitled'}) - similarity: ${c.similarity.toFixed(3)}`);
        });

        // 4. Construct context text
        const contextText = this.constructContext(chunks);

        // 5. Extract unique sources
        const sources = [...new Set(chunks.map(c => c.source_file))];

        return {
            chunks,
            contextText,
            sources
        };
    }

    /**
     * Construct formatted context text from retrieved chunks
     */
    private constructContext(chunks: RetrievedChunk[]): string {
        if (chunks.length === 0) {
            return 'No relevant documentation found for this query.';
        }

        let context = '# Retrieved Documentation\n\n';

        chunks.forEach((chunk, index) => {
            const sourceInfo = chunk.section_title
                ? `${chunk.source_file} - ${chunk.section_title}`
                : chunk.source_file;

            context += `## Source ${index + 1}: ${sourceInfo}\n`;
            context += `**Relevance: ${(chunk.similarity * 100).toFixed(1)}%**\n\n`;
            context += `${chunk.content}\n\n`;
            context += '---\n\n';
        });

        return context;
    }

    /**
     * Get knowledge base statistics
     */
    async getStats(): Promise<{
        totalChunks: number;
        sourceFiles: string[];
        version?: string;
    }> {
        const { data, error, count } = await this.supabase
            .from('knowledge_chunks')
            .select('source_file, version', { count: 'exact' });

        if (error) {
            console.error('[RAGService] Failed to get stats:', error);
            return { totalChunks: 0, sourceFiles: [] };
        }

        const sourceFiles = [...new Set((data || []).map(d => d.source_file))];
        const version = data && data.length > 0 ? data[0].version : undefined;

        return {
            totalChunks: count || 0,
            sourceFiles,
            version
        };
    }

    /**
     * Health check - verify RAG system is operational
     */
    async healthCheck(): Promise<{
        healthy: boolean;
        chunksAvailable: number;
        embeddingWorking: boolean;
        embeddingProvider?: string;
        error?: string;
    }> {
        try {
            // Check if chunks exist
            const { count } = await this.supabase
                .from('knowledge_chunks')
                .select('*', { count: 'exact', head: true });

            if (!count || count === 0) {
                return {
                    healthy: false,
                    chunksAvailable: 0,
                    embeddingWorking: false,
                    error: 'No knowledge chunks found. Run: npm run ingest:knowledge'
                };
            }

            // Test embedding and get provider info
            let embeddingWorking = true;
            let embeddingProvider = 'unknown';
            try {
                // Test with a simple query
                await this.embedQuery('test');
                // Get the current provider
                const { provider, model } = await SDKService.resolveEmbedProvider({});
                embeddingProvider = `${provider}/${model}`;
            } catch {
                embeddingWorking = false;
            }

            return {
                healthy: count > 0 && embeddingWorking,
                chunksAvailable: count,
                embeddingWorking,
                embeddingProvider
            };
        } catch (error: any) {
            return {
                healthy: false,
                chunksAvailable: 0,
                embeddingWorking: false,
                error: error.message
            };
        }
    }
}
