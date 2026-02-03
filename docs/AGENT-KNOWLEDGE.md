# Email-Automator AI Agent Knowledge Base
**Generated:** 2026-02-03T10:14:56.813Z
**Version:** 2.21.4
**Sources:** User documentation (docs/user-guide/), CLAUDE.md, README.md

---

# CRITICAL: Anti-Hallucination Rules

**You MUST follow these rules strictly:**

1. **ONLY use information from this knowledge base** - If information is not explicitly documented below, you MUST say "I don't have information about that feature" or "I'm not sure about that"

2. **Never fabricate features** - Do not invent capabilities, settings, buttons, or workflows that aren't documented

3. **Be honest about limitations** - If a user asks about something not in the knowledge base, acknowledge it clearly: "That's not covered in the documentation I have. Let me help with what I do know..."

4. **Exact references only** - Only mention page names, buttons, settings, and steps that are explicitly documented below

5. **No assumptions** - Don't assume features exist just because they seem logical or similar apps have them

---

# Response Guidelines

When answering user questions:
1. **Search the knowledge base first** - Find the relevant section before answering
2. **Be specific**: Reference exact page names, button labels, steps from the documentation
3. **Quote directly**: When possible, use the exact wording from the guides
4. **Provide step-by-step instructions** when documented
5. **Cross-page help**: Guide users to the correct page when needed (e.g., "Go to Configuration page → Voice & Speech section")
6. **Use tools when available**: If the current page has tools, offer to execute actions
7. **Be concise but complete**: Provide thorough answers without unnecessary verbosity
8. **If unsure, say so**: Better to admit uncertainty than provide wrong information

---

# Application Overview

# Email Automator Documentation

Welcome to the documentation for **Email Automator**, your personal AI-powered email assistant. This tool runs locally on your machine, ensuring your data stays private while leveraging the power of AI to organize, prioritize, and automate your inbox.

## 📖 User Guide

Complete guide for setting up and using the application.

1.  "Getting Started**" - Installation, prerequisites, and first run.
2.  "Configuration**" - Setting up Gmail/Outlook (BYOK) and Sync Scope.
3.  "Dashboard & Live Activity**" - Monitoring syncs, AI Trace, and manual actions.
4.  "Automation Rules**" - Creating custom AI rules and retention policies.
5.  "Account Management**" - Managing your profile, security, and Supabase connection.
6.  "Troubleshooting**" - Common issues and solutions.

## 💻 Developer Documentation

Information for contributing to or extending the project.

*   "Architecture Overview**" - Hybrid architecture and component responsibilities.
*   "NPX Deployment**" - How to run the app via `npx`.
*   "Local Development**" - Setting up the development environment.
*   "RealTimeX Integration**" - Ecosystem integration guide.

---

# User Guide: Complete Documentation

---

## Account Management

Manage your profile, persona, security, and Supabase connection in **Account Settings** (profile icon, top right).

## 👤 Profile
*   **Name**: Update your first and last name.
*   **Avatar**: Upload a custom profile picture.
*   **Sound & Haptic Feedback**: Toggle audio cues and haptics (if supported).

## 🧬 Persona
Define how the AI represents you:
*   Role, industry, and work style
*   Preferred tone and response length
*   VIP senders and trusted domains
*   Automation preferences (what to avoid)

## 🔐 Security
*   **Password**: Update your account password.
*   **Sessions**: Managed via Supabase Auth; log out to end the session.

## 🗄️ Supabase Connection (BYOK)
Manage the database connection used for auth, sync logs, and AI data:
*   **Connection Status**: Shows the current Supabase URL and schema version.
*   **Change Connection**: Launches the Setup Wizard to reconfigure.
*   **Clear Configuration**: Disconnects and logs you out (only available for UI-configured connections).

> Provider credentials (Gmail/Outlook) are managed in **Configuration → Email Accounts**.

---

## 💾 Where is my data?
*   **Email Metadata + AI Logs**: Stored in your Supabase project.
*   **Raw Email Files (.eml)**: Stored locally on your machine (see **Storage Path** in Configuration).
*   **Rule Attachments**: Stored in your Supabase Storage bucket.
*   **Credentials**: Encrypted and stored in your Supabase project.

