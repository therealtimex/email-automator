# Developer To-Do List

This document tracks the remaining tasks for the development team to fully operationalize the Email Automator.

## 1. Testing & QA
- [ ] **Retention Rules**: Verify that time-based rules (e.g. "Trash after 7 days") work correctly across multiple sync runs.
- [ ] **Attachment Logic**: Verify that attachments added via rules are correctly uploaded and attached to Gmail/Outlook drafts.

## 2. Future Enhancements
- [ ] **Detailed Analytics**: Add a chart to the Dashboard showing email volume over time.
- [ ] **Email Viewer**: Add a read-only view for the full content of archived/processed emails.
- [ ] **Undo Actions**: Implement a short-lived "undo" toast for destructive actions (trash).
- [ ] **Provider Health Dashboard**: Show more detailed status for each connected integration (token expiry, scope coverage).

## Completed
- [x] **Asynchronous ETL**: Separated ingestion from AI processing to handle high volume without timeouts.
- [x] **Local Storage**: Implemented RFC822 MIME archiving to local `.eml` files.
- [x] **Live Terminal**: Real-time event streaming of AI "thoughts" and actions.
- [x] **UI Consistency**: Normalized sizing, alignment, and navigation across the app.
- [x] **Resilient Auth**: Background token refreshing for Gmail, Outlook, and Supabase.
- [x] **Manual Retries**: Ability to re-queue failed AI analysis jobs with one click.
- [x] **Automated Setup**: In-browser database migration and Edge Function deployment.
- [x] **Human-Readable Archiving**: Standardized and sortable naming convention for saved emails.