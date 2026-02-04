# Configuration

The **Configuration** tab is the command center of Email Automator. Here, you connect your email providers, define your AI's behavior, and set up the rules that drive automation.

---

## 📧 Email Accounts (BYOK)

Email Automator follows a **"Bring Your Own Key" (BYOK)** model. You provide your own OAuth credentials, ensuring that your data access remains entirely under your control.

### 🔴 Gmail Setup (OAuth 2.0)
1.  **Google Cloud Console**: Create a project and enable the **Gmail API**.
2.  **Consent Screen**: Configure the OAuth consent screen and add your email as a **Test User**.
3.  **Credentials**: Create an **OAuth 2.0 Client ID** (Type: Web Application).
    *   **Authorized Redirect URI**: `https://<your-project-ref>.supabase.co/functions/v1/auth-gmail/callback`
4.  **Connect**: In Email Automator, click **Connect Gmail**.
5.  **Authorize**: Paste your Client ID and Secret (or upload the JSON), then follow the link to authorize your account.

### 🔵 Outlook Setup (Device Code)
1.  **Azure Portal**: Register a new application in **App Registrations**.
2.  **Account Type**: Select "Accounts in any organizational directory and personal Microsoft accounts".
3.  **Authentication**: Ensure "Allow public client flows" is set to **Yes**.
4.  **Connect**: In Email Automator, click **Connect Outlook** and enter your **Client ID**.
5.  **Authorize**: Follow the **Device Code** prompt in your browser to complete the sign-in.

---

## 📅 Sync Scope & Limits

Before starting your first sync, configure the boundaries to ensure performance and cost-efficiency:

*   **Sync From**: Choose the starting date (e.g., "From Now" or a specific historical date).
*   **Max Emails**: Set the maximum number of emails to process in a single batch (Default: 50).
*   **Sync Interval**: Define how often the background scheduler should check for new mail (e.g., every 15 minutes).

> [!TIP]
> **Start Small**: For your first run, we recommend setting "Sync From" to "Now" and "Max Emails" to 10-20 to verify your rules are working as expected.

---

## 🤖 Automation & Auto-Pilot

Management of your AI's behavior—including building custom rules, toggling system automations, and setting retention policies—has been consolidated into the **[Auto-Pilot](./AUTOMATION.md)** tab.

---

## 🧠 AI & System Settings

### Provider Configuration
Email Automator detects available models via **RealTimeX Desktop**.
*   **LLM Provider**: Choose your preferred AI engine (e.g., OpenAI, Anthropic, or local models).
*   **Embedding Model**: Used for the RAG (Retrieval-Augmented Generation) system to help the AI understand your specific context.

### Voice & Accessibility (TTS)
Enable **Text-to-Speech** to have the AI read summaries or important alerts aloud.
*   **Auto-Speak**: Automatically read high-priority notifications.
*   **Voice Profile**: Choose from various high-quality voices available through RealTimeX.

---

**Next Step:** [Monitoring the Dashboard](./DASHBOARD.md)