**Email Automator never stores your data on its own servers.**

---

## Automation Rules

Automation rules let the agent act on your inbox automatically using AI analysis and metadata.

## 🛡️ System Rules

These are built-in toggles available in **Configuration → Automation** (and visible in **Auto-Pilot**):
*   **Auto-Trash Spam**: Deletes messages classified as spam.
*   **Smart Drafts**: Enables automatic draft generation when a rule requests drafting.

---

## 🛠️ Custom Rules

Create rules with conditions + actions:

### 1. Conditions
*   **AI Analysis**: Category, Sentiment, Priority
*   **Metadata**: Sender Email, Sender Domain, Sender Contains, Subject Contains, Body Contains
*   **Age Filter**: “Older than X days”

### 2. Actions
*   **Archive**
*   **Delete**
*   **Star**
*   **Draft**

If you choose **Draft**, you can:
*   Provide **draft instructions** (tone, intent, or context).
*   Attach files to include in the reply.

---

## 🚀 Auto-Pilot Tab

The **Auto-Pilot** tab groups rules by category and highlights **system-managed** rules.
Use it to quickly enable/disable rules or edit custom ones.

---

## 🏗️ How it works
1.  **Sync**: The agent fetches new emails.
2.  **Analysis**: AI assigns category, priority, and sentiment.
3.  **Matching**: Rule conditions are evaluated.
4.  **Execution**: Matching actions are performed immediately in Gmail/Outlook.

---

## Configuration

The **Configuration** tab is where you connect email providers, define automation rules, and tune AI + sync behavior.

---

## 🔑 Email Accounts (Gmail & Outlook)

Email Automator uses **BYOK** credentials. You connect your own Gmail/Outlook apps to keep control of your data.

### Gmail Setup (OAuth)
1.  In **Google Cloud Console**, create a project and enable the **Gmail API**.
2.  Configure the OAuth consent screen and add your account as a test user.
3.  Create an **OAuth 2.0 Client ID (Web Application)**.
    *   **Authorized Redirect URI**: `https://<your-project-ref>.supabase.co/functions/v1/auth-gmail/callback`
4.  In **Configuration → Email Accounts**, click **Connect Gmail**.
5.  Paste the **credentials JSON** (or enter Client ID + Secret manually).
6.  Complete the browser authorization and paste the **authorization code**.

### Outlook Setup (Device Code)
1.  In **Azure App Registrations**, register a new application.
2.  Supported account types: **organizational + personal Microsoft accounts**.
3.  Copy the **Application (client) ID** and (optional) **Tenant ID**.
4.  In **Configuration → Email Accounts**, click **Connect Outlook**.
5.  Follow the **Device Code** prompt and complete sign-in.

---

## 🤖 Automation Rules

### System Rules (Quick Toggles)
*   **Auto-Trash Spam**: Deletes emails categorized as spam.
*   **Smart Drafts**: Generates draft replies when a rule requests drafting.

### Custom Rules
Create rules with one or more actions:
*   **Conditions**:
    *   **AI Analysis**: Category, Sentiment, Priority
    *   **Metadata**: Sender Email, Sender Domain, Sender Contains, Subject Contains, Body Contains
    *   **Age Filter**: “Older than X days”
*   **Actions**: Archive, Delete, Draft, Star
*   **Draft Instructions**: Provide extra context if your rule includes Draft
*   **Attachments**: Upload files to include in drafted replies

> Tip: The **Auto-Pilot** tab provides a grouped view of all rules (system + custom) and quick enable/disable controls.

---

## 🧠 AI Model Configuration

Use this section to control AI routing and local storage behavior:
*   **Provider + Model**: Discovered via **RealTimeX Desktop**
*   **Storage Path**: Where raw `.eml` files are stored locally (must be writable)
*   **Intelligent Rename**: Slugifies and timestamps filenames for cleaner archives
*   **Sync Interval (minutes)**: How often the background scheduler syncs accounts
*   **Test Connection**: Validate provider access

---

## 🧩 Embedding Provider (RAG)

Configure the embedding model used for the documentation knowledge base (RAG).
*   Default: **RealTimeX AI / text-embedding-3-small**
*   Choose a different provider/model if needed

---

## 🔊 Voice & Speech (TTS)

