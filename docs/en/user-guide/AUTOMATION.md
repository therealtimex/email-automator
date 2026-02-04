# Automation & Auto-Pilot

The **Auto-Pilot** tab is the central hub for managing your AI agent's behavior. It consolidates "System Rules" (global toggles) and a library of **26 built-in intelligent rules** alongside your own "Custom Rules."

---

## 🛡️ Built-in System Rules

Email Automator comes with 26 pre-configured rules designed by AI experts to handle common inbox challenges. These are organized into functional categories to help you stay organized.

### 📧 Email Organization
*   **Newsletter Sweeper**: Auto-archives newsletters and marketing emails to keep your inbox clean.
*   **Receipt Organizer**: Automatically files receipts and order confirmations.
*   **CC Organizer**: Labels emails where you are CC'd for quick triage.
*   **Cold Outreach Filter**: Moves cold sales emails to a separate folder.
*   **Social Noise**: Minimizes LinkedIn and social network notifications.
*   **Stack Overflow Digests**: Auto-archives technical digests unless they require immediate attention.

### 🚨 Priority & Alerts
*   **VIP Urgent Messages**: Stars urgent messages from key stakeholders (CEOs, Board members).
*   **Critical Alerts**: Surfaces production incidents and P0/P1 critical alerts.
*   **Urgent Support Tickets**: Highlights high-priority customer issues needing immediate action.

### 💻 Development
*   **GitHub Mentions**: Tracks when you are specifically mentioned in Pull Requests or Issues.
*   **CI/CD Failures**: Highlights build and deployment failures from tools like CircleCI or GitHub Actions.
*   **Code Review Requests**: Organizes incoming requests for code reviews.
*   **Dependabot Noise**: Auto-archives low-priority dependency updates while keeping security alerts visible.
*   **Monitoring Alerts**: Organizes non-urgent monitoring and logging alerts.

### 💼 Sales & Business
*   **Hot Leads**: Prioritizes high-intent prospect replies based on positive sentiment.
*   **Follow-up Reminders**: Tracks prospect responses that specifically request a follow-up.
*   **Referrals & Intros**: Ensures you never miss a warm introduction or referral.
*   **Contracts & Proposals**: Highlights important contract communications and legal documents.
*   **Objections & Concerns**: Flags emails expressing concerns or hesitation for careful handling.
*   **Nurture Campaigns**: Archives automated drip campaign emails to prioritize personal replies.
*   **Financial Updates**: Keeps revenue reports and quarterly budget updates easily accessible.

### ⚙️ Operations
*   **Internal Requests**: Organizes cross-team requests and action items.
*   **Vendor Communications**: Tracks invoices, shipments, and vendor-related updates.
*   **System Alerts**: Organizes infrastructure and system notifications.
*   **Meeting Invites**: Separates calendar invites for easier scheduling management.
*   **Weekly Reports**: Auto-files regular status reports and progress updates.

---

## 🛠️ Building Custom Rules

Custom rules allow you to create precise, AI-driven workflows. You can create, edit, and manage these directly within the **Auto-Pilot** tab.

### 1. Conditions (The "If")
You can mix and match metadata and AI-powered conditions:
*   **AI Insights**: Category (e.g., Newsletter, Receipt, Personal), Sentiment (Positive, Negative, Neutral), or Priority (High, Medium, Low).
*   **Metadata**: Sender domain (e.g., `github.com`), specific keywords in the subject, or sender's name.
*   **Retention Filter**: "Only act if the email is older than X days." This is perfect for cleaning up old newsletters or notifications.

### 2. Actions (The "Then")
Choose what happens when an email matches your conditions:
*   **Archive / Delete**: Keep your inbox clean automatically.
*   **Star / Flag**: Highlight important items for manual review.
*   **Draft**: The most powerful action. It tells the AI to prepare a reply.

---

## ✍️ Smart Context & Ghostwriting

When you use the **Draft** action, you can provide the AI with specific instructions to ensure the reply matches your needs:

*   **Ghostwriting Instructions**: Tell the AI *how* to reply (e.g., "Be polite but firm in declining the invitation," or "Ask for their availability next Tuesday").
*   **Rule Attachments**: You can upload standard documents (like a pricing sheet or a bio) that the AI will automatically include as attachments whenever this rule triggers a draft.

---

## 🚀 The Auto-Pilot Tab

The **Auto-Pilot** tab provides a bird's-eye view of your automation engine.
*   **Grouped View**: Rules are organized by their primary intent.
*   **Quick Toggles**: Enable or disable rules instantly without deleting them.
*   **Status Indicators**: See which rules are currently active and how many emails they've processed.

---

## 💡 Best Practices

*   **Start Passive**: Set your first rules to **Star** or **Archive** instead of **Delete** until you are confident in the AI's categorization.
*   **Use Retention for Noise**: Use a rule like: `If Category = Newsletter AND Age > 30 Days THEN Delete`. This keeps your "read" newsletters from cluttering your archive forever.
*   **Refine with Feedback**: If a rule isn't matching correctly, use the **Feedback** icon on the Dashboard to improve the AI's understanding of that specific email type.

---

**Next Step:** [Account & Security Management](./ACCOUNT.md)
