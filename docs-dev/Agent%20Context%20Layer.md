# Specification Report: Intelligent Agent Context Layer

**Version:** 2.0 (Revised)
**Date:** February 2026
**Reference:** Based on `realtimex-alchemy` architecture
**Subject:** Integration of RealtimeX SDK for Context-Aware Voice & Agentic Workflows

---

## 1. Executive Summary

Email-Automator is evolving into an active "Executive Assistant." We will leverage the **RealtimeX SDK** (LLM + TTS, with future STT) to enable hands-free interaction.

**Critical Architectural Decision:**
We will adopt the **Backend Proxy Pattern** validated in `realtimex-alchemy`. The Frontend will **not** maintain a direct WebSocket coupling with the RealtimeX Desktop App. Instead, the Node.js Backend (`api/`) will act as the authorized gateway, exposing clean REST/SSE endpoints to the React Frontend.

**The Delta:**
While `realtimex-alchemy` implements global RAG-based chat (`ChatService`), `email-automator` requires **Page-Specific Context Injection**. We will build an "Agent Layer" on top of the base SDK pipes to allow the AI to "see" the current route's state (e.g., draft contents, rule configuration).

---

## 2. Infrastructure Layer (The Foundation)

We will port and adapt the proven implementations from `realtimex-alchemy`:

### 2.1 TTS (Text-to-Speech)
*   **Backend:** `/api/tts/stream` (SSE Endpoint) routing to `SDKService`.
*   **Frontend:** `TTSContext` & `useTTS` hook. Handles audio buffering, queuing, and playback.
*   **Status:** **Ready to Port** from `realtimex-alchemy`.

### 2.2 LLM (Chat & Intelligence)
*   **Backend:** `SDKService` centralizes provider resolution (e.g., OpenAI vs. Local LLM).
*   **Frontend:** Standardized API calls.
*   **Status:** **Ready to Port** basic service structure.

### 2.3 STT (Speech-to-Text)
*   **Status:** **Pending SDK Support**.
*   **Interim Strategy:** Use Browser Native `window.webkitSpeechRecognition` (Chrome/Edge) or `MediaRecorder` + Whisper API (via backend proxy) as a fallback until RealtimeX SDK native STT is released.

---

## 3. Application Layer: The Agent Context

This is the new logic specific to `email-automator`.

### 3.1 The "Context Injection" Problem
The user navigates between pages (Dashboard -> Drafts -> Rules). The *Global* Chatbot needs to know *Local* context.
*   *Wrong Way:* Hardcode "If on /drafts, read drafts from DB".
*   *Right Way:* The Frontend View "pushes" its state to the Agent Session.

### 3.2 Solution: `AgentContext` & `usePageAgent`

We will implement a React Context that holds the **Current Agent Persona**.

#### The Hook: `usePageAgent`
A hook used by page components to register their identity and tools.

```typescript
// Example Implementation
usePageAgent({
    page_id: 'draft_review',
    system_instruction: "You are the Draft Review Assistant. Summarize emails briefly.",
    context_data: {
        draft_count: 5,
        urgent_drafts: [...] 
    },
    tools: [
        {
            name: 'approve_draft',
            description: 'Approves and sends the draft',
            parameters: { id: 'string' }
        }
    ]
});
```

#### The State Flow
1.  **Mount:** Page mounts -> Calls `usePageAgent`.
2.  **Register:** `AgentProvider` updates its internal state: `currentContext`.
3.  **Interaction:** User asks "Read them to me".
4.  **Execution:** `AgentProvider` sends text to `/api/agent/chat`.
5.  **Injection:** The API Payload includes the `system_instruction` and `context_data` attached by the hook.
6.  **Response:** Backend constructs the prompt, calls SDK, and returns text/audio.

---

## 4. Feature Specifications

### Feature A: Voice-Directed Draft Review
*   **Page:** `/drafts`
*   **Agent Persona:** "Draft Manager"
*   **Context:** List of unapproved drafts (Subject, Summary, To).
*   **Tools:** `sendDraft(id)`, `deleteDraft(id)`.
*   **Scenario:**
    *   *AI:* "You have 3 drafts. First is to John about the invoice."
    *   *User:* "Send it."
    *   *AI:* Calls `sendDraft`. "Sent. Next is..."

### Feature B: The "Help Wizard"
*   **Page:** Global (Any)
*   **Agent Persona:** "Instructor"
*   **Context:** `pageDescription` (e.g., "This is the Rule Editor").
*   **Scenario:**
    *   *User (on Rules page):* "How does this work?"
    *   *AI:* "This screen allows you to automate email sorting. You can drag conditions from the left..."

### Feature C: Multilingual Tooltips
*   **Page:** `/rules`
*   **Component:** `AITranslationTooltip`
*   **Mechanism:**
    *   Frontend component sends text + target locale to `/api/agent/translate`.
    *   Backend uses SDK LLM to translate.
    *   Frontend plays audio via `useTTS`.

---

## 5. Technical Specification

### 5.1 Frontend Architecture

```
App
├── AgentProvider (New)
│   ├── TTSProvider (Ported from Alchemy)
│   └── AgentState (Idle/Listening/Thinking/Speaking)
├── Layout
│   ├── AgentOverlay (Floating UI)
│   └── PageContent
│       └── usePageAgent() (Hooks into AgentProvider)
```

### 5.2 API Extensions (Backend)

We will extend `api/src/routes/sdk.ts` (or create `agent.ts`):

*   `POST /api/agent/chat`:
    *   Input: `{ message, context: { intent, data, tools } }`
    *   Logic: Constructs dynamic system prompt based on context. 
    *   *Note:* Real "Tool Calling" via SDK might be limited by model support (e.g. Local LLM). We may need to implement "Soft Tool Calling" (parsing JSON output from LLM).

*   `POST /api/agent/translate`:
    *   Input: `{ text, target_lang }`
    *   Output: `{ translation, audio_base64? }`

---

## 6. Implementation Roadmap

### Phase 1: Infrastructure (Days 1-2)
*   Port `TTSContext`, `useTTS`, and `SDKService` upgrades from `realtimex-alchemy`.
*   Ensure `/api/tts/stream` works.

### Phase 2: Agent Layer (Days 3-5)
*   Create `AgentProvider` and `usePageAgent` hook.
*   Build `AgentOverlay` UI (Microphone/Speaker visual).
*   Implement `POST /api/agent/chat` in backend.

### Phase 3: Integration (Days 6-8)
*   Integrate `usePageAgent` into **Drafts** page.
*   Implement "Soft Tool Calling" for `approve_draft`.
*   Integrate `usePageAgent` into **Rules** page (ReadOnly help).

---

## 7. Security & Risk

*   **Context Payload Size:** User data (drafts) can be large.
    *   *Mitigation:* `usePageAgent` must auto-summarize or truncate data before sending to context. Only send IDs and metadata, not full bodies unless requested.
*   **Tool Execution:**
    *   *Mitigation:* AI cannot *execute* database writes directly. It returns a "Tool Call Request". The Frontend receives this and triggers the actual API call (client-side execution) or calls a secured backend action, requiring user confirmation for destructive acts.
