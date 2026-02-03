# RAG System Documentation

## Overview

The Email-Automator AI agent uses **RAG (Retrieval-Augmented Generation)** to provide accurate, grounded answers based on user documentation.

Instead of sending the entire knowledge base with every request (static injection), RAG:
1. **Embeds** the user's question into a vector
2. **Retrieves** the most relevant documentation chunks from Supabase
3. **Augments** the LLM prompt with only relevant context
4. **Generates** an answer based on retrieved docs

## Architecture

```
User Question
    ↓
[Embed Question]  ← RealTimeX SDK embed
    ↓
[Vector Search]   ← Supabase pgvector
    ↓
[Retrieve Top K Chunks]
    ↓
[Construct Prompt with Retrieved Context]
    ↓
[LLM Generate]    ← RealTimeX SDK chat
    ↓
Answer + Sources
```

## Database Schema

### `knowledge_chunks` Table

Stores chunked documentation with vector embeddings:

```sql
- id: UUID (primary key)
- content: TEXT (the chunk content)
- content_hash: TEXT (SHA-256 for deduplication)
- source_file: TEXT (e.g., "CONFIGURATION.md")
- section_title: TEXT (e.g., "Gmail Setup")
- doc_type: TEXT (user_guide, architecture, etc.)
- embedding: vector(1536) (OpenAI text-embedding-3-small)
- version: TEXT (package version)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### Indexes

- **Vector similarity**: HNSW index on `embedding` for fast cosine similarity search
- **Metadata filters**: Indexes on `source_file` and `doc_type`

## Setup

### Option 1: Automated Setup (Recommended)

Use the migration script which handles everything:

```bash
# Interactive (prompts for credentials)
./scripts/migrate.sh

# Non-interactive (for CI/CD)
SUPABASE_PROJECT_ID=your-project-id \
SUPABASE_ANON_KEY=your-anon-key \
./scripts/migrate.sh
```

This automatically:
1. Links to your Supabase project
2. Pushes database schema (creates `knowledge_chunks` table, pgvector, etc.)
3. Ingests knowledge base (generates embeddings and populates DB)
4. Deploys Edge Functions

### Option 2: Manual Setup

**1. Run Migration**

```bash
# Apply the RAG migration
npx supabase db push

# Or if using local Supabase
npx supabase migration up
```

This creates:
- `knowledge_chunks` table
- pgvector extension
- `search_knowledge()` function
- Necessary indexes

**2. Ingest Knowledge Base**

```bash
# Set credentials first
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_ANON_KEY=your-anon-key

