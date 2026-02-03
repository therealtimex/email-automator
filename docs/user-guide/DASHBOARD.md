# Dashboard & Live Activity

The Dashboard is your command center for monitoring the AI agent and acting on analyzed emails.

## 📊 Recent Analysis

As the agent processes your inbox, emails appear in the feed with live status badges.

*   **Search + Filters**: Search by keyword and filter by category.
*   **Sorting**: Toggle between *received time* and *processed time*.
*   **Pagination**: Navigate large inboxes in batches.

## 📌 Email Details Sidebar

Click any email card to open its detail panel:
*   **AI Summary + Key Points**
*   **Draft Preview** (if generated)
*   **Sender + Subject** at a glance

## 🕵️ AI Trace & Transparency

### Live Activity Terminal
Click the floating **Live Activity** button (bottom right).
*   **Real-time Feed**: Watch analysis + actions stream in.
*   **Status Indicators**: See when sync is live vs idle.
*   **Stop Sync**: Cancel an in-progress sync from the terminal.

### AI Trace Modal
Click the **Eye icon** on an email card.
*   **Decision Timeline**: Why the email was categorized the way it was.
*   **Prompts + Raw Output**: View the model’s raw response and usage stats.
*   **Retry**: Re-run processing when a failure occurs.

### Feedback
Use the **speech bubble** icon to report mistakes or improve analysis quality.

## 🔊 Sound & Haptic Feedback

The app provides subtle feedback for background activity:
*   **Soft Chime** for new analysis
*   **Success Tone** after sync completes
*   **Alert Tone** for high-priority detections

> You can toggle sound (and haptics on supported devices) in **Account Settings → Profile**.

## ⚡ Manual Actions

Each email card includes quick actions:
*   🗑️ **Delete**
*   📦 **Archive**
*   🚩 **Flag/Star**
*   🔗 **Open in Gmail/Outlook**
*   🕵️ **AI Trace** and **Feedback** shortcuts

---

## ⏱️ Sync Scope (Per Account)

Use the **Sync Scope** card in the sidebar:
*   **Sync From**: Start date/time for processing
*   **Max Emails**: Batch size per sync run (default 50)
*   **Reset Checkpoint**: Force a full re-scan from the start date

## 🧾 Sync History & Stats

*   **Recent Syncs** show processed + actioned counts and runtime.
*   **Quick Stats** show totals, connected accounts, and enabled rules.

---

## 🤖 Smart Drafts

When a rule requests drafting, the AI generates a reply:
*   Preview drafts in the **Email Details** sidebar.
*   Drafts are saved to your provider’s **Drafts** folder.

Next step: [**Automation Rules**](./AUTOMATION.md)
