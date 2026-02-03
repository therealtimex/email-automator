# Dashboard & Live Activity

The Dashboard is your command center for monitoring the AI agent's work and managing your analyzed emails.

## 📊 Recent Analysis

As the agent processes your inbox, emails appear live in this list. 

*   **Real-time Refresh**: New emails pop up at the top automatically as they are analyzed.
*   **Categories**: The AI automatically assigns categories like `Client`, `Internal`, or `Support`.
*   **Summaries**: Instead of reading long threads, you can see a one-sentence AI summary and key points.

## 🕵️ AI Trace & Transparency

One of the core philosophies of Email Automator is radical transparency.

### Live Agent Terminal ("Matrix Mode")
Click the floating **Live Activity** button (bottom right) to open the terminal.
*   **Real-time Feed**: Watch the agent "think" and "act" in real-time.
*   **Granular Logs**: See every API call, LLM prompt, and database transaction.
*   **Error Expansion**: Click on any error to see the full stack trace.

### AI Trace Modal
Click the **Eye Icon** on any email card to view its specific processing history.
*   **Decision Timeline**: See exactly *why* an email was categorized a certain way.
*   **Raw Data**: View the raw JSON output from the Intelligence Engine.

## 🔊 Sound & Haptic Feedback

The dashboard provides subtle feedback to keep you aware of background activity without being intrusive:
*   **Soft Chime**: Played when a new email is analyzed.
*   **Success Tone**: Played when a sync cycle completes.
*   **Alert**: Played when a High-Priority email is detected.
*   *Note: You can toggle these sounds in the Account Settings.*

## ⚡ Manual Actions

You can quickly process your analyzed emails using the toolbar on each card:

*   🗑️ **Delete**: Trashes the email in your Gmail/Outlook account.
*   📦 **Archive**: Moves the email out of your Inbox.
*   🚩 **Flag/Star**: Highlights the email for later.
*   📖 **Mark as Read**: Clears the unread status.
*   🔗 **External Link**: Opens the specific email thread directly in Gmail or Outlook.

---

## 🤖 Smart Drafts

If an email requires a response, the AI will generate a **Smart Draft**. 
*   You can preview this draft in the "Email Details" sidebar.
*   The draft is automatically saved in your **Drafts** folder at your email provider—simply open the thread and hit Send!

Next step: [**Automation Rules**](./AUTOMATION.md)
