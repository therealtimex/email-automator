# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Email Automator is an AI-powered email automation tool for Gmail and Outlook. It uses a **hybrid architecture** combining Supabase Edge Functions (serverless auth/database) with a local Express API (email sync/AI processing).

## Common Commands

```bash
# Development
npm run dev               # Start Vite dev server (default port 3000)
npm run dev:api           # Start Express API with hot reload (default port 3004)
npm run dev -- --port 3003  # Custom port for frontend
npm run serve -- --port 3002  # Custom port for backend

# Build & Production
npm run build             # Build frontend (tsc + vite)
npm run build:api         # Build API (tsc -p tsconfig.api.json)
npm run start             # Run production API

# Testing & Quality
npm run test              # Run vitest in watch mode
npm run test:run          # Run tests once
npm run test:coverage     # Run tests with coverage
npm run typecheck         # TypeScript check without emit
npm run lint              # ESLint for src/ and api/

# Database
./scripts/migrate.sh      # Run Supabase migrations
npx supabase db push      # Push migrations via CLI
```

## Architecture

### Hybrid Design Pattern
```
Frontend (React) → Edge Functions (Auth/DB) → Supabase Database
                 ↘ Express API (Sync/AI)    ↗
```

### Component Responsibilities

**Edge Functions** (`supabase/functions/`): OAuth flows, secure credential storage, database CRUD with RLS
- `auth-gmail/`, `auth-microsoft/`: OAuth handlers
- `api-v1-*`: Database proxy endpoints

**Express API** (`api/`): Email sync, AI processing, automation execution
- Routes: `/api/sync`, `/api/actions`, `/api/health`, etc.
- Services: `gmail.ts`, `microsoft.ts`, `intelligence.ts`, `processor.ts`

**Frontend** (`src/`): React SPA with shadcn/ui components
- `context/AppContext.tsx`: Global state management (useReducer pattern)
- `lib/api.ts`: HybridApiClient handles routing to Edge vs Express endpoints
- `core/`: Shared business logic (auth, intelligence, processor, actions)

### Key Data Flow

1. **Auth**: Frontend → Edge Function → Stores tokens in Supabase (encrypted)
2. **Sync**: Frontend → Express API → Fetches emails via Gmail/MS Graph → AI analysis → Stores in Supabase
3. **Actions**: Frontend → Express API → Executes on email provider → Updates Supabase

### Database Schema (Supabase)

Core tables with RLS enabled:
- `email_accounts`: OAuth credentials per user/provider
- `emails`: Processed emails with AI analysis (JSONB)
- `rules`: Automation rules (condition JSONB, action enum)
- `processing_logs`: Sync history
- `user_settings`: Per-user LLM and automation preferences

## Environment Configuration

**Note**: Most configuration is done via **Setup Wizard UI** (BYOK mode). Environment variables below are optional fallbacks for backend development/testing.

### Supabase (Optional - BYOK via Setup Wizard is Primary)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`: Frontend Supabase config (fallback only)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`: Backend Supabase config (fallback only)

**Primary Method**: Use Setup Wizard UI to configure Supabase - no env vars needed!

### LLM Configuration (RealTimeX SDK)

**All AI operations use RealTimeX SDK - No API keys needed!**

- **Email Analysis**: Categorization, sentiment, priority via SDK
- **RAG Agent**: Knowledge base search and chat
- **Embeddings**: Semantic search for documentation
- **TTS**: Text-to-Speech via SDK