# Generate embeddings and populate database
npm run ingest:knowledge
```

This script:
1. Reads all files from `docs/user-guide/*.md`
2. Chunks them by H2 sections
3. Generates embeddings using RealTimeX SDK
4. Stores in Supabase with metadata

**Expected output:**
```
📚 Starting knowledge base ingestion...
   Version: 2.21.4
   Source: docs/user-guide

📖 Found 6 user guide files
   ACCOUNT.md: 3 chunks
   AUTOMATION.md: 5 chunks
   CONFIGURATION.md: 4 chunks
   DASHBOARD.md: 6 chunks
   GETTING-STARTED.md: 3 chunks
   TROUBLESHOOTING.md: 4 chunks

📦 Total chunks: 25

🔮 Generating embeddings and inserting...
[1/25] ✓ ACCOUNT.md - Account Management
[2/25] ✓ ACCOUNT.md - Profile
...
[25/25] ✓ TROUBLESHOOTING.md - AI Issues

📊 Ingestion Summary:
   ✓ Success: 25
   ❌ Errors: 0
   📦 Total: 25

✓ Verified: 25 chunks in database for version 2.21.4
```

### 3. Configure Environment

Ensure these environment variables are set:

```bash
# Supabase (for RAG storage)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# RealTimeX SDK (for embeddings and chat)
# Already configured if using Email-Automator
```

## Usage

### AgentService API

The `AgentService` now uses RAG automatically:

```typescript
import { AgentService } from './services/AgentService';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(supabaseUrl, supabaseKey);
const agentService = new AgentService(supabase);

const response = await agentService.chat(
    userId,
    "How do I configure Gmail?",
    { page_id: 'configuration_wizard' },
    []
);

// Response includes relevant documentation chunks
console.log(response.content);
```

### RAGService Directly

For custom retrieval:

```typescript
import { RAGService } from './services/RAGService';

const ragService = new RAGService(supabase);

// Retrieve relevant chunks
const result = await ragService.retrieve(
    "How do I set up automation rules?",
    {
        topK: 5,
        similarityThreshold: 0.7,
        sourceFilter: ['AUTOMATION.md', 'CONFIGURATION.md']
    }
);

console.log(`Found ${result.chunks.length} relevant chunks`);
console.log(`Sources: ${result.sources.join(', ')}`);
console.log(result.contextText);
```

## Configuration

### Retrieval Parameters

**topK** (default: 5)
- Number of most relevant chunks to retrieve
- Higher = more context, but may include less relevant info
- Recommended: 3-7

**similarityThreshold** (default: 0.7)
- Minimum cosine similarity (0-1) for a chunk to be considered relevant
- Higher = stricter matching, may miss relevant docs
- Lower = more permissive, may include irrelevant docs
- Recommended: 0.65-0.8

**sourceFilter** (optional)
- Array of source files to restrict search
- Useful for page-specific contexts
- Example: `['CONFIGURATION.md', 'DASHBOARD.md']`

## Updating Documentation

When you update user guides in `docs/user-guide/*.md`:

1. **Update the documentation files**
   ```bash
   vim docs/user-guide/CONFIGURATION.md
   ```

2. **Re-ingest the knowledge base**
   ```bash
   npm run ingest:knowledge
   ```

This replaces all chunks for the current version, ensuring the RAG system uses the latest docs.

## Monitoring & Health Check

### Health Check Endpoint

```typescript
const ragService = new RAGService(supabase);
const health = await ragService.healthCheck();

console.log(health);
// {
//   healthy: true,
//   chunksAvailable: 25,
//   embeddingWorking: true
// }
```

### Statistics

```typescript
const stats = await ragService.getStats();

console.log(stats);
// {
//   totalChunks: 25,
//   sourceFiles: ['ACCOUNT.md', 'AUTOMATION.md', ...],
//   version: '2.21.4'
// }
```

## Troubleshooting

### "No relevant chunks found"

**Cause:** No documentation chunks match the query above the similarity threshold

**Solutions:**
- Lower `similarityThreshold` (e.g., 0.6 instead of 0.7)
- Increase `topK` to retrieve more chunks
- Check if knowledge base is populated: `npm run ingest:knowledge`

### "RealTimeX SDK not available for embedding"

**Cause:** SDK not initialized or not running

**Solutions:**
- Ensure RealTimeX Desktop is running
- Check SDK initialization in `SDKService`
- Verify environment variables

### "Knowledge base search failed"

**Cause:** Database query error (possibly pgvector not enabled)

**Solutions:**
- Run migration: `npx supabase db push`
- Verify pgvector extension: `SELECT * FROM pg_extension WHERE extname = 'vector';`
- Check Supabase connection

### Embeddings taking too long

**Cause:** Generating embeddings for many chunks sequentially

**Solutions:**
- The ingestion script includes rate limiting (100ms delay)
- For large docs, consider batching or parallel processing
- Use OpenAI API directly for faster embedding (requires API key)

## Performance

### Embedding Generation
- **Time per chunk**: ~200-500ms (varies by model)
- **Total ingestion time**: ~25 chunks × 300ms = ~7-10 seconds
- **Rate limiting**: 100ms between requests to avoid overwhelming API

### Retrieval Speed
- **Vector search**: ~50-200ms (pgvector HNSW index)
- **Total retrieval**: ~300-500ms (embed query + search)
- **Scales well**: Performance remains constant as knowledge base grows

## Comparison: Static vs RAG

| Aspect | Static Injection | RAG |
|--------|------------------|-----|
| **Token cost** | ~16KB every request | ~2-3KB (only relevant chunks) |
| **Latency** | Low (~200ms) | Medium (~500ms, includes retrieval) |
| **Scalability** | Poor (grows linearly) | Good (constant retrieval time) |
| **Accuracy** | Good (all context) | Better (focused context) |
| **Maintenance** | Build-time generation | Ingest after doc updates |
| **Complexity** | Low | Medium (requires vector DB) |

## Future Enhancements

### 1. Hybrid Search
Combine vector search with keyword search for better recall:
```sql
-- Add full-text search index
ALTER TABLE knowledge_chunks ADD COLUMN tsv tsvector;
CREATE INDEX tsv_idx ON knowledge_chunks USING GIN(tsv);
```

### 2. Metadata Filtering
Use page context to filter chunks:
```typescript
ragService.retrieve(query, {
    topK: 5,
    sourceFilter: getRelevantSources(currentPageId)
});
```

### 3. User Feedback Loop
Track which chunks were helpful:
```sql
CREATE TABLE chunk_feedback (
    chunk_id UUID REFERENCES knowledge_chunks(id),
    helpful BOOLEAN,
    user_query TEXT
);
```

### 4. Re-ranking
Use a cross-encoder to re-rank retrieved chunks:
```typescript
const retrieved = await ragService.retrieve(query);
const reranked = await rerankChunks(query, retrieved.chunks);
```

## Related Files

- `supabase/migrations/20260203000003_add_knowledge_base_rag.sql` - Database schema
- `scripts/ingest-knowledge-rag.ts` - Ingestion script
- `api/src/services/RAGService.ts` - RAG logic
- `api/src/services/AgentService.ts` - Agent with RAG integration
- `api/src/routes/agent.ts` - API endpoint