Control text-to-speech for AI responses:
*   **Auto-Speak** toggle
*   **Provider + Voice**
*   **Speed + Quality**

---

## Dashboard & Live Activity

The Dashboard is your command center for monitoring the AI agent and acting on analyzed emails.

## 📊 Recent Analysis

As the agent processes your inbox, emails appear in the feed with live status badges.

*   **Search + Filters**: Search by keyword and filter by category.
*   **Sorting**: Toggle between *received time* and *processed time*.
*   **Pagination**: Navigate large inboxes in batches.

## 📌 Email Details Sidebar

Click any email card to open its detail panel:
*   **AI Summary + Key Points**
*   **Draft Preview** (if generated)
*   **Sender + Subject** at a glance

## 🕵️ AI Trace & Transparency

### Live Activity Terminal
Click the floating **Live Activity** button (bottom right).
*   **Real-time Feed**: Watch analysis + actions stream in.
*   **Status Indicators**: See when sync is live vs idle.
*   **Stop Sync**: Cancel an in-progress sync from the terminal.

### AI Trace Modal
Click the **Eye icon** on an email card.
*   **Decision Timeline**: Why the email was categorized the way it was.
*   **Prompts + Raw Output**: View the model’s raw response and usage stats.
*   **Retry**: Re-run processing when a failure occurs.

### Feedback
Use the **speech bubble** icon to report mistakes or improve analysis quality.

## 🔊 Sound & Haptic Feedback

The app provides subtle feedback for background activity:
*   **Soft Chime** for new analysis
*   **Success Tone** after sync completes
*   **Alert Tone** for high-priority detections

> You can toggle sound (and haptics on supported devices) in **Account Settings → Profile**.

## ⚡ Manual Actions

Each email card includes quick actions:
*   🗑️ **Delete**
*   📦 **Archive**
*   🚩 **Flag/Star**
*   🔗 **Open in Gmail/Outlook**
*   🕵️ **AI Trace** and **Feedback** shortcuts

---

## ⏱️ Sync Scope (Per Account)

Use the **Sync Scope** card in the sidebar:
*   **Sync From**: Start date/time for processing
*   **Max Emails**: Batch size per sync run (default 50)
*   **Reset Checkpoint**: Force a full re-scan from the start date

## 🧾 Sync History & Stats

*   **Recent Syncs** show processed + actioned counts and runtime.
*   **Quick Stats** show totals, connected accounts, and enabled rules.

---

## 🤖 Smart Drafts

When a rule requests drafting, the AI generates a reply:
*   Preview drafts in the **Email Details** sidebar.
*   Drafts are saved to your provider’s **Drafts** folder.

---

## Getting Started

Welcome to **Email Automator**. The app runs locally, connects to your own Supabase project (BYOK), and uses RealTimeX Desktop to access AI providers.

## ✅ Quick Setup with the Setup Wizard (Recommended)

1.  **Install & launch RealTimeX Desktop** (required for AI + TTS providers).
2.  **Open Email Automator** and proceed through the **Setup Wizard**.
3.  **Choose a setup path**:
    *   **Managed Provisioning (optional)**: Provide a Supabase Access Token, select an organization + region, and pick a project name. The wizard will create the project, run migrations, deploy Edge Functions, and ingest the knowledge base automatically.
    *   **Connect Existing Project**: Paste your **Supabase Project URL** and **Anon Key**. You can also provide an Access Token to run migrations inside the wizard.
4.  **Create or sign in** to your account to open the Dashboard.

---

## 🔍 Finding your Supabase Credentials (Existing Project)

1.  Go to your **Supabase Dashboard**.
2.  Open the project you want to use.
3.  Go to **Settings → API**.
4.  Copy **Project URL**.
5.  Copy the **anon** key under **Project API keys**.

> [!WARNING]
> **Do NOT** use the `service_role` key. It has admin access and is not safe for the client application.

## 🪪 Supabase Access Token (for provisioning/migrations)

The Setup Wizard can run migrations and deploy Edge Functions if you provide an Access Token.

1.  In Supabase, go to **Account → Access Tokens**.
2.  Create a new token and copy it.
3.  Paste it into the Setup Wizard when prompted.

---

## 🛠️ Manual Installation (Advanced)

