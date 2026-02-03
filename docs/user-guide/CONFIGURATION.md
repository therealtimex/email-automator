# Configuration

The **Configuration** tab is where you connect email providers, define automation rules, and tune AI + sync behavior.

---

## 🔑 Email Accounts (Gmail & Outlook)

Email Automator uses **BYOK** credentials. You connect your own Gmail/Outlook apps to keep control of your data.

### Gmail Setup (OAuth)
1.  In **Google Cloud Console**, create a project and enable the **Gmail API**.
2.  Configure the OAuth consent screen and add your account as a test user.
3.  Create an **OAuth 2.0 Client ID (Web Application)**.
    *   **Authorized Redirect URI**: `https://<your-project-ref>.supabase.co/functions/v1/auth-gmail/callback`
4.  In **Configuration → Email Accounts**, click **Connect Gmail**.
5.  Paste the **credentials JSON** (or enter Client ID + Secret manually).
6.  Complete the browser authorization and paste the **authorization code**.

### Outlook Setup (Device Code)
1.  In **Azure App Registrations**, register a new application.
2.  Supported account types: **organizational + personal Microsoft accounts**.
3.  Copy the **Application (client) ID** and (optional) **Tenant ID**.
4.  In **Configuration → Email Accounts**, click **Connect Outlook**.
5.  Follow the **Device Code** prompt and complete sign-in.

---

## 🤖 Automation Rules

### System Rules (Quick Toggles)
*   **Auto-Trash Spam**: Deletes emails categorized as spam.
*   **Smart Drafts**: Generates draft replies when a rule requests drafting.

### Custom Rules
Create rules with one or more actions:
*   **Conditions**:
    *   **AI Analysis**: Category, Sentiment, Priority
    *   **Metadata**: Sender Email, Sender Domain, Sender Contains, Subject Contains, Body Contains
    *   **Age Filter**: “Older than X days”
*   **Actions**: Archive, Delete, Draft, Star
*   **Draft Instructions**: Provide extra context if your rule includes Draft
*   **Attachments**: Upload files to include in drafted replies

> Tip: The **Auto-Pilot** tab provides a grouped view of all rules (system + custom) and quick enable/disable controls.

---

## 🧠 AI Model Configuration

Use this section to control AI routing and local storage behavior:
*   **Provider + Model**: Discovered via **RealTimeX Desktop**
*   **Storage Path**: Where raw `.eml` files are stored locally (must be writable)
*   **Intelligent Rename**: Slugifies and timestamps filenames for cleaner archives
*   **Sync Interval (minutes)**: How often the background scheduler syncs accounts
*   **Test Connection**: Validate provider access

---

## 🧩 Embedding Provider (RAG)

Configure the embedding model used for the documentation knowledge base (RAG).
*   Default: **RealTimeX AI / text-embedding-3-small**
*   Choose a different provider/model if needed

---

## 🔊 Voice & Speech (TTS)

Control text-to-speech for AI responses:
*   **Auto-Speak** toggle
*   **Provider + Voice**
*   **Speed + Quality**

Next step: [**Using the Dashboard**](./DASHBOARD.md)
