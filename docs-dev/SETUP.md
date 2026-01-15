# Setup and Installation Guide

## Prerequisites

- Node.js (v18+)
- Supabase Account (and project)
- Google Cloud Console Project (for Gmail OAuth)

## 1. Installation

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd email-automator
npm install
```

## 2. Environment Configuration

Create a `.env` file in the root directory (copy from `.env.example`):

```bash
cp .env.example .env
```

**Required Variables:**

- `VITE_SUPABASE_URL`: Your Supabase Project URL.
- `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon/Public Key.
- `SUPABASE_URL`: Same as above (for backend).
- `SUPABASE_ANON_KEY`: Same as above (for backend).
- `LLM_API_KEY`: API Key for your LLM provider (OpenAI, Anthropic, etc.).

**Optional (for specific features):**

- `GMAIL_CLIENT_ID`: OAuth Client ID for Gmail.
- `GMAIL_CLIENT_SECRET`: OAuth Client Secret for Gmail.

## 3. Database Setup (Supabase)

The project requires specific tables in Supabase (`email_accounts`, `emails`). You can set this up automatically using the built-in Setup Wizard.

### Automatic Migration (Recommended)

1.  Start the development server:
    ```bash
    npm run dev -- --port 3003
    ```
2.  Start the backend server (required for migration API):
    ```bash
    npm run serve -- --port 3002
    ```
3.  Navigate to **http://localhost:3003**.
4.  Enter your **Supabase URL** and **Anon Key**.
5.  In the next step, enter your **Database Password** to apply the schema.

### Manual Migration

You can also run the migration script manually if you have the credentials:

```bash
# Using Database Password (no CLI token needed)
export SUPABASE_PROJECT_ID="your-project-id"
export SUPABASE_DB_PASSWORD="your-db-password"
./scripts/migrate.sh

# OR using Supabase CLI (requires login)
npx supabase login
npx supabase link --project-ref your-project-id
npx supabase db push
```

## 4. Running the Application

To run the full application, you need both the frontend (Vite) and the backend (Express) running.

**Frontend (Client):**
```bash
npm run dev -- --port 3003
```

**Backend (Server):**
```bash
npm run serve -- --port 3002
```

> **Note:** The backend server handles OAuth flows, AI processing, and database migrations. The frontend communicates with it via API calls.
