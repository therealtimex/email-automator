# Automation Rules

Automation rules let the agent act on your inbox automatically using AI analysis and metadata.

## 🛡️ System Rules

These are built-in toggles available in **Configuration → Automation** (and visible in **Auto-Pilot**):
*   **Auto-Trash Spam**: Deletes messages classified as spam.
*   **Smart Drafts**: Enables automatic draft generation when a rule requests drafting.

---

## 🛠️ Custom Rules

Create rules with conditions + actions:

### 1. Conditions
*   **AI Analysis**: Category, Sentiment, Priority
*   **Metadata**: Sender Email, Sender Domain, Sender Contains, Subject Contains, Body Contains
*   **Age Filter**: “Older than X days”

### 2. Actions
*   **Archive**
*   **Delete**
*   **Star**
*   **Draft**

If you choose **Draft**, you can:
*   Provide **draft instructions** (tone, intent, or context).
*   Attach files to include in the reply.

---

## 🚀 Auto-Pilot Tab

The **Auto-Pilot** tab groups rules by category and highlights **system-managed** rules.
Use it to quickly enable/disable rules or edit custom ones.

---

## 🏗️ How it works
1.  **Sync**: The agent fetches new emails.
2.  **Analysis**: AI assigns category, priority, and sentiment.
3.  **Matching**: Rule conditions are evaluated.
4.  **Execution**: Matching actions are performed immediately in Gmail/Outlook.

Next step: [**Account Management**](./ACCOUNT.md)
