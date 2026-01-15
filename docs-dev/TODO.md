# Developer To-Do List

This document tracks the remaining tasks for the development team to fully operationalize the Email Automator.

## 1. Configuration Tab Wiring
The `Configuration.tsx` component is currently a UI shell. It needs to be connected to real data.
- [ ] **Connected Accounts**:
    - [ ] Fetch connected accounts from `supabase.from('email_accounts')`.
    - [ ] Implement "Disconnect" button logic (delete row).
    - [ ] wire up "Connect New Account" button to trigger OAuth flow (backend endpoint already exists).
- [ ] **Auto-Pilot Rules**:
    - [ ] Persist rule toggles (Auto-Trash, Smart Drafts) to `local_storage` or user settings table.
    - [ ] Update `EmailProcessor` to respect these flags.
- [ ] **LLM Configuration**:
    - [ ] Save Model/Base URL to `local_storage` (overriding env vars if set).
    - [ ] Ensure backend reads these overrides (pass in request headers or sync to DB).

## 2. Testing
- [ ] **End-to-End Migration**: Verify `SetupWizard` handles a fresh Supabase project correctly in Production build.
- [ ] **Theme Persistence**: Ensure Dark Mode preference persists across reloads.
- [ ] **Mobile Responsiveness**: Verify Dashboard grid layout on mobile screens (`md:grid-cols-3` vs `grid-cols-1`).

## 3. Future Enhancements
- [ ] **Outlook Integration**: Complete the MSAL-node implementation in `src/core/auth.ts`.
- [ ] **Detailed Analytics**: Add a chart to the Dashboard showing email volume over time.
