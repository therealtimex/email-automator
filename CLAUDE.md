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

Required:
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`: Frontend Supabase config
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`: Backend Supabase config
- `LLM_API_KEY`: OpenAI or compatible API key

For local LLMs (Ollama/LM Studio):
```bash
LLM_BASE_URL="http://localhost:11434/v1"
LLM_MODEL="llama3"
```

OAuth credentials:
- `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`
- `MS_GRAPH_CLIENT_ID`, `MS_GRAPH_TENANT_ID`, `MS_GRAPH_CLIENT_SECRET`

## Important Patterns

### API Client Architecture
`src/lib/api.ts` routes requests based on endpoint type:
- `edgeRequest()`: Auth, accounts, emails, rules, settings → Supabase Edge Functions
- `expressRequest()`: Sync, actions → Local Express API

### AI Integration
Uses OpenAI SDK with Zod schemas for structured LLM output:
- `src/core/intelligence.ts`: Email analysis schema and IntelligenceLayer class
- Returns typed `EmailAnalysis` with category, sentiment, priority, suggested_action

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