**Setup**:
1. Install RealTimeX Desktop (download from [realtimex.ai](https://realtimex.ai))
2. Start RealTimeX Desktop (port 3001)
3. Configure providers via RealTimeX Desktop UI or Configuration page in app
4. SDK automatically discovers and uses configured providers

**Supported Providers** (via RealTimeX Desktop):
- OpenAI (GPT-4, GPT-4o-mini, etc.)
- Anthropic (Claude Opus, Sonnet, Haiku)
- Local LLMs (Ollama, LM Studio)
- Google (Gemini)
- And more...

**User Configuration**: Users switch providers via Configuration page → "LLM Settings"

### OAuth Credentials (Optional - for Gmail/Outlook)
- `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`
- `MS_GRAPH_CLIENT_ID`, `MS_GRAPH_TENANT_ID`, `MS_GRAPH_CLIENT_SECRET`

**Note**: OAuth can also be configured via Setup Wizard UI (BYOK mode)

## Important Patterns

### API Client Architecture
`src/lib/api.ts` routes requests based on endpoint type:
- `edgeRequest()`: Auth, accounts, emails, rules, settings → Supabase Edge Functions
- `expressRequest()`: Sync, actions → Local Express API

### AI Integration

**Unified RealTimeX SDK Integration:**

All AI operations use RealTimeX SDK for consistency and flexibility:

1. **Email Analysis** (`src/core/intelligence.ts`):
   - IntelligenceLayer class with Zod schemas for structured output
   - Used during email sync for categorization, sentiment, priority
   - Returns typed `EmailAnalysis` with validated fields
   - Uses RealTimeX SDK with user-configured provider

2. **RAG Agent** (`api/src/services/AgentService.ts`):
   - Context-aware chat with knowledge base retrieval
   - Dynamic provider discovery via `SDKService.resolveChatProvider()`
   - Tool execution for page-specific actions

3. **Embeddings** (`api/src/services/RAGService.ts`):
   - Semantic search using `SDKService.resolveEmbedProvider()`
   - Defaults to `realtimexai/text-embedding-3-small`
   - Skips native/local providers requiring downloads

**No API keys required** - All configuration managed through RealTimeX Desktop or Configuration UI

### State Management
`AppContext.tsx` uses reducer pattern with actions like:
- `fetchEmails`, `fetchAccounts`, `triggerSync`, `executeAction`
- All API calls return `ApiResponse<T>` with `data` or `error`

## Port Configuration

Default ports (can be overridden with `--port`):
- Frontend (Vite): 3000
- Express API: 3004
- Note: RealTimeX Desktop uses 3001/3002

Vite proxies `/api` to Express API in development.

## RealTimeX SDK Integration

### SDK Initialization
The app uses `@realtimex/sdk` for all AI operations (chat, embeddings, TTS):
- **Location**: `api/src/services/SDKService.ts`
- **Permissions**: `llm.chat`, `llm.embed`, `llm.providers`, `vectors.read/write`, `activities.read/write`
- **Connection**: Connects to RealTimeX Desktop (usually port 3001)

### Provider Resolution Pattern
The SDK dynamically discovers available providers at runtime:

**Chat Providers** (`SDKService.resolveChatProvider`):
1. Prefer `realtimexai/gpt-4o-mini` (routes through Desktop to user's configured providers)
2. Fallback to first available provider/model from SDK discovery
3. Use hardcoded defaults if SDK unavailable

**Embedding Providers** (`SDKService.resolveEmbedProvider`):
1. **Prefer `realtimexai/text-embedding-3-small`** (cloud-based, always available)
2. **Skip `native` and `local` providers** (require local model downloads)
3. Fallback to first available cloud provider
4. Use hardcoded defaults if SDK unavailable

**IMPORTANT**: Never default to `native/Xenova/all-MiniLM-L6-v2` - it requires local models that users don't have.

### Configuration Sources (Priority Order)
1. User settings from database (`user_settings.llm_provider`, `user_settings.embedding_provider`)
2. SDK dynamic discovery (`sdk.llm.chatProviders()`, `sdk.llm.embedProviders()`)
3. Hardcoded defaults (`realtimexai/gpt-4o-mini`, `realtimexai/text-embedding-3-small`)

## BYOK Pattern (Bring Your Own Keys)

### Overview
The app uses **BYOK (Bring Your Own Keys)** as the primary Supabase configuration method. Users configure their own Supabase projects via the Setup Wizard UI - no manual `.env` file editing required.

**Configuration Flow**:
1. ✅ **Primary**: Setup Wizard UI → Credentials stored in database → Passed via HTTP headers
2. 🔧 **Fallback**: Environment variables (backend-only, for development/testing)

### How BYOK Works

**Setup Wizard** (`src/components/SetupWizard/`):
- Guides users to create/link Supabase project via UI
- Supports auto-provisioning: creates project, runs migrations, ingests knowledge
- Stores credentials in database (user session)
- **No .env file needed** - Everything configured through UI

**Header-Based Credentials** (The BYOK Magic):
Credentials flow from frontend to backend via HTTP headers:
```typescript
// Frontend: HybridApiClient.expressRequest() automatically adds headers
'X-Supabase-Url': 'https://project.supabase.co'
'X-Supabase-Anon-Key': 'eyJhbGc...'

// Backend: Routes read headers first, env vars second (fallback only)
const supabase = getSupabaseFromRequest(req); // Headers → ENV fallback
```

**Why This Matters**:
- ✅ Users don't need to edit `.env` files
- ✅ Multiple users can use different Supabase projects
- ✅ Setup Wizard can fully configure the app without file system access
- ✅ Works in desktop app environments where `.env` editing is impractical

**Critical Files**:
- `src/lib/api.ts`: HybridApiClient adds headers to all Express requests (line 141-142)
- `api/src/middleware/auth.ts`: Example of reading headers for auth
- `api/src/routes/agent.ts`: Agent route uses `getSupabaseFromRequest()`

**Migration Script**: `./scripts/migrate.sh`
- Accepts parameters: `SUPABASE_PROJECT_ID`, `SUPABASE_ACCESS_TOKEN`
- Called by Setup Wizard or manually via CLI
- Runs: migrations, config push, edge functions deployment, knowledge ingestion

**Development Note**: Backend can still use `SUPABASE_URL` and `SUPABASE_ANON_KEY` env vars as a fallback for local development, but this is NOT the primary user-facing configuration method.

## Database Triggers & SECURITY DEFINER Patterns

### Critical Patterns for Supabase Triggers

**⚠️ CRITICAL**: PostgreSQL triggers with `SECURITY DEFINER` require specific patterns to work correctly in Supabase.

#### 1. Search Path Configuration

**❌ WRONG - Causes extension function failures:**
```sql
CREATE FUNCTION public.my_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''  -- Empty breaks extension functions!
AS $$
BEGIN
  -- gen_random_bytes() NOT FOUND - can't locate pgcrypto functions
  ...
END;
$$;
```

**✅ CORRECT - Includes necessary schemas:**
```sql
CREATE FUNCTION public.my_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'  -- Required for extensions!
AS $$
BEGIN
  -- Now can access pg_catalog built-ins AND public schema extensions
  ...
END;
$$;
```

**Why**:
- `SET search_path TO ''` (empty) prevents finding extension functions like `gen_random_bytes()`
- `SET search_path TO 'pg_catalog', 'public'` gives access to both built-in functions and extensions
- Still secure: uses fully qualified table names (`public.user_settings`)

#### 2. RLS Policies for Trigger Inserts

**❌ WRONG - Blocks trigger inserts:**
```sql
CREATE POLICY "Users can only access their own settings" ON user_settings
    FOR ALL USING (auth.uid() = user_id);  -- Blocks triggers!
```

**✅ CORRECT - Allows both users and triggers:**
```sql
-- Separate policies for different operations
CREATE POLICY "Users can view their own settings" ON user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON user_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings" ON user_settings
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users and triggers can insert settings" ON user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);  -- Key!
```

**Why**: During trigger execution, `auth.uid()` is NULL, so `auth.uid() = user_id` blocks trigger inserts.

#### 3. Avoid Extension Dependencies

**❌ PROBLEMATIC - Requires pgcrypto extension:**
```sql
v_encryption_key := encode(gen_random_bytes(32), 'hex');  -- May not work in all environments
```

**✅ BETTER - Uses built-in functions only:**
```sql
-- Generates 64-character hex string using only built-in functions
v_encryption_key := md5(random()::text || clock_timestamp()::text) ||
                    md5(random()::text || clock_timestamp()::text);
```

**Why**:
- Built-in functions (`md5()`, `random()`, `clock_timestamp()`) work everywhere
- No extension dependencies = works in fresh deployments
- More reliable across different Supabase instances

#### 4. User Initialization Trigger Pattern

**Complete working example** (`handle_new_profile()` trigger):

```sql
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'  -- Include both schemas
AS $$
DECLARE
  v_encryption_key TEXT;
  v_new_encryption_key TEXT;
BEGIN
  BEGIN  -- Exception handler prevents profile creation failure
    -- Generate encryption key (built-in functions only)
    SELECT encryption_key INTO v_encryption_key
    FROM public.user_settings
    WHERE encryption_key IS NOT NULL
    LIMIT 1;

    IF v_encryption_key IS NULL THEN
      v_new_encryption_key := md5(random()::text || clock_timestamp()::text) ||
                              md5(random()::text || clock_timestamp()::text);
    ELSE
      v_new_encryption_key := v_encryption_key;
    END IF;

    -- Insert with fully qualified table names
    INSERT INTO public.user_settings (
      user_id, encryption_key, created_at, updated_at
    ) VALUES (
      NEW.id, v_new_encryption_key, NOW(), NOW()
    ) ON CONFLICT (user_id) DO NOTHING;

    -- Install rules from templates
    INSERT INTO public.rules (user_id, name, ...)
    SELECT NEW.id, rt.name, ...
    FROM public.rule_templates rt
    ON CONFLICT (user_id, rule_template_id) DO NOTHING;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Trigger failed for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;
```

**Key elements:**
- ✅ `SET search_path TO 'pg_catalog', 'public'`
- ✅ Fully qualified table names (`public.table_name`)
- ✅ Exception handler prevents cascading failures
- ✅ Built-in functions only (no extension dependencies)
- ✅ `ON CONFLICT DO NOTHING` for idempotency

### Common Trigger Issues & Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| Extension function not found | `function gen_random_bytes(integer) does not exist` | Use `SET search_path TO 'pg_catalog', 'public'` |
| Trigger insert blocked | Tables empty after user signup | Add RLS policy: `auth.uid() IS NULL` for INSERT |
| Trigger fails silently | No error logs, tables empty | Check exception handler isn't swallowing all errors |
| Migration conflicts | Functions redefined multiple times | Consolidate into single migration, delete conflicts |

**Debugging Triggers:**
```sql
-- Check trigger status
SELECT t.tgname, c.relname, p.proname, t.tgenabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'your_trigger_name';

-- Check function search_path
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'your_function_name';

-- Check Postgres logs for RAISE NOTICE/WARNING messages
```

## RAG System (Retrieval-Augmented Generation)

### Architecture
The agent uses RAG to ground responses in documentation, preventing hallucination.

**Knowledge Base**:
- **Source**: Markdown files in `docs/user-guide/` (DASHBOARD.md, CONFIGURATION.md, etc.)
- **Storage**: `knowledge_chunks` table with pgvector embeddings
- **Ingestion**: `npm run ingest:knowledge` (or via Setup Wizard)

**Database Schema** (`supabase/migrations/20260203000003_add_knowledge_base_rag.sql`):
```sql
CREATE TABLE knowledge_chunks (
    id UUID PRIMARY KEY,
    content TEXT NOT NULL,
    source_file TEXT NOT NULL,
    section_title TEXT,
    embedding vector(1536),  -- text-embedding-3-small dimensions
    version TEXT NOT NULL,
    ...
);

CREATE FUNCTION search_knowledge(
    query_embedding vector,
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 5
) RETURNS TABLE (...);
```

### RAG Flow

1. **User asks question** → AgentContext sends to `/api/agent/chat`
2. **RAGService.retrieve()** generates query embedding via SDK
3. **search_knowledge()** returns top K similar chunks (cosine similarity)
4. **AgentService.chat()** constructs prompt with retrieved context
5. **Anti-hallucination rules** enforce documentation-only responses
6. **LLM responds** with citations to source files

**Services**:
- `api/src/services/RAGService.ts`: Embedding generation, semantic search
- `api/src/services/AgentService.ts`: Chat orchestration with RAG
- `scripts/ingest-knowledge-rag.ts`: Chunk + embed documentation

**Graceful Degradation**:
If Supabase not configured, agent works without RAG (basic mode, no knowledge base).

## Agent System (Context Injection Pattern)

### Architecture
Each page can register its own agent context, tools, and data.

**Core Components**:
- `src/context/AgentContext.tsx`: Global agent state + chat history
- `src/hooks/usePageAgent.ts`: Hook for pages to register context
- `api/src/routes/agent.ts`: Backend endpoint with RAG integration

### Page-Specific Agents

Pages call `usePageAgent()` to inject context:
```typescript
usePageAgent({
    page_id: 'drafts',
    system_instruction: 'Help user review email drafts',
    data: { drafts: currentDrafts },
    tools: [
        {
            name: 'send_draft',
            description: 'Send an email draft',
            parameters: { /* JSON schema */ },
            callback: async (args) => sendDraft(args.draft_id)
        }
    ]
});
```

**Tool Execution**:
- LLM outputs: `<<<ACTION>>>{"name": "send_draft", "args": {"draft_id": "123"}}`
- Frontend parses action, calls tool callback
- Provides optimistic UI updates + voice feedback

### TTS Integration
Agent responses are automatically spoken if TTS auto-play is enabled:
- `src/hooks/useTTS.ts`: Text-to-Speech via RealTimeX SDK
- `src/components/TTSSettings.tsx`: User configuration UI
- Settings stored in `user_settings.tts_*` fields

## Embedding Provider Configuration

### UI Configuration
Users can configure embedding provider via Configuration page:
- **Location**: Configuration page → "Embedding Provider (RAG)" section
- **Fields**: `embedding_provider`, `embedding_model`
- **Default**: Auto-selects `realtimexai/text-embedding-3-small`

### Backend Usage
RAGService uses embedding provider for:
1. **Knowledge Ingestion**: Embedding documentation chunks (`npm run ingest:knowledge`)
2. **Query Embedding**: Converting user questions to vectors
3. **Semantic Search**: Finding relevant documentation via cosine similarity

### Important Notes
- Embedding model must match dimensions in `knowledge_chunks.embedding` (default: 1536)
- Provider must be cloud-based (avoid native/local models)
- If using custom model, may need to alter table: `ALTER TABLE knowledge_chunks ALTER COLUMN embedding TYPE vector(X)`
