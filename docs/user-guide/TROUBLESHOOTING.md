# Troubleshooting

Common issues and how to resolve them.

## 📡 Sync Issues

**"Sync Failed" or "Backend not connected"**
*   Ensure the local API server is running (source installs: `npm run dev:api`).
*   Confirm the backend is reachable on port 3004 and Vite is proxying `/api`.
*   Open **Live Activity** to see error details.

**Emails are not appearing**
*   **Check Start Date**: Emails older than your **Sync Scope** start date are ignored.
*   **Reset Checkpoint**: If you changed the start date but nothing happened, click the **Rotate Icon** (Reset Checkpoint) in the Sync Scope card. This forces a re-scan.
*   **Check Batch Size**: The **Max Emails** setting limits each run. It may take several cycles to catch up.
*   **Run Sync Now**: Trigger a manual sync from the Dashboard.

**Live Activity is empty**
*   Ensure your Supabase project is connected and migrations are up to date.
*   Check that the `processing_events` table exists (migrations create it).

---

## 🔑 Authentication Issues

**OAuth Error 400: redirect_uri_mismatch**
*   Go to your Google Cloud Console and ensure the Redirect URI exactly matches the one provided in the app configuration (it should end in `/functions/v1/auth-gmail/callback`).

**Outlook device code never completes**
*   Re-check the **Client ID** and (optional) **Tenant ID** in Configuration.
*   Confirm your Azure App Registration allows personal + organizational accounts.
*   Retry the device login flow from the app.

**"Invalid API Key" during Setup**
*   Use the **Anon/Public** key from Supabase, not the Service Role key.

---

## 🗄️ Database Issues

**"Database Migration Required" Banner**
*   This appears when your app version is newer than your database schema.
*   Click **Update Now** to open the migration modal and run updates.

**Missing Columns Error**
*   If logs show errors like `column "account_id" does not exist`, run migrations.
*   Preferred: use the **Migration Modal** in-app (requires a Supabase Access Token).
*   Source installs: run `./scripts/migrate.sh`.

---

## 🤖 AI Issues

**AI is taking too long**
*   If using a local model (Ollama/LM Studio), ensure your computer has enough RAM and a supported GPU.
*   If provider discovery fails, ensure **RealTimeX Desktop** is running.

**No drafts are generated**
*   Ensure **Smart Drafts** is enabled or your rule includes the **Draft** action.
*   Some senders (no-reply/automated) are skipped to avoid unwanted replies.

**TTS or voice list is empty**
*   Ensure RealTimeX Desktop is running.
*   Open **Configuration → Voice & Speech**, pick a provider/voice, and click **Test**.
