# Email Automator User Guide

Welcome to the **Email Automator**, your personal AI-powered email assistant. This tool runs locally on your machine, ensuring your data stays private while leveraging the power of AI to organize, prioritize, and automate your inbox.

## 🚀 Key Features

*   **Privacy First**: Runs locally on your machine. Your emails are not stored on our servers.
*   **AI Analysis**: Automatically categorizes emails (Spam, Newsletter, Client, etc.) and analyzes sentiment.
*   **Auto-Pilot Rules**: Create custom "If This Then That" rules based on AI analysis (e.g., "If Sentiment is Negative, Draft Reply").
*   **Smart Actions**: Auto-trash spam, generate smart drafts, and prioritize your inbox.
*   **BYOK Credentials**: "Bring Your Own Key" architecture for full control over your Gmail and Outlook connections.

---

## 🛠️ Installation & Setup

### Prerequisites

*   **Node.js** (v18 or higher)
*   **Supabase CLI** (for local database)
*   **Git**

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/therealtimex/email-automator.git
    cd email-automator
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    # Enter the api directory and install its dependencies too
    cd api && npm install && cd ..
    ```

3.  **Start the Local Database**:
    Make sure Docker is running, then:
    ```bash
    npx supabase start
    ```

### Running the Application (CRITICAL)

The Email Automator consists of two parts defined by a "Hybrid Architecture": the **Frontend** (UI) and the **Backend Brain** (Sync Engine). **BOTH** must be running for the app to work.

Open **two separate terminal windows**:

**Terminal 1: The Frontend**
```bash
npm run dev
```
*   This runs the UI at `http://localhost:5173`.

**Terminal 2: The Brain**
```bash
npm run dev:api
```
*   This runs the local Express server that connects to Gmail/Outlook and executes your valid rules.

---

## ⚙️ Configuration

Before you can sync emails, you need to configure your provider credentials.

### 1. Provider Credentials (BYOK)

Navigate to the **Configuration** tab in the UI.

#### Gmail Setup
1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new Project.
3.  Enable the **Gmail API**.
4.  Configure the OAuth Consent Screen (User Type: External). Add your email as a test user.
5.  Create Credentials -> **OAuth Client ID** (Web Application).
    *   **Authorized Redirect URI**: `https://<your-supabase-project-id>.supabase.co/functions/v1/auth-gmail/callback` (You can find this URL in your browser address bar when the auth fails, or ask your admin).
    *   *Note: For local development, check the `supabase/functions/auth-gmail/index.ts` or console logs for the exact redirect URI expected.*
6.  Copy the **Client ID** and **Client Secret** into the Email Automator Configuration tab.

#### Outlook Setup
1.  Go to [Azure App Registrations](https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps).
2.  New Registration -> Accounts in any organizational directory (Any Azure AD directory - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox).
3.  Copy the **Application (client) ID** and **Directory (tenant) ID** into the Configuration tab.
4.  (Optional) Add a Client Secret if you need advanced server-side flows (not required for Device Code flow).

#### Sync Performance & Scope
To prevent overwhelming your machine with thousands of old emails, use the **Sync Scope** card located on the **Dashboard (Right Sidebar)**:
*   **Sync Interval**: Set how often the background sync process checks for new emails (Global setting).
*   **Per-Account Settings**: Each connected Gmail or Outlook account has its own scope settings.
*   **Sync From Date**: Set a date (e.g., "2026-01-01") to ignore emails received before that date for that specific account.
*   **Max Emails / Run**: Limit how many emails are processed in a single batch (Default: 50).
*   **Realtime Status**: The card shows the status of the last sync (Success, Error, or Syncing) and the timestamp of the last run.

---

## 🎮 Using the Dashboard

### Syncing Emails
*   Click the **"Sync Now"** button in the top right to sync all accounts.
*   Alternatively, use the refresh icon in the **Sync Scope** sidebar card to sync a specific account.
*   **Incremental Sync**: The system remembers its last checkpoint. Subsequent syncs only fetch emails received after the last successful run.
*   **Realtime Updates**: Emails will appear in the dashboard as they are analyzed by the AI.

### Categories & Filters
*   Use the buttons (All, Spam, Client, Newsletter) to filter your view.
*   The AI automatically assigns these categories based on email content.

### Manual Actions
When viewing an email, you can perform actions that sync back to your provider:
*   🗑️ **Delete**: Trashes the email.
*   📦 **Archive**: Removes from Inbox.
*   🚩 **Flag**: Marks as important/star.
*   📖 **Mark as Read**: Marks the email as read.

---

## 🤖 Auto-Pilot Rules (Automation)

This is the power of the Email Automator. You can define rules that run automatically every time a new email arrives.

### Built-in Toggles
*   **Auto-Trash Spam**: Automatically deletes emails categorized as "Spam" with high confidence.
*   **Smart Drafts**: Automatically generates a context-aware draft reply for "Important" emails.

### Custom Rules
Create your own "If This Then That" logic.

1.  Click **"Add Rule"** in the Configuration tab.
2.  **Condition**: Choose what triggers the rule.
    *   *Category*: e.g., "Is Newsletter"
    *   *Sentiment*: e.g., "Is Negative" (Great for catching angry clients!)
    *   *Priority*: e.g., "Is Low"
3.  **Action**: Choose what to do.
    *   *Archive*: Clear the clutter.
    *   *Delete*: Remove unwanted mail.
    *   *Draft Reply*: Get a head start on responding.
    *   *Mark as Read*: Acknowledge receipt without opening.
    *   *Star / Flag*: Highlight for later.

**Example**:
> **IF** Sentiment is **Negative** AND Category is **Client** -> **Draft Reply** (Draft a polite apology/resolution).

---

## ❓ Troubleshooting

**"Sync Failed" / "Backend not connected"**
*   Check Terminal 2. Is `npm run dev:api` running?
*   The syncing logic lives in this local server, not the browser.

**"Credentials Missing"**
*   Go to Configuration and ensure you have entered and **Saved** your Client IDs and Secrets.
*   If you see environment variable errors in the logs, try re-entering them in the UI (UI settings override environment variables).

**OAuth Error 400: redirect_uri_mismatch**
*   Double-check the Redirect URI in your Google Cloud Console. It must match exactly what the application sends.

**Migration Errors**
*   The app includes a self-healing migration system. If you see database errors on startup, try restarting the frontend (`npm run dev`), which triggers a schema check.
