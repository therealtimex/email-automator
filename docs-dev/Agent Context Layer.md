# Specification Report: Intelligent Agent Integration for Email-Automator

**Version:** 1.0
**Date:** January 2025
**Status:** Draft / Proposal
**Subject:** Integration of RealtimeX SDK for Context-Aware Voice & Agentic Workflows

---

## 1. Executive Summary

Email-Automator is evolving from a background automation tool into an active "Executive Assistant." By integrating the **RealtimeX SDK** (LLM + TTS/STT), we aim to reduce user cognitive load and time-to-action.

The core of this specification is a reusable **"Agent Context Layer"** architecture. This allows the AI to "see" what the user sees on any given page and "act" on behalf of the user (e.g., approving drafts, explaining rules) via voice or text commands.

**Primary Objectives:**
1.  **Accelerate Workflows:** Enable hands-free review and approval of AI-generated email drafts.
2.  **Contextual Assistance:** Provide page-specific help without hard-coding tutorial content.
3.  **Universal Accessibility:** Offer real-time translation and explanation of complex rules/logs via Text-to-Speech (TTS).

Since the RealtimeX SDK is already integrated and the RealtimeProvider is active, the focus of this specification shifts from infrastructure setup to application-layer logic.

We will implement a Context Injection Architecture. This allows us to "hot-swap" the LLM's personality, knowledge, and capabilities as the user navigates between pages (e.g., changing from a "Draft Reviewer" to a "Rule Configuration Guide" instantly).


---

## 2. Architectural Concept: The Agent Context Layer

To ensure scalability and reusability, we will not build hard-coded chatbots for specific pages. Instead, we will implement a **Context Injection Pattern**.

### 2.1 The Philosophy
The AI is treated as a generic "actor." When a user navigates to a specific route (e.g., `/dashboard` or `/rules`), the page component "hands" the actor a script containing:
1.  **Identity:** Who the AI is right now.
2.  **Context:** The data visible on the screen.
3.  **Tools:** The executable functions available on this page.

### 2.2 Core Components

1.  **`RealtimeProvider` (Global Brain):** Maintains the WebSocket connection to RealtimeX and holds the current "Session Context." `RealtimeProvider` is already implemented via RealTimeX SDK.
2.  **`usePageAgent` (Reusable Hook - The Bridge):** A React hook used by individual pages to register their context and tools with the Provider. It synchronizes the UI State (React State) with the LLM Context (System Prompt/Knowledge). It registers "Tools" (JavaScript functions) that the LLM can invoke.
3.  **`AgentOverlay` (UI Component):** The visual interface (Floating Button / Modal) that captures user input (Voice/Text) and displays AI status. It's a persistent visual indicator (Orb/Waveform) showing the agent's status (Listening, Processing, Speaking).

---

## 3. Feature Specifications

### Feature A: Voice-Driven Draft Review (High Priority)
*Target Page: `/drafts`*

**User Story:**
As a busy professional, I want to listen to summaries of my pending email drafts and approve them via voice while commuting, so I can clear my inbox without looking at a screen.

**Functional Flow:**
1.  **Summarization:** The Agent reads a concise summary of pending drafts (e.g., *"You have 3 drafts. First, a reply to John regarding Q3 Report..."*).
2.  **Interaction:** User says *"Send the first one. For the second one, add that I'm out of office until Monday, then send."*
3.  **Execution:** The Agent calls the `editDraft` and `sendDraft` tools.

### Feature B: Context-Aware Help "The Wizard"
*Target Page: Global (Any Page)*

**User Story:**
As a new user, I want to ask "What do I do here?" on any screen and get an answer relevant to the current page state, so I don't have to read documentation.

**Functional Flow:**
1.  User clicks the Agent button or speaks.
2.  Agent analyzes the `pageDescription` provided by `usePageAgent`.
3.  Agent responds via TTS: *"This is the Rule Configuration page. You currently have a rule open that auto-archives invoices. Do you want to test it?"*

### Feature C: Multilingual Rule Explainer
*Target Page: `/rules`*

**User Story:**
As a manager in a global team, I want to hover over a rule written in a foreign language and have it explained to me in my native language via audio.

**Functional Flow:**
1.  User activates "Explain Mode" or asks via voice *"What does this rule do?"*
2.  Agent reads the rule configuration (JSON/Text).
3.  Agent translates the logic into natural language and speaks it via TTS.

---

## 4. Technical Specification

### 4.1 Data Structures (TypeScript Interfaces)

**1. The Agent Action (Tool)**
Defines what the AI can *do*.
```typescript
interface AgentAction {
  name: string;          // Unique ID for the LLM (e.g., "approve_draft")
  description: string;   // Natural language description for the LLM
  parameters?: object;   // JSON Schema for arguments
  callback: (args: any) => Promise<any>; // The function to execute
}
```

