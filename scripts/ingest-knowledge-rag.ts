#!/usr/bin/env tsx
/**
 * Ingest knowledge base into Supabase for RAG
 * Chunks documentation and generates embeddings
 * Run: npm run ingest:knowledge
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { SDKService } from '../api/src/services/SDKService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const DOCS_ROOT = path.join(ROOT_DIR, 'docs');
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf-8'));

// Language to ingest for RAG (English only)
const SUPPORTED_LANGUAGES = ['en'];

// Initialize Supabase client
// Prefer SERVICE_ROLE_KEY for admin operations (bypasses RLS)
// Fallback to ANON_KEY only if service role not available
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials.');
    console.error('   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)');
    process.exit(1);
}

// Log which key type we're using (for debugging)
const keyType = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 'ANON';
console.log(`🔑 Using Supabase ${keyType} key`);

const supabase = createClient(supabaseUrl, supabaseKey);

interface Chunk {
    content: string;
    source_file: string;
    section_title?: string;
    doc_type: string;
    lang: string;
}

/**
 * Split markdown content into chunks by sections
 */
function chunkMarkdown(content: string, sourceFile: string, docType: string = 'user_guide', lang: string): Chunk[] {
    const chunks: Chunk[] = [];

    // Split by H2 headers (##)
    const sections = content.split(/(?=^## )/m);

    for (const section of sections) {
        const trimmed = section.trim();
        if (!trimmed || trimmed.length < 50) continue; // Skip very small chunks

        // Extract section title
        const titleMatch = trimmed.match(/^##\s+(.+)/);
        const normalizedTitle = titleMatch
            ? titleMatch[1]
                // Strip non-ASCII to avoid lone surrogate issues in JSON payloads.
                // EXCEPTION: Keep non-ASCII for non-English languages to preserve meaning
                // .replace(/[^\x20-\x7E]/g, '')
                .replace(/\s{2,}/g, ' ')
                .trim()
            : '';
        const sectionTitle = normalizedTitle.length > 0 ? normalizedTitle : undefined;

        // Clean content
        const cleanedContent = trimmed
            // Remove excessive newlines
            .replace(/\n{3,}/g, '\n\n')
            // Remove markdown image syntax
            .replace(/!\[.*?\]\(.*?\)/g, '')
            .trim();

        chunks.push({
            content: cleanedContent,
            source_file: sourceFile,
            section_title: sectionTitle,
            doc_type: docType,
            lang: lang
        });
    }

    return chunks;
}

/**
 * Generate content hash for deduplication
 */
function hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Generate embedding using RealTimeX SDK
 * Follows realtimex-alchemy pattern with provider resolution
 */
async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const sdk = SDKService.getSDK();
        if (!sdk) {
            throw new Error('RealTimeX SDK not available');
        }

        // Resolve embedding provider dynamically from SDK (realtimex-alchemy pattern)
        const { provider, model } = await SDKService.resolveEmbedProvider({});

        // Generate embedding with resolved provider/model
        const response = await sdk.llm.embed(text, {
            provider,
            model
        });

        // Extract first embedding from response (realtimex-alchemy pattern)
        const embedding = response.embeddings?.[0];
        if (!embedding) {
            throw new Error('No embedding returned from SDK');
        }

        return embedding;
    } catch (error) {
        console.error('Failed to generate embedding with SDK:', error);
        throw error;
    }
}

/**
 * Main ingestion function
 */
async function ingestKnowledge() {
    console.log('📚 Starting knowledge base ingestion...');
    console.log(`   Version: ${packageJson.version}`);
    console.log(`   Language: ${SUPPORTED_LANGUAGES[0]}`);

    // Initialize SDK
    try {
        SDKService.initialize();
        console.log('✓ RealTimeX SDK initialized');

        // Get and display embedding provider info
        const { provider, model } = await SDKService.resolveEmbedProvider({});
        console.log(`✓ Embedding provider: ${provider}/${model}`);
    } catch (error) {
        console.error('❌ Failed to initialize SDK:', error);
        process.exit(1);
    }

    const allChunks: Array<Chunk & { content_hash: string; version: string }> = [];

    // Process each language
    for (const lang of SUPPORTED_LANGUAGES) {
        const langDir = path.join(DOCS_ROOT, lang, 'user-guide');

        if (!fs.existsSync(langDir)) {
            console.warn(`⚠️ Warning: Documentation directory not found for language: ${lang} (${langDir})`);
            continue;
        }

        // Read all user guide files for this language
        const files = fs.readdirSync(langDir).filter(f => f.endsWith('.md'));
        console.log(`\n📖 Processing [${lang}]: Found ${files.length} user guide files`);

        // Chunk all files
        for (const file of files) {
            const content = fs.readFileSync(path.join(langDir, file), 'utf-8');
            const chunks = chunkMarkdown(content, file, 'user_guide', lang);

            console.log(`   [${lang}] ${file}: ${chunks.length} chunks`);

            for (const chunk of chunks) {
                allChunks.push({
                    ...chunk,
                    content_hash: hashContent(chunk.content),
                    version: packageJson.version
                });
            }
        }
    }

    console.log(`\n📦 Total chunks: ${allChunks.length}`);

    // Smart caching: Check which chunks already exist with same content_hash
    console.log('\n🔍 Checking for unchanged chunks (smart caching)...');
    const existingHashes = new Set<string>();

    const { data: existingChunks, error: fetchError } = await supabase
        .from('knowledge_chunks')
        .select('content_hash')
        .eq('version', packageJson.version);

    if (!fetchError && existingChunks) {
        existingChunks.forEach(chunk => existingHashes.add(chunk.content_hash));
        console.log(`✓ Found ${existingHashes.size} existing chunks in database`);
    }

    // Filter out unchanged chunks
    const chunksToProcess = allChunks.filter(chunk => !existingHashes.has(chunk.content_hash));
    const skippedCount = allChunks.length - chunksToProcess.length;

    if (skippedCount > 0) {
        console.log(`⚡ Skipping ${skippedCount} unchanged chunks (smart cache hit)`);
    }

    if (chunksToProcess.length === 0) {
        console.log('\n✨ All chunks are up to date! No processing needed.');
        return;
    }

    console.log(`📝 Will process ${chunksToProcess.length} new/changed chunks`);

    // Delete chunks that are no longer in the source files
    const currentHashes = new Set(allChunks.map(c => c.content_hash));
    const hashesToDelete = Array.from(existingHashes).filter(h => !currentHashes.has(h));

    if (hashesToDelete.length > 0) {
        console.log(`\n🧹 Removing ${hashesToDelete.length} outdated chunks...`);
        const { error: deleteError } = await supabase
            .from('knowledge_chunks')
            .delete()
            .in('content_hash', hashesToDelete);

        if (!deleteError) {
            console.log('✓ Outdated chunks removed');
        }
    }

    // Generate embeddings and insert (parallel batches for speed)
    console.log('\n🔮 Generating embeddings and inserting...');
    const BATCH_SIZE = 10; // Process 10 chunks concurrently
    let successCount = 0;
    let errorCount = 0;

    // Process chunks in parallel batches
    for (let batchStart = 0; batchStart < chunksToProcess.length; batchStart += BATCH_SIZE) {
        const batch = chunksToProcess.slice(batchStart, batchStart + BATCH_SIZE);
        const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(chunksToProcess.length / BATCH_SIZE);

        console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} chunks)...`);

        // Process all chunks in this batch concurrently
        const results = await Promise.allSettled(
            batch.map(async (chunk, idx) => {
                const globalIdx = batchStart + idx;
                const progress = `[${globalIdx + 1}/${chunksToProcess.length}]`;

                try {
                    // Generate embedding
                    const embedding = await generateEmbedding(chunk.content);

                    // Upsert into database
                    const { error: insertError } = await supabase
                        .from('knowledge_chunks')
                        .upsert({
                            content: chunk.content,
                            content_hash: chunk.content_hash,
                            source_file: chunk.source_file,
                            section_title: chunk.section_title,
                            doc_type: chunk.doc_type,
                            lang: chunk.lang,
                            embedding: embedding,
                            version: chunk.version
                        }, { onConflict: 'content_hash' });

                    if (insertError) {
                        throw new Error(insertError.message);
                    }

                    return { success: true, progress, chunk };
                } catch (error: any) {
                    return { success: false, progress, chunk, error: error.message };
                }
            })
        );

        // Log results for this batch
        for (const result of results) {
            if (result.status === 'fulfilled') {
                const { success, progress, chunk, error } = result.value;
                if (success) {
                    console.log(`${progress} ✓ [${chunk.lang}] ${chunk.source_file} - ${chunk.section_title || 'Untitled'}`);
                    successCount++;
                } else {
                    console.error(`${progress} ❌ [${chunk.lang}] ${chunk.source_file}: ${error}`);
                    errorCount++;
                }
            } else {
                console.error(`Batch task rejected: ${result.reason}`);
                errorCount++;
            }
        }

        // Small delay between batches to avoid rate limits
        if (batchStart + BATCH_SIZE < chunksToProcess.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    console.log('\n📊 Ingestion Summary:');
    console.log(`   ✓ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   ⚡ Skipped (cached): ${skippedCount}`);
    console.log(`   📦 Total chunks: ${allChunks.length}`);

    // Verify ingestion
    const { count, error: countError } = await supabase
        .from('knowledge_chunks')
        .select('*', { count: 'exact', head: true })
        .eq('version', packageJson.version);

    if (countError) {
        console.error('❌ Failed to verify:', countError);
    } else {
        console.log(`\n✓ Verified: ${count} chunks in database for version ${packageJson.version}`);
    }
}

// Run ingestion
ingestKnowledge().catch(error => {
    console.error('❌ Ingestion failed:', error);
    process.exit(1);
});
