# RealTimeX Desktop Integration

## Overview

Email Automator is designed to work as a **Local App** within the RealTimeX ecosystem. This document explains how to integrate Email Automator with RealTimeX Desktop.

## Port Configuration

### Reserved Ports

RealTimeX Desktop uses:
- **Port 3001**: RealTimeX Desktop API
- **Port 3002**: RealTimeX Desktop Services

Email Automator uses:
- **Port 3004**: Email Automator Express API (default)
- **Port 5173**: Frontend dev server (Vite)

### Configurable Ports

Email Automator ports are fully configurable via:

```bash
# Command line
npm run dev:api -- --port 3005

# Environment variable
PORT=3005 npm run dev:api

# .env file
PORT=3005
VITE_API_URL=http://localhost:3005
```

## RealTimeX Desktop Configuration

When configuring Email Automator in RealTimeX Desktop:

1. **Supabase Setup**:
   - Provide Supabase Project URL
   - Provide Publishable/Anon Key
   - RealTimeX Desktop will handle Edge Functions deployment

2. **Local App Configuration**:
   - API Port: 3004 (or custom)
   - Sync Interval: 5 minutes (configurable)
   - Auto-start on Desktop launch: Yes/No

3. **Database Listening** (for Local Apps pattern):
   - Table: `emails`
   - Events: `INSERT`, `UPDATE`
   - Action: Trigger sync/processing

## Local Apps Pattern

Email Automator follows the RealTimeX Local Apps architecture:

```
RealTimeX Desktop → Monitors Supabase Realtime
                 ↓
         Triggers Email Automator
                 ↓
Email Automator → Syncs emails → Stores in Supabase
                 ↓
         RealTimeX Desktop receives updates
```

### Event Flow

1. **Manual Sync Trigger**:
   - User clicks "Sync" in RealTimeX Desktop
   - Desktop calls `POST http://localhost:3004/api/sync`
   - Email Automator fetches and processes emails

2. **Scheduled Sync**:
   - RealTimeX Desktop triggers sync at intervals
   - Email Automator runs background processing
   - Results stored in Supabase

3. **Real-time Updates**:
   - Supabase emits INSERT events for new emails
   - RealTimeX Desktop updates UI in real-time

## Multiple Instances

You can run multiple Email Automator instances for different accounts:

```bash
# Instance 1 (Account A)
PORT=3004 npm run dev:api

# Instance 2 (Account B)
PORT=3005 npm run dev:api
```

Each instance:
- Uses separate port
- Syncs different email accounts
- Reports to same Supabase database
- Distributed processing via locks

## Health Monitoring

RealTimeX Desktop can monitor Email Automator health:

```bash
curl http://localhost:3004/api/health
```

Response:
```json
{
  "status": "ok",
  "services": {
    "supabase": "connected",
    "llm": "configured"
  }
}
```

## Logs and Debugging

Email Automator logs to:
- **Console**: Real-time logs during development
- **Supabase**: `sync_logs` table for history

RealTimeX Desktop can display logs in real-time.

## Security Considerations

- **No Public Exposure**: Email Automator runs on localhost only
- **No Authentication**: Trusts local environment (DISABLE_AUTH=true)
- **RLS Enforcement**: Database access controlled by Supabase RLS
- **Edge Functions**: OAuth secrets stay in Supabase

## Best Practices

1. **Start Order**: Start RealTimeX Desktop before Email Automator
2. **Port Conflicts**: Verify ports before starting
3. **Credentials**: Configure via RealTimeX Desktop UI, not .env
4. **Updates**: RealTimeX Desktop can update Edge Functions automatically
