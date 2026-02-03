-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge base chunks table for RAG
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Content
    content TEXT NOT NULL,
    content_hash TEXT NOT NULL, -- To detect duplicates

    -- Metadata
    source_file TEXT NOT NULL, -- e.g., "CONFIGURATION.md", "DASHBOARD.md"
    section_title TEXT, -- e.g., "Gmail Setup", "Provider Credentials"
    doc_type TEXT NOT NULL DEFAULT 'user_guide', -- user_guide, architecture, troubleshooting

    -- Vector embedding - dynamic dimensions based on model
    -- Common dimensions: 384 (all-minilm), 768 (nomic), 1024 (bge/mxbai), 1536 (openai-small), 3072 (openai-large)
    -- Note: pgvector HNSW index has 2000 dimension limit. Models >2000 dims use sequential scan.
    embedding vector(1536), -- Default to 1536, can be altered per model needs

    -- Tracking
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version TEXT NOT NULL, -- Package version when chunk was created

    -- Prevent duplicates
    UNIQUE(content_hash)
);

-- Index for vector similarity search (HNSW for better performance)
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
ON knowledge_chunks
USING hnsw (embedding vector_cosine_ops);

-- Index for metadata filtering
CREATE INDEX IF NOT EXISTS knowledge_chunks_source_idx ON knowledge_chunks(source_file);
CREATE INDEX IF NOT EXISTS knowledge_chunks_type_idx ON knowledge_chunks(doc_type);

-- Function to search knowledge base
-- Note: query_embedding can be any dimension - pgvector handles dynamic sizing
CREATE OR REPLACE FUNCTION search_knowledge(
    query_embedding vector,
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 5,
    model_filter text DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    source_file TEXT,
    section_title TEXT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        knowledge_chunks.id,
        knowledge_chunks.content,
        knowledge_chunks.source_file,
        knowledge_chunks.section_title,
        1 - (knowledge_chunks.embedding <=> query_embedding) AS similarity
    FROM knowledge_chunks
    WHERE
        (model_filter IS NULL OR knowledge_chunks.version = model_filter)
        AND 1 - (knowledge_chunks.embedding <=> query_embedding) > match_threshold
    ORDER BY knowledge_chunks.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_knowledge_chunks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_knowledge_chunks_updated_at
BEFORE UPDATE ON knowledge_chunks
FOR EACH ROW
EXECUTE FUNCTION update_knowledge_chunks_updated_at();

-- Comments for documentation
COMMENT ON TABLE knowledge_chunks IS 'Chunked knowledge base for RAG (Retrieval-Augmented Generation)';
COMMENT ON COLUMN knowledge_chunks.embedding IS 'Vector embedding for semantic search (1536 dims for text-embedding-3-small)';
COMMENT ON FUNCTION search_knowledge IS 'Semantic search function - returns top K similar chunks';
