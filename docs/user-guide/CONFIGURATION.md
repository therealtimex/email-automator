# Configuration

Before the AI agent can process your emails, you must configure your provider credentials and define your synchronization scope.

## 🔑 Provider Credentials (BYOK)

Email Automator uses a **"Bring Your Own Key"** architecture. You provide your own OAuth credentials to ensure you maintain full control over your data connection.

### Gmail Setup
1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new Project and enable the **Gmail API**.
3.  Configure the OAuth Consent Screen (User Type: External) and add your email as a test user.
4.  Create **OAuth 2.0 Client IDs** (Web Application).
    *   **Authorized Redirect URI**: `https://<your-project-ref>.supabase.co/functions/v1/auth-gmail/callback`
5.  Enter the **Client ID** and **Client Secret** into the **Configuration** tab of the app.

### Outlook Setup
1.  Go to the [Azure App Registrations](https://portal.azure.com/).
2.  Register a new application.
    *   **Supported Account Types**: "Accounts in any organizational directory and personal Microsoft accounts".
3.  Copy the **Application (client) ID** and **Directory (tenant) ID** into the **Configuration** tab.
4.  Follow the **Device Code** flow prompted in the app to authorize access.

---

## 📡 Sync Scope & Performance

Use the **Sync Scope** card on the Dashboard sidebar to manage background activity.

### Global Interval
*   **Sync Interval (min)**: Defines how often the background agent wakes up to check for new emails. (Default: 5 minutes).

### Per-Account Controls
*   **Sync From**: Set a specific starting date. The agent will ignore all emails received before this timestamp.
*   **Max Emails**: Limits the batch size for each sync run (Default: 50). This prevents overwhelming your local machine during the first sync.
*   **Reset Checkpoint**: Use the "Rotate" icon to clear the internal memory and force a full re-scan from your "Sync From" date.

Next step: [**Using the Dashboard**](./DASHBOARD.md)
