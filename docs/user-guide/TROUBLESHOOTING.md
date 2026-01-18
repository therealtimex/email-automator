# Troubleshooting

Common issues and how to resolve them.

## 📡 Sync Issues

**"Sync Failed" or "Backend not connected"**
*   Ensure the local API server is running. (If using source code: `npm run dev:api`).
*   Check the terminal window for error logs (e.g. LLM API Key missing).

**Emails are not appearing**
*   Check your **Sync Scope** start date. Emails older than this date are ignored.
*   Check the **Max Emails** setting. It may take several sync runs to catch up if you have a massive inbox.

---

## 🔑 Authentication Issues

**OAuth Error 400: redirect_uri_mismatch**
*   Go to your Google Cloud Console and ensure the Redirect URI exactly matches the one provided in the app configuration (it should end in `/functions/v1/auth-gmail/callback`).

**"Invalid API Key" on Setup**
*   Ensure you are using the **Anon/Public** key from your Supabase Dashboard, not the Service Role key.

---

## 🗄️ Database Issues

**"Database Migration Required" Banner**
*   This appears when your app version is newer than your database schema.
*   Click **Update Now** in the banner to run the automated migration tool.

**Missing Columns Error**
*   If the agent terminal logs show errors like `column "account_id" does not exist`, you need to run migrations. Run `npx email-automator migrate` or use the in-app Migration Modal.

---

## 🤖 AI Issues

**AI is taking too long**
*   If using a local model (Ollama/LM Studio), ensure your computer has enough RAM and a supported GPU.
*   If using OpenAI, check your API quota and usage limits.

**Drafts are not threaded**
*   Ensure the agent has `https://www.googleapis.com/auth/gmail.modify` scope permitted during the connection flow.
