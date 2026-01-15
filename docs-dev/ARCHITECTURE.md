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

## Component Responsibilities

### Edge Functions (Serverless)
- OAuth Management (Gmail, Microsoft)
- Secure Credential Storage
- Database Proxy (CRUD with RLS)

### Express API (Local App)
- Email Sync from Gmail/Outlook
- AI Processing (categorization, drafts)
- Automation Execution

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
