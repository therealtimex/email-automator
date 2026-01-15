# AI Email Automator

An agentic, AI-powered email management platform that learns to handle your inbox. Categorize, archive, delete, and draft responses automatically using LLMs and Supabase.

![Email Automator Dashboard](https://raw.githubusercontent.com/therealtimex/email-automator/main/public/dashboard-preview.png)

## 🚀 Vision: "Own Your Inbox"
The AI Email Automator is designed as a standalone "Agent" for the RealTimeX ecosystem. It follows the **Own Your Data** philosophy:
- **Zero Cloud Costs**: Runs on your infrastructure using Supabase.
- **Privacy First**: Your emails are processed locally/remote on your private DB.
- **Agentic Intelligence**: Not just a client, but an assistant that suggests "Winning Responses."

## ✨ Key Features
- **Smart Categorization**: Automatically classify emails into Spam, Newsletter, Support, Client, etc.
- **Inbox Zero Engine**: Instantly trash useless emails and archive newsletters.
- **Winning Responses**: AI-generated drafts for important client inquiries.
- **Multi-Provider Auth**: Full support for Gmail (OAuth2) and Microsoft 365 (Device Flow).
- **Automation Rules**: Define logic to handle repetitive tasks on auto-pilot.
- **RealTimeX Integration**: Compatible with the RealTimeX desktop suite.

## 🛠 Tech Stack
- **Frontend**: React + Vite + Tailwind CSS v4 + shadcn/ui
- **Backend**: Node.js (ESM) + Express + tsx
- **Intelligence**: Instructor-JS + OpenAI / Anthropic
- **Database**: Supabase (PostgreSQL) + Remote Migrations

## 🏁 Getting Started

### 1. Prerequisites
- Node.js v20+
- A Supabase project (URL & Anon Key)
- OpenAI API Key (or compatible LLM provider)

### 2. Installation
```bash
git clone https://github.com/therealtimex/email-automator.git
cd email-automator
npm install
```

### 3. Configuration
Copy the `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

### 4. Running the App
The app supports custom ports via command line arguments for compatibility with RealTimeX.ai:

**Start the Backend (API):**
```bash
npm run serve -- --port 3002
```

**Start the Frontend (Dashboard):**
```bash
npm run dev -- --port 3000
```

## 📂 Project Structure
- `frontend/`: React single-page application.
- `api/`: Express server and endpoints.
- `src/core/`: Business logic for Auth, AI, and Processor.
- `src/lib/`: Shared utilities and Supabase client.
- `supabase/`: Database migrations and schema.

## 🤝 Contributing
We welcome contributions! Please feel free to submit Pull Requests or open Issues on GitHub.

## 📄 License
MIT License - Copyright (c) 2026 RealTimeX Team
