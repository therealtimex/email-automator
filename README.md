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
- **Modular Backend**: Express routes, middleware, services architecture
- **State Management**: React Context with centralized app state
- **Error Handling**: Error boundaries, toast notifications, logging
- **Analytics Dashboard**: Email stats, category breakdown, sync history
- **Docker Ready**: Multi-stage builds, docker-compose, health checks
- **CI/CD**: GitHub Actions pipeline with tests and Docker builds

## 🛠 Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, Vite 7, TailwindCSS 4, Lucide Icons |
| **Backend** | Node.js, Express 5, TypeScript |
| **AI** | OpenAI / Instructor-JS (supports Ollama, LM Studio) |
| **Database** | Supabase (PostgreSQL) with RLS |
| **Testing** | Vitest, Testing Library |
| **DevOps** | Docker, GitHub Actions, nginx |

## 🏁 Quick Start

### Prerequisites
- Node.js v20+
- Supabase project
- LLM API key (OpenAI, Anthropic, or local)

### Installation

```bash
git clone https://github.com/therealtimex/email-automator.git
cd email-automator
npm install
cp .env.example .env
# Edit .env with your credentials
```

### Development

```bash
# Terminal 1: Frontend
npm run dev -- --port 3003

# Terminal 2: Backend
npm run serve -- --port 3002
```

### Production (Docker)

```bash
# Build and run
docker-compose up -d

# Or build individually
docker build -t email-automator-api .
docker build -f Dockerfile.frontend -t email-automator-frontend .
```

## 📂 Project Structure

```
├── api/
│   ├── server.ts              # Express entry point
│   └── src/
│       ├── config/            # Environment configuration
│       ├── middleware/        # Auth, rate limiting, validation
│       ├── routes/            # API endpoints
│       ├── services/          # Business logic
│       └── utils/             # Logger, crypto, helpers
├── src/
│   ├── components/            # React components
│   ├── context/               # App state management
│   ├── hooks/                 # Custom hooks (realtime)
│   └── lib/                   # API client, types, utils
├── supabase/
│   └── migrations/            # Database schema
├── tests/                     # Unit & integration tests
├── Dockerfile                 # API container
├── Dockerfile.frontend        # Frontend container
└── docker-compose.yml         # Full stack deployment
```

## 🔐 Environment Variables

```bash
# Required
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
LLM_API_KEY=your-llm-key

# OAuth (for email providers)
GMAIL_CLIENT_ID=xxx
GMAIL_CLIENT_SECRET=xxx
MS_GRAPH_CLIENT_ID=xxx

# Security (production)
JWT_SECRET=min-32-char-secret
TOKEN_ENCRYPTION_KEY=32-char-key
CORS_ORIGINS=https://yourdomain.com
```

## 🧪 Testing

```bash
npm run test           # Watch mode
npm run test:run       # Single run
npm run test:coverage  # With coverage
```

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/auth/gmail/url` | Get Gmail OAuth URL |
| POST | `/api/auth/gmail/callback` | Complete Gmail OAuth |
| GET | `/api/auth/accounts` | List connected accounts |
| POST | `/api/sync` | Trigger email sync |
| GET | `/api/emails` | List processed emails |
| POST | `/api/actions/execute` | Execute email action |
| GET | `/api/rules` | List automation rules |
| GET | `/api/settings` | Get user settings |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm run test:run`
5. Submit a Pull Request

## 📄 License

MIT License - Copyright (c) 2026 RealTimeX Team
