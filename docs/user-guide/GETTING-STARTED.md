# Getting Started

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

Next step: [**Configuration**](./CONFIGURATION.md)