**2. The Agent Context (State)**
Defines what the AI *knows*.
```typescript
interface AgentContext {
  pageName: string;
  pageDescription: string; // System prompt instruction
  data: any;               // Dynamic page state (Drafts[], Rules[], etc.)
  tools: AgentAction[];    // List of available actions
}
```

### 4.2 The Reusable Hook: `usePageAgent`

This hook abstracts the complexity of RealtimeX. Developers simply drop this into any page component.

```typescript
// Pseudocode for implementation
export const usePageAgent = (config: AgentContext) => {
  const { setSessionConfig } = useRealtimeContext();

  useEffect(() => {
    // On Mount: Update LLM System Prompt & Tools
    setSessionConfig({
      instructions: `You are assisting on ${config.pageName}. ${config.pageDescription}`,
      knowledgeBase: config.data,
      tools: config.tools
    });

    // On Unmount: Cleanup/Reset
    return () => setSessionConfig({ mode: 'idle' });
  }, [config.data]); // Re-syncs if data changes (e.g., draft sent)
};
```

### 4.3 Integration Example: Drafts Page

```typescript
// pages/DraftsPage.tsx
const DraftsPage = () => {
  const { drafts, handleSend, handleDiscard } = useDrafts();

  // The ONE step required to AI-enable this page:
  usePageAgent({
    pageName: "Draft Review Center",
    pageDescription: "Help the user triage pending email drafts. Summarize them briefly.",
    data: drafts, // Pass the array of draft objects
    tools: [
      {
        name: "send_draft",
        description: "Sends the email draft with the given ID",
        callback: async ({ id }) => handleSend(id)
      },
      {
        name: "discard_draft",
        description: "Deletes the draft permanently",
        callback: async ({ id }) => handleDiscard(id)
      }
    ]
  });

  return <div>...UI Components...</div>;
}
```

---

## 5. UI/UX Design Requirements

### 5.1 The "Agent Overlay" Component
A persistent UI element (Z-Index: Max) present on all pages.

*   **State: Idle**
    *   Small floating pill or circle in bottom-right.
    *   Icon: Sparkles or Microphone.
*   **State: Listening**
    *   Expands to show a sound-wave visualization (RealtimeX audio buffer).
    *   Action: "Tap to Stop".
*   **State: Thinking/Speaking**
    *   Visual pulse animation.
    *   Transcript subtitle (optional) appearing above the widget.

### 5.2 Optimistic UI Updates
When the Agent performs an action (e.g., sending a draft), the UI must update **immediately**, even before the voice confirmation finishes.
*   *Voice:* "Sending that now..."
*   *UI:* Draft card fades out / moves to "Sent" column instantly.

---

## 6. Implementation Roadmap

### Phase 1: The Bridge (Days 1-3)
*   **Objective:** Enable the "Hot-Swap" capability in your existing Provider.
*   **Tasks:**
    1.  Add `activeTools` state to `RealtimeProvider`.
    2.  Implement the `function_call` listener in the Provider that routes to `activeTools`.
    3.  Create the `usePageAgent` hook.

### Phase 2: Drafts Integration (Days 4-7)
*   **Objective:** Ship the "Draft Review Center" with Voice.
*   **Tasks:**
    1.  Create/Update the Drafts UI.
    2.  Define the schema for `send_draft`, `edit_draft`.
    3.  Plug in `usePageAgent`.
    4.  **Test:** Verify that when a draft is sent via voice, the AI knows it's gone from the list immediately.

### Phase 3: Global Help (Days 8-10)
*   **Objective:** Contextual help on all pages.
*   **Tasks:**
    1.  Add `usePageAgent` to Dashboard, Settings, and Rules pages with simple text descriptions (`data` not strictly required, just `instructions`).
    2.  Implement the UI Overlay (Orb/Microphone) if not already present.

---

## 7. Security & Risk Analysis

1.  **PII/Data Privacy:**
    *   *Risk:* Sending email content to LLM.
    *   *Mitigation:* Ensure Enterprise Agreement with RealtimeX provider regarding data retention. Only send necessary fields (Subject, Summary) to context, load full body only on demand.

2.  **Accidental Actions:**
    *   *Risk:* User says "Delete everything" and AI wipes the database.
    *   *Mitigation:* **Destructive Actions** (Delete, Mass Send) must require a secondary confirmation step ("Are you sure you want to delete 5 drafts?") or be restricted from Voice control initially.

3.  **Context Token Limits:**
    *   *Risk:* Too many drafts overflow the context window.
    *   *Mitigation:* If `data` > 10 items, truncate the list passed to the Agent and implement pagination logic in the prompt.