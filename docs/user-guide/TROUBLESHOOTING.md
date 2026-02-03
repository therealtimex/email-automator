# Troubleshooting & Support

If you encounter issues, this guide covers the most common pitfalls and their solutions.

---

## 📡 Synchronization Issues

### Emails are not appearing in the Dashboard
*   **Check "Sync From" Date**: The AI only processes emails received *after* this date.
*   **Reset Checkpoint**: If you’ve changed your start date and want to re-scan old emails, click the **Reset Checkpoint** button in the Sync Scope panel.
*   **Batch Limits**: The **Max Emails** setting limits how many emails are processed per run. If you have a large backlog, it may take several sync cycles to catch up.
*   **Manual Trigger**: Click **Run Sync Now** on the Dashboard to force an immediate check.

### "Sync Failed" or "Backend Not Connected"
*   **Local Server**: Ensure the Email Automator application is open and running.
*   **Live Activity Feed**: Open the **Live Activity** terminal. It often contains specific technical error messages (e.g., "Network Error" or "401 Unauthorized").

---

## 🔑 Authentication & Permissions

### Google/Gmail: `redirect_uri_mismatch`
*   **The Fix**: Your Redirect URI in the Google Cloud Console must *exactly* match the one shown in Email Automator.
*   **Example**: `https://your-ref.supabase.co/functions/v1/auth-gmail/callback` (ensure no trailing slashes or spaces).

### Microsoft/Outlook: Login fails or times out
*   **App Registration**: Ensure your Azure App Registration has "Allow public client flows" set to **Yes**.
*   **Account Type**: Ensure you selected "Accounts in any organizational directory and personal Microsoft accounts" during registration.

### Supabase: "Invalid API Key"
*   **The Fix**: Always use the **anon (public)** key. The **service_role** key will be rejected by the app for security reasons.

---

## 🤖 AI & RealTimeX Integration

### AI is slow or unresponsive
*   **Local Models**: If using Ollama or LM Studio, ensure your machine has sufficient RAM and your GPU is not under heavy load.
*   **Discovery**: If no models appear in the dropdown, ensure **RealTimeX Desktop** is running and you have configured at least one AI provider within it.

### "Smart Drafts" are not being created
*   **System Toggle**: Ensure **Smart Drafts** is toggled **ON** in the Auto-Pilot tab.
*   **Rule Conflict**: Verify that the rule matching the email actually includes the **Draft** action.
*   **Safety Filter**: The AI automatically skips drafting for `no-reply` addresses and certain automated notifications to prevent "bot loops."

---

## 🗄️ Database & Migrations

### "Database Migration Required" Banner
*   **Why it happens**: Your local app has been updated, and your Supabase database schema needs to catch up to support new features.
*   **The Fix**: Click **Update Now** in the banner. You will need your **Supabase Access Token** to run the update automatically.

### Live Terminal is empty or shows "404"
*   **Realtime Permissions**: Ensure you have run the latest migrations. The `processing_events` table must exist and have the correct RLS (Row Level Security) policies enabled.

---

## 🆘 Still Need Help?

If your issue isn't listed here:
1.  Check the **System Logs** in the Account Settings for technical stack traces.
2.  Review the [Developer Documentation](../docs-dev/README.md) for advanced setup details.
3.  Open a ticket or discussion in the project repository.