If you prefer to run from source:

### Prerequisites
*   **Node.js** v20+
*   **Git**
*   **Docker** (for local Supabase)
*   **Supabase CLI** (optional, for migrations)

### Steps

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/therealtimex/email-automator.git
    cd email-automator
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **(Optional) Start local Supabase**:
    ```bash
    npx supabase start
    ```

4.  **Start the backend API**:
    ```bash
    npm run dev:api
    ```

5.  **Start the frontend**:
    ```bash
    npm run dev
    ```

6.  **Open the app** at `http://localhost:3000` and complete the **Setup Wizard**.

> Tip: If you skip migrations in the wizard, you can run them manually with `./scripts/migrate.sh`.

---

## Troubleshooting

Common issues and how to resolve them.

## 📡 Sync Issues

**"Sync Failed" or "Backend not connected"**
*   Ensure the local API server is running (source installs: `npm run dev:api`).
*   Confirm the backend is reachable on port 3004 and Vite is proxying `/api`.
*   Open **Live Activity** to see error details.

**Emails are not appearing**
*   **Check Start Date**: Emails older than your **Sync Scope** start date are ignored.
*   **Reset Checkpoint**: If you changed the start date but nothing happened, click the **Rotate Icon** (Reset Checkpoint) in the Sync Scope card. This forces a re-scan.
*   **Check Batch Size**: The **Max Emails** setting limits each run. It may take several cycles to catch up.
*   **Run Sync Now**: Trigger a manual sync from the Dashboard.

**Live Activity is empty**
*   Ensure your Supabase project is connected and migrations are up to date.
*   Check that the `processing_events` table exists (migrations create it).

---

## 🔑 Authentication Issues

**OAuth Error 400: redirect_uri_mismatch**
*   Go to your Google Cloud Console and ensure the Redirect URI exactly matches the one provided in the app configuration (it should end in `/functions/v1/auth-gmail/callback`).

**Outlook device code never completes**
*   Re-check the **Client ID** and (optional) **Tenant ID** in Configuration.
*   Confirm your Azure App Registration allows personal + organizational accounts.
*   Retry the device login flow from the app.

**"Invalid API Key" during Setup**
*   Use the **Anon/Public** key from Supabase, not the Service Role key.

---

## 🗄️ Database Issues

**"Database Migration Required" Banner**
*   This appears when your app version is newer than your database schema.
*   Click **Update Now** to open the migration modal and run updates.

**Missing Columns Error**
*   If logs show errors like `column "account_id" does not exist`, run migrations.
*   Preferred: use the **Migration Modal** in-app (requires a Supabase Access Token).
*   Source installs: run `./scripts/migrate.sh`.

---

## 🤖 AI Issues

**AI is taking too long**
*   If using a local model (Ollama/LM Studio), ensure your computer has enough RAM and a supported GPU.
*   If provider discovery fails, ensure **RealTimeX Desktop** is running.

**No drafts are generated**
*   Ensure **Smart Drafts** is enabled or your rule includes the **Draft** action.
*   Some senders (no-reply/automated) are skipped to avoid unwanted replies.

**TTS or voice list is empty**
*   Ensure RealTimeX Desktop is running.
*   Open **Configuration → Voice & Speech**, pick a provider/voice, and click **Test**.

---

# Technical Architecture (For Context)

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


---

# Common Commands (For Reference)

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


---

# Additional Context

## Email Categories
- **spam**: Unsolicited/junk mail
- **newsletter**: Marketing emails, subscriptions
- **promotional**: Sales, offers, deals
- **transactional**: Receipts, confirmations, notifications
- **social**: Social media notifications
- **support**: Customer service, help desk
- **client**: Business communications from clients
- **internal**: Company-internal emails
- **personal**: Personal correspondence

## Email Actions
- **archive**: Move to archive (keep for reference)
- **delete**: Permanently delete
- **draft**: Generate AI draft response
- **star**: Mark as important

## Available Tools (Page-Specific)

### Drafts Page Tools
- `send_draft`: Send specific draft by ID
- `dismiss_draft`: Dismiss draft without sending
- `preview_draft`: Show full draft content
- `summarize_drafts`: Get overview of all pending drafts

---

**End of Knowledge Base**
