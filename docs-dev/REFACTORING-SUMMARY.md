# Refactoring Summary - Hybrid Architecture Migration

## What Changed

We've migrated from a **monolithic Express API** to a **hybrid architecture** following the RealTimeX Local Apps pattern.

### Before (Monolithic)
```
Frontend → Express API → Supabase Database
           (Everything)
```

### After (Hybrid)
```
Frontend → Edge Functions (Auth/DB) → Supabase Database
        ↘ Express API (Sync/AI)     ↗
```

## New File Structure

```
email-automator/
├── supabase/
│   ├── functions/
│   │   ├── _shared/
│   │   │   ├── supabaseAdmin.ts
│   │   │   ├── cors.ts
│   │   │   ├── auth.ts
│   │   │   └── encryption.ts
│   │   ├── auth-gmail/
│   │   │   └── index.ts
│   │   ├── auth-microsoft/
│   │   │   └── index.ts
│   │   ├── api-v1-accounts/
│   │   │   └── index.ts
│   │   ├── api-v1-emails/
│   │   │   └── index.ts
│   │   ├── api-v1-rules/
│   │   │   └── index.ts
│   │   └── api-v1-settings/
│   │       └── index.ts
│   ├── config.toml
│   └── .env.example
├── src/
│   └── lib/
│       ├── api.ts (refactored to hybrid client)
│       └── api-config.ts (new)
├── api/ (Express API - simplified)
│   └── src/
│       ├── routes/ (keep only sync and actions)
│       └── services/ (keep email sync and AI)
└── scripts/
    └── deploy-functions.sh (new)
```

## What Moved to Edge Functions

### Auth & OAuth
- ✅ Gmail OAuth flow
- ✅ Microsoft device code flow
- ✅ Token encryption/decryption
- ✅ Account management

### Database Operations
- ✅ Email CRUD
- ✅ Rules CRUD
- ✅ Settings CRUD
- ✅ Statistics/summaries

## What Stays in Express API

### Core Local Processing
- ✅ Email sync from Gmail/Outlook
- ✅ AI categorization & analysis
- ✅ Draft generation
- ✅ Action execution
- ✅ Background scheduler

## Deployment Steps

### 1. Deploy Edge Functions
```bash
# Login to Supabase CLI
supabase login

# Deploy all functions
./scripts/deploy-functions.sh
```

### 2. Configure Edge Function Secrets
In Supabase Dashboard → Settings → Edge Functions:
- `TOKEN_ENCRYPTION_KEY` (32 chars)
- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `MS_GRAPH_CLIENT_ID`
- `MS_GRAPH_CLIENT_SECRET`

### 3. Configure Local Environment
```bash
cp .env.example .env
# Edit .env with:
# - DISABLE_AUTH=true (for local dev)
# - LLM_API_KEY
# - Other local settings
```

### 4. Run Applications
```bash
# Terminal 1: Express API (Local App)
npm run dev:api

# Terminal 2: Frontend
npm run dev
```

## API Endpoint Changes

| Old Endpoint | New Location | New Endpoint |
|--------------|-------------|--------------|
| `POST /api/auth/gmail/url` | Edge Function | `GET /auth-gmail?action=url` |
| `POST /api/auth/gmail/callback` | Edge Function | `POST /auth-gmail` |
| `POST /api/auth/microsoft/device-flow` | Edge Function | `POST /auth-microsoft?action=device-flow` |
| `GET /api/auth/accounts` | Edge Function | `GET /api-v1-accounts` |
| `DELETE /api/auth/accounts/:id` | Edge Function | `DELETE /api-v1-accounts/:id` |
| `GET /api/emails` | Edge Function | `GET /api-v1-emails` |
| `GET /api/emails/:id` | Edge Function | `GET /api-v1-emails/:id` |
| `DELETE /api/emails/:id` | Edge Function | `DELETE /api-v1-emails/:id` |
| `GET /api/emails/summary/categories` | Edge Function | `GET /api-v1-emails/summary/categories` |
| `GET /api/rules` | Edge Function | `GET /api-v1-rules` |
| `POST /api/rules` | Edge Function | `POST /api-v1-rules` |
| `PATCH /api/rules/:id` | Edge Function | `PATCH /api-v1-rules/:id` |
| `DELETE /api/rules/:id` | Edge Function | `DELETE /api-v1-rules/:id` |
| `POST /api/rules/:id/toggle` | Edge Function | `POST /api-v1-rules/:id/toggle` |
| `GET /api/settings` | Edge Function | `GET /api-v1-settings` |
| `PATCH /api/settings` | Edge Function | `PATCH /api-v1-settings` |
| `GET /api/settings/stats` | Edge Function | `GET /api-v1-settings/stats` |
| `POST /api/sync` | Express API | `POST /api/sync` (unchanged) |
| `POST /api/actions/execute` | Express API | `POST /api/actions/execute` (unchanged) |

## Testing Checklist

- [ ] Edge Functions deployed successfully
- [ ] Environment secrets configured in Supabase
- [ ] Gmail OAuth flow works
- [ ] Microsoft OAuth flow works
- [ ] Email list loads from Edge Function
- [ ] Rules CRUD works via Edge Functions
- [ ] Settings update works via Edge Function
- [ ] Sync triggers from frontend to Express API
- [ ] AI processing works in Express API
- [ ] Actions execute correctly

## Benefits Achieved

1. ✅ **Simple User Setup** - Only need Supabase URL + Publishable Key
2. ✅ **Serverless Auth** - OAuth works even when local app offline
3. ✅ **Private AI Processing** - Runs locally, no cloud logs
4. ✅ **Secure Secrets** - OAuth credentials stay in Supabase
5. ✅ **Scalable** - Edge Functions auto-scale, local app per-user
6. ✅ **Cost Efficient** - Heavy compute on user's hardware

## Next Steps

1. Test the complete flow end-to-end
2. Update Express API to remove old auth/database routes
3. Add RealTimeX Desktop integration
4. Create migration guide for existing users

## Port Configuration

### Default Ports

Email Automator now uses **port 3004** by default to avoid conflicts with RealTimeX Desktop:

| Service | Port | Notes |
|---------|------|-------|
| RealTimeX Desktop | 3001, 3002 | Reserved |
| Email Automator API | 3004 | Configurable |
| Frontend Dev | 5173 | Vite default |

### Changing Ports

```bash
# Via command line
npm run dev:api -- --port 3005

# Via environment variable
PORT=3005 npm run dev:api

# In .env file
PORT=3004
VITE_API_URL=http://localhost:3004
```

See [Port Configuration](PORT-CONFIGURATION.md) for full details.

## RealTimeX Desktop Integration

Email Automator is designed to work seamlessly with RealTimeX Desktop:

- **Auto-discovery**: RealTimeX Desktop can detect Email Automator on port 3004
- **Health monitoring**: Desktop polls `/api/health` endpoint
- **Sync triggers**: Desktop can trigger syncs via API calls
- **Real-time updates**: Both receive Supabase Realtime events

See [RealTimeX Integration](REALTIMEX-INTEGRATION.md) for integration guide.
