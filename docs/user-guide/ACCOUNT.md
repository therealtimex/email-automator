# Account Management

Manage your profile, persona, security, and Supabase connection in **Account Settings** (profile icon, top right).

## 👤 Profile
*   **Name**: Update your first and last name.
*   **Avatar**: Upload a custom profile picture.
*   **Sound & Haptic Feedback**: Toggle audio cues and haptics (if supported).

## 🧬 Persona
Define how the AI represents you:
*   Role, industry, and work style
*   Preferred tone and response length
*   VIP senders and trusted domains
*   Automation preferences (what to avoid)

## 🔐 Security
*   **Password**: Update your account password.
*   **Sessions**: Managed via Supabase Auth; log out to end the session.

## 🗄️ Supabase Connection (BYOK)
Manage the database connection used for auth, sync logs, and AI data:
*   **Connection Status**: Shows the current Supabase URL and schema version.
*   **Change Connection**: Launches the Setup Wizard to reconfigure.
*   **Clear Configuration**: Disconnects and logs you out (only available for UI-configured connections).

> Provider credentials (Gmail/Outlook) are managed in **Configuration → Email Accounts**.

---

## 💾 Where is my data?
*   **Email Metadata + AI Logs**: Stored in your Supabase project.
*   **Raw Email Files (.eml)**: Stored locally on your machine (see **Storage Path** in Configuration).
*   **Rule Attachments**: Stored in your Supabase Storage bucket.
*   **Credentials**: Encrypted and stored in your Supabase project.

**Email Automator never stores your data on its own servers.**

Next step: [**Troubleshooting**](./TROUBLESHOOTING.md)
