#!/usr/bin/env node
/**
 * Quick RAG diagnostic script
 * Tests if RAG retrieval is working and shows embedding details
 */

import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise(resolve => rl.question(prompt, resolve));
}

async function main() {
    console.log('=== RAG Diagnostic Tool ===\n');

    const supabaseUrl = await question('Enter Supabase URL: ');
    const supabaseKey = await question('Enter Supabase Anon Key: ');

    const supabase = createClient(supabaseUrl.trim(), supabaseKey.trim());

    console.log('\n1. Checking knowledge_chunks table...');

    // Check if chunks exist
    const { count, error: countError } = await supabase
        .from('knowledge_chunks')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('❌ Error counting chunks:', countError.message);
        rl.close();
        return;
    }

    if (!count || count === 0) {
        console.error('❌ No knowledge chunks found!');
        console.log('\nRun this command to ingest documentation:');
        console.log('  npm run ingest:knowledge');
        rl.close();
        return;
    }

    console.log(`✓ Found ${count} knowledge chunks`);

    // Check embedding dimensions
    console.log('\n2. Checking embedding dimensions...');
    const { data: samples, error: sampleError } = await supabase
        .from('knowledge_chunks')
        .select('source_file, embedding')
        .limit(3);

    if (sampleError) {
        console.error('❌ Error fetching samples:', sampleError.message);
        rl.close();
        return;
    }

    if (!samples || samples.length === 0) {
        console.error('❌ No sample chunks found');
        rl.close();
        return;
    }

    const dimensions = samples[0].embedding?.length || 0;
    console.log(`✓ Stored embedding dimensions: ${dimensions}`);

    if (dimensions !== 1536) {
        console.warn(`⚠️  WARNING: Expected 1536 dimensions for text-embedding-3-small, got ${dimensions}`);
        console.log('   This suggests embeddings were created with a different model.');
        console.log('   You need to re-ingest: npm run ingest:knowledge');
    }

    // List source files
    console.log('\n3. Available documentation sources:');
    const { data: sources, error: sourcesError } = await supabase
        .from('knowledge_chunks')
        .select('source_file')
        .limit(100);

    if (!sourcesError && sources) {
        const uniqueSources = [...new Set(sources.map(s => s.source_file))];
        uniqueSources.forEach(source => {
            console.log(`   - ${source}`);
        });
    }

    console.log('\n✓ Diagnostic complete!');
    console.log('\nNext steps:');
    if (dimensions !== 1536) {
        console.log('  1. Re-ingest knowledge base: npm run ingest:knowledge');
        console.log('  2. Restart API server: npm run dev:api');
        console.log('  3. Test agent again');
    } else {
        console.log('  - Embeddings look correct');
        console.log('  - Check API logs when testing agent');
        console.log('  - Look for: [RAGService] Using embedding provider: realtimexai/text-embedding-3-small');
    }

    rl.close();
}

main().catch(err => {
    console.error('Error:', err);
    rl.close();
    process.exit(1);
});
