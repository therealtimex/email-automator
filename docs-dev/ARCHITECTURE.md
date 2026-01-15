# System Architecture

## Overview

The Email Automator is a hybrid application consisting of a React frontend (Vite) and a Node.js/Express backend. It leverages Supabase for data persistence and authentication state.

### Tech Stack

- **Frontend**: React, Vite, TailwindCSS, Lucide Icons
- **Backend**: Node.js, Express, TypeScript
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI / Instructor (for email analysis)

## Core Components

### 1. Frontend (`src/`)

- **`App.tsx`**: Main entry point, handles routing and initialization.
- **`components/SetupWizard.tsx`**: Handles initial configuration and database migrations.
- **`lib/supabase.ts`**: **Browser-side** Supabase client. Uses `localStorage` for caching and session persistence.

### 2. Backend (`api/`)

- **`server.ts`**: Express server entry point. Initializes the **server-side** Supabase client.
- **`src/core/auth.ts`**: Handles OAuth flows (Gmail, Outlook).
- **`src/core/processor.ts`**: periodically fetches emails and runs AI analysis.
- **`src/core/actions.ts`**: Executes actions (delete, draft, etc.) on email providers.

## Critical Design Decisions

### Browser vs. Server Supabase Clients

A key architectural distinction is the separation of Supabase clients:

1.  **Browser Client (`src/lib/supabase.ts`)**:
    -   Used by React components.
    -   Persists sessions in `localStorage`.
    -   Initialized dynamically using configuration stored in `localStorage` or `import.meta.env`.

2.  **Server Client (`api/server.ts`)**:
    -   Used by the backend (API endpoints, background jobs).
    -   **MUST NOT** import `src/lib/supabase.ts` (avoids `localStorage` ReferenceError).
    -   Initialized using `process.env` variables.
    -   Passes the client instance to core classes (`EmailProcessor`, `EmailActions`) via dependency injection.

### Supabase Backend Reuse

The project is designed to reuse the `atomic-crm` backend schema:

-   **Schema Sharing**: Uses the same `email_accounts` and related tables.
-   **Migration Strategy**: "Strategy B" (Separate Project, Same Schema). We use `supabase db push` to synchronize the schema without sharing the exact same project instance, allowing isolated development.
-   **Migrations**: Located in `supabase/migrations`. Applied via the `/api/migrate` endpoint which invokes the Supabase CLI.

## Data Flow

1.  **Auth**: User connects Gmail -> Backend handles OAuth -> Tokens saved to Supabase (encrypted/protected).
2.  **Sync**: Backend `EmailProcessor` -> Fetches Email (Gmail API) -> Analyzes (LLM) -> Stores result in Supabase `emails` table.
3.  **UI**: Frontend -> Subscriptions to `emails` table -> Real-time updates when new emails are processed.
