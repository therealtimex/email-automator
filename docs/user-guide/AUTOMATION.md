# Automation Rules

Automation rules allow your AI agent to work autonomously, processing emails based on the insights it discovers.

## 🛡️ Auto-Pilot Rules

In the **Configuration** tab, you can toggle global system rules:

*   **Auto-Trash Spam**: Automatically deletes anything categorized as `Spam`.
*   **Smart Drafts**: Automatically creates draft replies for emails requiring a response.

---

## 🛠️ Custom Rules

You can create powerful, multi-condition rules based on AI analysis.

### 1. Conditions
*   **AI Category**: e.g., "Category equals `Client`"
*   **Sentiment**: e.g., "Sentiment is `Negative`"
*   **Priority**: e.g., "Priority is `High`"
*   **Metadata**: Define rules based on specific senders, domains, or keywords.

### 2. Actions
*   **Archive/Delete/Star/Read**: Perform standard cleanup.
*   **Draft Reply**: Automatically draft a response.

### 3. Custom Instructions
When creating a **Draft Reply** rule, you can provide **Custom Context**.
> **Example**: "If sender is @support, draft a reply saying I'm away until next Monday but will look into it then."

### 4. Retention Policies (Age-based)
You can define rules that only trigger after an email reaches a certain age.
> **Example**: "Automatically Archive newsletters that are older than 7 days."

---

## 🏗️ How it works
1.  **Sync**: The agent fetches a new email.
2.  **Analysis**: AI determines category, priority, and sentiment.
3.  **Matching**: The agent checks the analyzed data against your rules.
4.  **Execution**: If a match is found, the action is performed instantly at the provider (Gmail/Outlook).

Next step: [**Account Management**](./ACCOUNT.md)
