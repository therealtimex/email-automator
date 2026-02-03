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
