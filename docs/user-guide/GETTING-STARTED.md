# Getting Started

Welcome to **Email Automator**, your AI-powered personal email assistant. This guide will help you set up the application using the **"Bring Your Own Key" (BYOK)** model, which ensures your data remains under your control within your own Supabase infrastructure.

## 🛠 Prerequisites

Before you begin, ensure you have the following:

1.  **RealTimeX Desktop**: Installed and running. This is required for AI processing (LLMs) and Text-to-Speech (TTS) capabilities.
2.  **Supabase Account**: A free or paid account at [supabase.com](https://supabase.com).

---

## 🚀 Quick Setup with the Wizard

The built-in **Setup Wizard** is the recommended way to get started. It automates the technical heavy lifting.

### 1. Purchase & Launch
*   Open **RealTimeX Desktop**.
*   Go to the **Marketplace** tab → **Local Apps**.
*   Search for **"Email Automator"** and purchase it (or activate if already owned).
*   Once purchased, click **Launch** from your Local Apps list.

### 2. Run the Setup Wizard
Upon first launch, the app will guide you through the initial configuration:

*   **Choose a Setup Path**:
    *   **Managed Provisioning (Recommended)**: Provide a **Supabase Access Token**. The wizard will automatically create a new project, run database migrations, deploy Edge Functions, and ingest the initial knowledge base.
    *   **Connect Existing Project**: Use an existing Supabase project by providing your **Project URL** and **Anon Key**. You can optionally provide an Access Token here to have the wizard run migrations for you.

### 3. Create Your Account
Once the database is ready, you will be prompted to create your local user account and sign in to access the **Dashboard**.

---

## 🔍 Finding Your Supabase Credentials

If you choose to connect an existing project manually, you can find your credentials in the [Supabase Dashboard](https://supabase.com/dashboard):

1.  Select your project.
2.  Navigate to **Settings** → **API**.
3.  **Project URL**: Copy the URL found under "Project URL".
4.  **API Key**: Copy the **anon (public)** key under "Project API keys".

> [!WARNING]
> **Security Note**: Never use the `service_role` key. It has full administrative bypass privileges and should never be exposed in client-side applications.

---

## 🪪 Generating an Access Token

An Access Token allows the Setup Wizard to manage your Supabase projects (creation, migrations, function deployment) on your behalf.

1.  In your Supabase Dashboard, go to **Account** → **Access Tokens**.
2.  Click **Generate new token**, give it a name (e.g., "Email Automator"), and copy the result.
3.  Paste this token into the Setup Wizard when prompted.

---

**Next Step:** [Configure your Email Accounts](./CONFIGURATION.md)  
**Glossary:** [Common Terms](./GLOSSARY.md)
