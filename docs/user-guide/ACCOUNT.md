# Account Management

Manage your profile, security, and the core database connection through the **Account Settings** page (accessed via the profile icon in the top right).

## 👤 Profile
*   **Name**: Update your first and last name as displayed in the application.
*   **Avatar**: Upload a custom profile picture.
*   **Sound & Haptics**: Toggle synthesized audio chimes and tactile feedback for AI activities.

## 🔐 Security
*   **Password**: Update your local application password.
*   **Persistence**: Your login is managed via Supabase Auth and will remain active across sessions unless you manually log out.

## 🗄️ Supabase Connection (BYOK)
As part of the **Bring Your Own Key** model, you can manage the underlying database connection at any time. This connects the local application running on your machine to your private cloud database (for Auth, Storage, and Sync Logs).

*   **Change Connection**: If you migrate your project or need to update keys, use the "Change Connection" button to restart the Setup Wizard.
*   **Clear Configuration**: Disconnect the application from your current Supabase project. This will log you out and remove all local keys.

## 🔌 Integrations (Provider Credentials)
Manage your connected email providers (Gmail, Outlook) in the **Integrations** list.
*   **Transparency**: View exactly which credentials (Client ID, Secret) are stored.
*   **Security**: All provider secrets are encrypted at rest in the `integrations` table.
*   **Management**: Delete or update credentials directly from this table.

---

## 💾 Where is my data?
*   **Email Metadata**: Stored in your personal Supabase project.
*   **AI Logs**: Stored in your personal Supabase project.
*   **Attachments**: Stored in your personal Supabase storage buckets.
*   **Credentials**: Encrypted and stored in your personal Supabase project.

**Email Automator never stores your data on its own servers.**

Next step: [**Troubleshooting**](./TROUBLESHOOTING.md)
