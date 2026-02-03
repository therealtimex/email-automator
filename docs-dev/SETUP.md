# Setup and Installation Guide

## 🛠️ Prerequisites

- **Node.js**: v20 or higher
- **Supabase Account**: For database hosting
- **Supabase CLI**: Recommended for local development

## 1. Installation

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd email-automator
npm install
```

## 2. Environment Configuration

The application is designed to be **Zero-Config** for end users, but developers can use a `.env` file to override defaults.

```bash
cp .env.example .env
```

**Variables:**
- `VITE_SUPABASE_URL`: (Optional) Pre-fill Supabase URL
- `VITE_SUPABASE_ANON_KEY`: (Optional) Pre-fill Supabase Key
- `PORT`: (Optional) Port for the unified server (default: 3004)

### LLM Configuration
All AI keys are managed via the **RealTimeX Desktop** app or entered into the app's **Configuration** tab. You do not need to put API keys in `.env`.

## 3. Running the Application

This project uses a **Unified Server** architecture. The Express API serves the React frontend, allowing a single-port deployment.

### Unified Dev Server (Recommended)
Runs both the backend API and the frontend build on port 3004.

```bash
# Build frontend and start server
npm run serve
```

### Split Dev Mode (For Core Devs)
If you need hot-reloading for both Frontend and Backend:

1.  **Backend (API)**:
    ```bash
    npm run dev:api
    ```
2.  **Frontend (Vite)**:
    ```bash
    npm run dev
    ```

## 4. Database Migration

The application includes an **Automated Migration Engine**.

1.  **Wizard Mode**: Simply start the app. If the database is empty, the **Setup Wizard** will appear and handle migrations for you using your Supabase credentials.
2.  **Manual Mode**:
    ```bash
    # Requires Supabase CLI
    npm run migrate
    ```

## 5. Troubleshooting

**"Port already in use"**
*   Kill the process on port 3004 or specify a different port:
    ```bash
    PORT=3005 npm run serve
    ```
