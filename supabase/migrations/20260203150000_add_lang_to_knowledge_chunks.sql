-- Add language column to knowledge_chunks for multilingual RAG.
-- Existing rows default to 'en'; re-run ingest:knowledge after deploying
-- to populate all language variants.
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS lang TEXT NOT NULL DEFAULT 'en';

-- Index for language filtering
CREATE INDEX IF NOT EXISTS knowledge_chunks_lang_idx ON knowledge_chunks(lang);

-- Drop the previous 4-param overload so CREATE OR REPLACE below is the only signature.
-- Without this, both overloads coexist and PostgREST raises PGRST203.
DROP FUNCTION IF EXISTS search_knowledge(vector, double precision, integer, text);

-- Replace search function with optional lang_filter.
-- NULL  → search across all languages (original behaviour).
-- value → restrict to that language only.
-- Fallback (retry without filter when zero rows) is handled in application code.
CREATE OR REPLACE FUNCTION search_knowledge(
    query_embedding vector,
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 5,
    model_filter text DEFAULT NULL,
    lang_filter text DEFAULT NULL
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
        AND (lang_filter IS NULL OR knowledge_chunks.lang = lang_filter)
        AND 1 - (knowledge_chunks.embedding <=> query_embedding) > match_threshold
    ORDER BY knowledge_chunks.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
