# Dashboard & Live Activity

The **Dashboard** is your primary interface for monitoring your AI agent’s activity and managing your analyzed inbox. It is designed to provide complete transparency into how the AI thinks and acts.

---

## 📊 The Analysis Feed

As the AI processes your inbox, emails appear in the feed with real-time status updates and intelligent insights.

*   **Smart Search**: Quickly find emails by keyword or sender.
*   **AI Filters**: Filter your view by Category (e.g., Newsletter, Personal), Sentiment, or Priority.
*   **Dynamic Sorting**: Toggle between the time an email was *received* and the time it was *processed* by the AI.

### 📌 Email Detail Sidebar
Clicking any email card opens a detailed side panel containing:
*   **AI Summary**: A concise overview of the email's content.
*   **Key Points**: Bulleted highlights extracted by the AI.
*   **Draft Preview**: If a draft reply was generated, you can review it here before it's sent.
*   **Quick Links**: Jump directly to the original email in your Gmail or Outlook web interface.

---

## 🛡️ Trust & Transparency

Email Automator is built on the principle of **"Glass Box AI."** You should always know *why* an action was taken.

### 📟 Live Activity Terminal
Click the **Live Activity** button in the bottom-right corner to open the real-time processing feed.
*   **Thinking Logs**: Watch the AI analyze content, evaluate rules, and decide on actions.
*   **Technical Details**: See raw API calls, processing durations, and background sync statuses.
*   **Control**: You can manually stop an active sync directly from the terminal.

### 🕵️ AI Trace
Click the **Eye icon** on any email card to open the **AI Trace Modal**.
*   **Decision Logic**: View a step-by-step breakdown of why the AI assigned a specific category or priority.
*   **Raw Data**: See the exact prompt sent to the LLM and the raw JSON response it returned.
*   **Performance Stats**: Review token usage and processing time for that specific email.

---

## ⚡ Quick Actions

Take control with one-click actions available on every email card:
*   🗑️ **Delete / 📦 Archive**: Instant cleanup.
*   ⭐ **Star / Flag**: Mark important items for later.
*   🔄 **Reprocess**: If you’ve updated your rules, you can ask the AI to analyze an email again.
*   💬 **Feedback**: Help the AI learn by reporting incorrect categorizations or sentiment analysis.

---

## 🔔 Notifications & Feedback

The app uses multi-sensory feedback to keep you informed of background activity:
*   **Visual**: Live status badges and toast notifications.
*   **Audio**: Subtle, high-quality chimes for new emails, high-priority alerts, and sync completion.
*   **Haptic**: Physical feedback on supported devices.

> **Note**: Sound and Haptic settings can be customized in [**Account Settings**](./ACCOUNT.md).

---

## 📈 Analytics & History

Stay informed about your agent's performance:
*   **Sync History**: View a log of recent sync runs, including the number of emails processed and any actions taken.
*   **Efficiency Stats**: See totals for automated deletions, archives, and drafts over time.

---

**Next Step:** [Creating Automation Rules](./AUTOMATION.md)
