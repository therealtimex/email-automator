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
*   **Metadata Signals**: Define rules based on sender, domain, or even specific headers like `List-Unsubscribe`.

### 2. Actions
*   **Archive/Delete/Star/Read**: Perform standard cleanup.
*   **Draft Reply**: Automatically draft a personalized response.
    *   **Contextual Control**: Specify the *Tone* (Professional, Casual) and *Additional Context* (e.g., "Tell them I'm OOO until Tuesday").
    *   **Attachments**: Automatically attach files (e.g., resumes, pricing PDF) to the draft.

### 3. Retention Policies (Time-Based)
Define rules that only execute after an email has aged.
*   **Use Case**: "Trash 'Newsletters' that are older than 30 days."
*   **Execution**: These rules run during the "Retention Phase" of every sync cycle.

---

## 🏗️ How it works
1.  **Sync**: The agent fetches a new email.
2.  **Analysis**: AI determines category, priority, and sentiment.
3.  **Matching**: The agent checks the analyzed data against your rules.
4.  **Execution**: If a match is found, the action is performed instantly at the provider (Gmail/Outlook).

Next step: [**Account Management**](./ACCOUNT.md)
