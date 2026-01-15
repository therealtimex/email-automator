# AI Email Automator v2.0

An agentic, AI-powered email management platform that learns to handle your inbox. Categorize, archive, delete, and draft responses automatically using LLMs and Supabase.

## 🚀 Vision: "Own Your Inbox"

The AI Email Automator is designed as a standalone "Agent" for the RealTimeX ecosystem. It follows the **Own Your Data** philosophy:

- **Zero Cloud Costs**: Runs on your infrastructure using Supabase
- **Privacy First**: Your emails are processed on your private infrastructure
- **Agentic Intelligence**: An assistant that suggests "Winning Responses"
- **Production Ready**: Full security, testing, and DevOps infrastructure

## ✨ Features

### Core Capabilities
- **Smart Categorization**: AI classifies emails (Spam, Newsletter, Support, Client, etc.)
- **Inbox Zero Engine**: Auto-trash spam and archive newsletters
- **Winning Responses**: AI-generated draft replies for important emails
- **Multi-Provider**: Gmail (OAuth2) and Microsoft 365 (Device Flow)
- **Automation Rules**: Custom rules for auto-pilot email handling
- **Real-time Sync**: Live updates via Supabase subscriptions
- **Background Scheduler**: Automatic periodic email sync

### Production Features
- **Security**: JWT auth, token encryption, rate limiting, input validation
- **Hybrid Architecture**: Edge Functions (serverless) + Local App (privacy)
- **State Management**: React Context with centralized app state
- **Error Handling**: Error boundaries, toast notifications, logging
- **Analytics Dashboard**: Email stats, category breakdown, sync history
- **RealTimeX Integration**: Works with RealTimeX Desktop as Local App

## 🛠 Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, Vite 7, TailwindCSS 4, Lucide Icons |
| **Edge Functions** | Deno, Supabase Functions (OAuth, DB proxy) |
| **Local API** | Node.js, Express 5, TypeScript (Sync, AI) |
| **AI** | OpenAI / Instructor-JS (supports Ollama, LM Studio) |
| **Database** | Supabase (PostgreSQL) with RLS |
| **Testing** | Vitest, Testing Library |

## 🏁 Quick Start

### Prerequisites
- Node.js v20+
- Supabase project with CLI access
- LLM API key (OpenAI, Anthropic, or local)

### Option 1: Using npx (Recommended)

```bash
# Interactive setup
npx @realtimex/email-automator-setup

# Deploy Edge Functions
npx @realtimex/email-automator-deploy

# Start Email Automator
npx @realtimex/email-automator
```

### Option 2: Clone and Install

```bash
git clone https://github.com/therealtimex/email-automator.git
cd email-automator
npm install
```

### Setup

1. **Deploy Edge Functions to Supabase:**
```bash
supabase login
./scripts/deploy-functions.sh
```

2. **Configure Edge Function Secrets in Supabase Dashboard:**
   - Settings → Edge Functions → Add secrets
   - Required: `TOKEN_ENCRYPTION_KEY`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, etc.

3. **Configure Local Environment:**
```bash
cp .env.example .env
# Edit .env with your credentials
```

### Development

```bash
# Terminal 1: Local API (Email Sync & AI Processing)
# Default port: 3004 (RealTimeX Desktop uses 3001/3002)
npm run dev:api

# Terminal 2: Frontend
npm run dev

# Optional: Specify custom ports
npm run dev:api -- --port 3005
npm run dev -- --port 5174
```

**Note:** Email Automator uses port **3004** by default to avoid conflicts with RealTimeX Desktop (ports 3001/3002). You can change ports via command line arguments or environment variables.

### Using npx

```bash
# Start with default port (3004)
npx @realtimex/email-automator

# Start with custom port
npx @realtimex/email-automator --port 3005
```

See [NPX Usage Guide](docs-dev/NPX-USAGE.md) for complete documentation.

## 📂 Project Structure

```
├── api/                       # Local App (Express)
│   ├── server.ts              # Express entry point
│   └── src/
│       ├── routes/            # Sync & Actions endpoints
│       ├── services/          # Email sync, AI processing
│       └── utils/             # Logger, crypto, helpers
├── src/                       # Frontend (React)
│   ├── components/            # React components
│   ├── context/               # App state management
│   ├── hooks/                 # Custom hooks (realtime)
│   └── lib/                   # Hybrid API client, types
├── supabase/                  # Supabase Configuration
│   ├── functions/             # Edge Functions (OAuth, DB)
│   │   ├── _shared/           # Shared utilities
│   │   ├── auth-gmail/        # Gmail OAuth
│   │   ├── auth-microsoft/    # Microsoft OAuth
│   │   ├── api-v1-accounts/   # Account management
│   │   ├── api-v1-emails/     # Email operations
│   │   ├── api-v1-rules/      # Rules CRUD
│   │   └── api-v1-settings/   # Settings & stats
│   └── migrations/            # Database schema
├── scripts/
│   └── deploy-functions.sh    # Deploy Edge Functions
└── tests/                     # Unit & integration tests
```

## 🔐 Environment Variables

### Edge Functions (Supabase Dashboard)
```bash
TOKEN_ENCRYPTION_KEY=32-char-key
GMAIL_CLIENT_ID=xxx
GMAIL_CLIENT_SECRET=xxx
MS_GRAPH_CLIENT_ID=xxx
MS_GRAPH_CLIENT_SECRET=xxx
```

### Local App (.env file)
```bash
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# API Configuration (default port: 3004)
VITE_API_URL=http://localhost:3004
PORT=3004

# LLM
LLM_API_KEY=your-llm-key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini

# Development
DISABLE_AUTH=true
```

## 🧪 Testing

```bash
npm run test           # Watch mode
npm run test:run       # Single run
npm run test:coverage  # With coverage
```

## 📡 API Architecture

### Edge Functions (Supabase)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth-gmail?action=url` | Get Gmail OAuth URL |
| POST | `/auth-gmail` | Complete Gmail OAuth |
| POST | `/auth-microsoft?action=device-flow` | Start Microsoft device flow |
| GET | `/api-v1-accounts` | List connected accounts |
| GET | `/api-v1-emails` | List processed emails |
| GET | `/api-v1-rules` | List automation rules |
| GET | `/api-v1-settings` | Get user settings |

### Local App (Express)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sync` | Trigger email sync |
| POST | `/api/actions/execute` | Execute email action |
| POST | `/api/actions/draft/:id` | Generate draft reply |
| GET | `/api/health` | Health check |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm run test:run`
5. Submit a Pull Request

## 📄 License

MIT License - Copyright (c) 2026 RealTimeX Team

## 📦 NPX Commands

Email Automator is fully compatible with npx for easy installation and execution:

| Command | Description |
|---------|-------------|
| `npx @realtimex/email-automator` | Start the Email Automator API server |
| `npx @realtimex/email-automator-setup` | Interactive setup wizard |
| `npx @realtimex/email-automator-deploy` | Deploy Edge Functions to Supabase |

### Examples

```bash
# First time setup
npx @realtimex/email-automator-setup
npx @realtimex/email-automator-deploy
npx @realtimex/email-automator

# Daily usage
npx @realtimex/email-automator

# Custom port
npx @realtimex/email-automator --port 3005
```

See [NPX Usage Guide](docs-dev/NPX-USAGE.md) for complete documentation.

