# AI Email Automator - RealTimeX Local App

A private, agentic email management application designed specifically for the **RealTimeX** ecosystem. Automate your inbox with local AI, categorize communications, and generate smart drafts while maintaining 100% data sovereignty.

## 🚀 Vision: "Own Your Inbox"

Email Automator is a dedicated **Local App** for RealTimeX Desktop. It follows the **Own Your Data** philosophy by turning your email into a managed task list powered by your own infrastructure:

- **RealTimeX Integration**: Seamlessly connects with RealTimeX Desktop for LLM and TTS services.
- **Zero Cloud Costs**: Runs entirely on your own Supabase instance and local machine.
- **Privacy First**: Your emails are processed locally; no third-party data mining.
- **Agentic Intelligence**: A context-aware assistant that suggests "Winning Responses".

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

## 🏁 Getting Started

Email Automator uses the **"Bring Your Own Key" (BYOK)** model, ensuring your data remains under your control within your own Supabase infrastructure.

### Prerequisites
1.  **RealTimeX Desktop**: Installed and running. Required for AI processing (LLMs) and Text-to-Speech (TTS).
2.  **Supabase Account**: A free or paid account at [supabase.com](https://supabase.com).

### 🚀 Quick Setup with the Wizard
The built-in **Setup Wizard** is the recommended way to get started. It automates the technical heavy lifting.

1.  **Purchase & Launch**: Open **RealTimeX Desktop** → **Marketplace** → Search for **"Email Automator"** and click **Launch**.
2.  **Run the Setup Wizard**: Choose **Managed Provisioning** and provide a **Supabase Access Token**. The wizard will automatically create your project, run migrations, and deploy Edge Functions.
3.  **Create Your Account**: Once ready, create your local user account and sign in to access the **Dashboard**.

For more detailed guides, visit the [**Documentation Hub**](docs/README.md).

## 🛠 Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, Vite 7, TailwindCSS 4, Lucide Icons |
| **Edge Functions** | Deno, Supabase Functions (OAuth, DB proxy) |
| **Local API** | Node.js, Express 5, TypeScript (Sync, AI) |
| **AI Services** | Powered by **RealTimeX Desktop** (Ollama, LM Studio, OpenAI, Anthropic) |
| **Database** | Supabase (PostgreSQL) with RLS |

## 📂 Project Structure

```
├── api/                       # Local App (Express)
│   ├── server.ts              # Express entry point
│   └── src/
│       ├── services/          # Email sync, AI processing
├── docs/                      # Documentation (Multi-language)
├── src/                       # Frontend (React)
├── supabase/                  # Supabase Configuration
│   ├── functions/             # Edge Functions (OAuth, DB)
│   └── migrations/            # Database schema
```

## 🧪 Development & Testing

If you are a developer looking to contribute or run from source:

```bash
# Install dependencies
npm install

# Terminal 1: Local API (Default port: 3004)
npm run dev:api

# Terminal 2: Frontend
npm run dev

# Run Tests
npm run test:run
```

**Note:** Email Automator uses port **3004** by default to avoid conflicts with RealTimeX Desktop (ports 3001/3002).

## 📦 NPX Commands (Advanced)

| Command | Description |
|---------|-------------|
| `npx @realtimex/email-automator` | Start the Email Automator API server |
| `npx @realtimex/email-automator-setup` | Interactive setup wizard |
| `npx @realtimex/email-automator-deploy` | Deploy Edge Functions to Supabase |

## 📄 License

MIT License - Copyright (c) 2026 RealTimeX Team

