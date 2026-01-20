# Email Automator - Hybrid Architecture

## Overview

Email Automator uses a **hybrid architecture** that combines Supabase Edge Functions with a Local Express API to provide a serverless, privacy-first email automation solution aligned with the RealTimeX Local Apps pattern.

## User Setup (Simple)

Users only need to provide:
- **Supabase Project URL**
- **Supabase Publishable/Anon Key**

Edge Functions are deployed once to their project via RealTimeX Desktop or Supabase CLI.

## Architecture Components

```
Frontend (React) → Edge Functions (Auth/DB) → Supabase Database
                 ↘ Express API (Sync/AI)    ↗
```

## Data Flow: Async ETL Pipeline

Email Automator uses an Asynchronous **Extract, Transform, Load (ETL)** pattern to handle large inboxes without timeouts:

1.  **Extract (Ingestion)**: Local App fetches raw RFC822 MIME source from the provider (Gmail/Outlook).
2.  **Transform (Storage)**: Raw content is saved as `.eml` files on local disk (default: `./data/emails`). Only metadata (subject, sender, etc.) is saved to the database.
3.  **Load (AI Analysis)**: A background worker picks up "Pending" emails, parses the local files, extracts technical headers, and sends cleaned text to the LLM for categorization and decision-making.

## Component Responsibilities

### Edge Functions (Serverless)
- OAuth Management (Gmail, Microsoft)
- Secure Credential Storage
- Database Proxy (CRUD with RLS)
- Authentication & Profile Management

### Express API (Local App / Background Worker)
- Asynchronous Ingestion & Checkpointing
- Local Disk Management (.eml storage)
- AI Intelligence (Categorization, Intent Matching)
- Automation Execution (Drafting, Trashing, Moving)
- Real-time Event Logging (Live Terminal)

## Local App Portability

The Local App is designed to be highly portable:
- **Sandbox Friendly**: Automatically falls back to user home directory (`~/.email-automator/emails`) if project-relative storage is restricted.
- **Self-Healing**: Automatically refreshes provider tokens and Supabase sessions in the background.
- **Interactive**: Emits real-time state changes via Supabase Realtime for the "Live Activity" dashboard.

## Deployment

```bash
# Deploy Edge Functions
./scripts/deploy-functions.sh

# Run Local App
npm run dev:api

# Run Frontend
npm run dev
```

## Benefits

1. **Privacy** - AI processing happens locally
2. **Cost Efficiency** - Heavy compute runs on user's hardware
3. **Serverless Auth** - OAuth works even when local app is offline
4. **Security** - OAuth secrets never leave Supabase
