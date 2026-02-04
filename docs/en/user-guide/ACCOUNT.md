# Account & Privacy

Manage your profile, AI persona, and security settings within the **Account Settings** page (accessed via the profile icon in the top right corner).

---

## 👤 Profile & Experience
Personalize your interaction with the application:
*   **Identity**: Update your display name and upload a custom avatar.
*   **Sensory Feedback**: Toggle **Sound Effects** and **Haptic Feedback** for background activities (like new email analysis or sync completion).

---

## 🧬 Your AI Persona
The **Persona** is the most critical setting for high-quality **Smart Drafts**. It acts as the "Identity" the AI uses when ghostwriting replies.

*   **Role & Context**: Define your professional title and the industry you work in.
*   **Tone of Voice**: Specify how you want to sound (e.g., "Professional but friendly," "Concise and direct").
*   **Response Style**: Set preferences for response length and signature usage.
*   **Trusted Entities**: List VIP senders and trusted domains to help the AI prioritize correctly.

---

## 🗄️ Supabase Connection (BYOK)
As part of the **"Bring Your Own Key"** model, you can monitor and manage your connection to your dedicated database:
*   **Status**: View your current Supabase Project URL and Schema version.
*   **Migration Center**: Check if your database schema is up to date.
*   **Disconnect**: If you need to switch projects, you can clear your configuration here (this will log you out and reset the local app state).

---

## 🔐 Security
*   **Password Management**: Update your local account password at any time.
*   **Encryption**: All email provider credentials (Gmail/Outlook tokens) are encrypted before being stored in your Supabase project.

---

## 🛡️ Privacy & Data Sovereignty
Email Automator is designed with a **privacy-first** architecture. Your data is distributed as follows:

| Data Type | Location | Access |
| :--- | :--- | :--- |
| **Email Metadata & Logs** | Your Supabase Project | Private to You |
| **Raw Email Files (.eml)** | Your Local Machine | Offline Access Only |
| **Rule Attachments** | Your Supabase Storage | Private to You |
| **AI Processing** | RealTimeX Desktop | Local/API direct |

**Important**: Email Automator (the company) never has access to your emails, your credentials, or your AI logs. Everything stays within your own private infrastructure.

---

**Next Step:** [Troubleshooting & Support](./TROUBLESHOOTING.md)
