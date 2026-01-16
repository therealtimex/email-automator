# Developer To-Do List

This document tracks the remaining tasks for the development team to fully operationalize the Email Automator.

## 1. Testing & QA
- [ ] **End-to-End Migration**: Verify `SetupWizard` handles a fresh Supabase project correctly in Production build.
- [ ] **Theme Persistence**: Ensure Dark Mode preference persists across reloads.
- [ ] **Mobile Responsiveness**: Verify Dashboard grid layout on mobile screens (`md:grid-cols-3` vs `grid-cols-1`).
- [ ] **Outlook Flow Verification**: Manually verify the Microsoft Device Code flow end-to-end.

## 2. Future Enhancements
- [ ] **Detailed Analytics**: Add a chart to the Dashboard showing email volume over time.
- [ ] **Email Viewer**: Add a read-only view for the full content of archived/processed emails.
- [ ] **Undo Actions**: Implement a short-lived "undo" toast for destructive actions (trash).

## Completed
- [x] **Configuration Wiring**: Connected accounts (Gmail/Outlook), Rules, and LLM Settings are fully persisted and functional.
- [x] **Outlook Integration**: Implemented Microsoft Device Code flow for Outlook connectivity.
- [x] **Auto-Pilot Logic**: `EmailProcessor` respects `auto_trash_spam` and `smart_drafts` flags.
- [x] **LLM Overrides**: Backend respects per-user LLM model/base URL configurations.