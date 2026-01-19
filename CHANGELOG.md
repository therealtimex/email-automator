# Changelog

All notable changes to Email Automator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.5.0] - 2026-01-18

### Added
- **Asynchronous ETL Pipeline**: Migrated from a synchronous "Fetch & Process" model to an asynchronous ETL (Extract, Transform, Load) model. Emails are now ingested rapidly and processed by a background worker, eliminating timeouts and improving reliability.
- **Local Disk Storage**: Raw email content is now saved as `.eml` files on the local file system instead of the database. This improves database performance and data fidelity.
- **Customizable Storage Path**: Added a "Local Storage Path" setting in the Configuration page, allowing users to define where raw emails are stored.
- **Processing Status UI**: Dashboard now displays granular processing states: Queued (Ingested), Analyzing (AI processing), Analyzed (Complete), and Failed.
- **Raw Email Access**: Added API endpoint `GET /api/v1/emails/:id/raw` to download/view the original email source.

### Changed
- **Architecture**: Split `EmailProcessorService` into fast Ingestion and smart background Processing.
- **Storage**: Automatically cleans up disk files when emails are deleted from the UI.

## [2.6.4] - 2026-01-18

### Added
- **Rule Editing**: Users can now edit existing automation rules (both custom and system defaults).
  - Added "Edit" button to rules in the Configuration list.
  - Refactored Rule Modal to support both creation and modification.
  - Added `updateRule` action to frontend and backend for full CRUD support.

## [2.6.3] - 2026-01-18

### Fixed
- **UI UX**: Improved "Create Auto-Pilot Rule" modal by adding a maximum height and scrollability. This ensures the modal remains usable and the "Create Rule" button stays accessible even when selecting multiple actions or adding long instructions.

## [2.6.2] - 2026-01-18

### Added
- **Top Bar Sync Status**: Moved the real-time sync indicator to the global top bar. It now appears as a subtle, Gmail-style "LIVE" badge when connected.
- **Improved Sidebar Order**: Reordered the Dashboard sidebar to show "Email Details" at the very top when an email is selected, reducing the need for scrolling.

### Changed
- **Settings Migration**: Moved the "Background Sync Interval" setting from the Dashboard to the Configuration page to keep the main view focused on active tasks.

## [2.6.1] - 2026-01-18

### Changed
- **Sync Strategy**: Optimized the sliding window from 30 days to **7 days** for better search performance.
- **Auto-Skip Loop**: Added logic to automatically skip forward through empty 7-day windows (up to 10 weeks per run). This allows the system to fast-forward through years of inactivity while maintaining high performance and precision.

## [2.6.0] - 2026-01-18

### Added
- **Sliding Window Sync**: Implemented a **30-day Bounded Sliding Window** for Gmail synchronization. This makes historical syncs (e.g., from 2024) significantly faster and more predictable.
- **Auto Fast-Forward**: The system now automatically "jumps" the checkpoint forward if a 30-day window contains no emails. This allows the system to skip years of inactive data in just a few seconds without hitting API rate limits.

### Changed
- **Sync Logic**: Combined `after:` and `before:` operators in Gmail queries to create tight, high-precision search ranges.

## [2.5.7] - 2026-01-18

### Fixed
- **Gmail Sync Order**: Fixed major flaw where sync would still fetch recent emails instead of older ones during a "rewind" (historical sync).
  - Switched to an exhaustive ID collection strategy (collecting up to 50,000 IDs per search).
  - The system now correctly identifies the absolute oldest emails matching the query by reversing the complete result set before processing.
  - Optimized hydration to only fetch content for the specifically requested number of emails, significantly improving speed.

## [2.5.6] - 2026-01-18

### Fixed
- **Content Cleaning**: Fixed bug in `ContentCleaner` where over-aggressive filtering could strip the entire email body (especially newsletters with Unsubscribe links).
  - Added a safety fallback to return the original text if cleaning results in an empty string.
  - Relaxed footer detection patterns to reduce false positives.
- **AI Diagnostics**: Added `content_length` to the AI "Thinking" log to help troubleshoot data flow issues in the Live Terminal.

## [2.5.5] - 2026-01-18

### Fixed
- **Sync Overrides**: Fixed issue where `sync_start_date` (Sync From) was ignored if a newer checkpoint existed. The system now correctly prioritizes the manual start date, enabling rewinds.
- **Checkpoint Persistence**: Improved checkpoint logic to update relative to the *current run's* starting point. This ensures that when you rewind a sync, the checkpoint correctly follows the new forward progress, even if it is behind a previous (stale) checkpoint.
- **Auto-Cleanup**: Backend now automatically clears the `sync_start_date` override after a successful run to resume normal incremental processing.

## [2.5.4] - 2026-01-18

### Fixed
- **AI Trace**: Fixed issue where granular trace events were missing for background-processed emails.
  - Background worker now creates real `processing_logs` entries to satisfy RLS requirements.
  - Linked the "Ingested" event to the email ID in the database, ensuring the full pipeline (Ingestion -> Analysis -> Action) is visible in the AI Trace modal.

## [2.5.3] - 2026-01-18

### Fixed
- **Rule Engine**: Fixed TypeScript error in `suggested_actions` matching logic.
- **Worker Stability**: Added status checks to prevent multiple background workers from processing the same email simultaneously.

## [2.5.2] - 2026-01-18

### Added
- **Background Processing Visibility**: Background worker now utilizes the `EventLogger`, meaning AI "Thinking" and "Decided" events are once again visible in the Live Terminal in real-time.
- **Enhanced AI Intelligence**: Extracted technical headers (Importance, List-Unsubscribe, Auto-Submitted) from raw MIME content and passed them as explicit signals to the LLM for better categorization.

### Fixed
- **ETL Reliability**: Ensured AI analysis prioritized clean text over HTML when parsing raw emails.

## [2.5.9] - 2026-01-18

### Changed
- **Sync Optimization**: Refined Gmail ID collection cap to 5,000 messages. This ensures snappy performance during historical syncs while still being exhaustive enough to find the "bottom" of search results efficiently.
- **Sync Reliability**: Added a `before:now` guard to Gmail queries to ignore future-dated emails that could otherwise break chronological sorting and checkpoint tracking.

## [2.5.1] - 2026-01-18

### Fixed
- **Storage Fidelity**: Fixed issue where saved `.eml` files only contained the body text and lacked original email headers.
  - Ingestion now fetches the **Raw RFC822 MIME** source from Gmail and Outlook.
  - Integrated `mailparser` to extract metadata (Subject, From, Date) from the raw source for the database while preserving the full original source on disk.
  - AI analysis now uses clean text parsed locally from the raw source, ensuring better accuracy.

## [2.5.0] - 2026-01-18

### Fixed
- **Sync Logic**: Prioritized `sync_start_date` over `last_sync_checkpoint` in the backend query construction. This ensures that when a user manually sets a "Sync From" date (e.g., to rewind and backfill older emails), the system respects it even if a newer checkpoint exists. Previously, the checkpoint would override the manual start date, preventing rewinds.

## [2.4.8] - 2026-01-18

### Changed
- **Sync Optimization**: Refactored `last_sync_checkpoint` updates to occur once per batch instead of per-email, improving performance and reducing database load.
- **Error Handling**: Added robust error checking and logging for checkpoint persistence to help diagnose sync issues.

## [2.4.7] - 2026-01-18

### Fixed
- **Sync UX**: "Sync From" input now automatically defaults to the `last_sync_checkpoint` (in Local Time) after a successful sync run. This clears any temporary manual overrides, ensuring the user always sees the actual "Next Sync Point" by default.

## [2.4.6] - 2026-01-18

### Fixed
- **Timezone Display**: Fixed "Sync From" input in Dashboard showing UTC times instead of Local Time. It now correctly converts UTC checkpoints to the user's local timezone for display, preventing accidental time shifts when saving settings.

## [2.4.5] - 2026-01-18

### Fixed
- **Sorting**: Fixed issue where sorting toggle in Dashboard was not updating the email list.
  - Root Cause: `api-v1-emails` Edge Function had hardcoded sorting logic.
  - Fix: Updated Edge Function to accept and process `sort_by` and `sort_order` query parameters.

## [2.4.4] - 2026-01-18

### Added
- **Email Sorting**: Added ability to sort emails by "Received Time" or "Processing Time" in ascending or descending order.
- **Detailed Timestamps**: Email cards now display both the original "Received" time and the system "Processed" time for better visibility.
- **Sorting UI**: New sorting controls added to the Dashboard search bar area.

### Changed
- **API**: Updated `GET /api/v1/emails` to accept `sort_by` and `sort_order` parameters.
- **State Management**: Updated `AppContext` to persist sorting preferences.

## [2.4.3] - 2026-01-18

### Added
- **Sync History**: New "Sync History" card in the Dashboard sidebar showing recent sync runs, emails processed, and status (Success/Failed).
- **Live Sync Banner**: Prominent banner appears at the top of the Dashboard during active syncs, providing clear feedback that background processing is happening.
- **Email Status Indicators**: Email cards now show "Analyzed" (with AI brain icon) or "Pending" (with spinner) status badges to differentiate processed vs. unprocessed emails.

### Changed
- **Dashboard Data**: Dashboard now automatically fetches sync statistics on load, ensuring history is immediately visible.

## [2.4.2] - 2026-01-18

### Fixed
- **LLM Compatibility**: Removed strict `response_format: { type: 'json_object' }` to fix 400 errors with newer models (e.g., o1, o3-mini) or providers that require `json_schema` or `text`. System now relies on robust prompt engineering and manual JSON extraction which is already implemented.

## [2.4.1] - 2026-01-18

### Fixed
- **LLM Compatibility**: Removed strict `response_format: { type: 'json_object' }` to fix 400 errors with newer models (e.g., o1, o3-mini) or providers that require `json_schema` or `text`. System now relies on robust prompt engineering and manual JSON extraction which is already implemented.

## [2.4.0] - 2026-01-18

### Added
- **Multi-Action Rules**: Rules can now execute multiple actions (e.g., archive + mark as read + star)
  - Database: Added `actions TEXT[]` column to rules table
  - API: `/api/actions/execute` now accepts `actions` array parameter
  - Frontend: Rule creation modal now shows checkboxes for selecting multiple actions
  - Processor: Executes all actions in sequence when a rule matches

### Changed
- **Sync Logic**: Switched to "Oldest-First" processing strategy
  - Gmail: Implemented "Fetch IDs → Sort → Hydrate" to ensure oldest emails are processed first
  - Outlook: Updated query to sort by `receivedDateTime asc`
  - Checkpointing: Now correctly tracks the latest processed timestamp to prevent gaps
- **Backward Compatibility**: Legacy `action` (singular) field still works for existing rules
- **Rule Display**: Rules now show all configured actions joined with "+" (e.g., "archive + read")

## [2.3.8] - 2026-01-18

### Fixed
- **Rule Persistence**: Fixed bug where global spam/draft toggles weren't saving
- **UI State**: Fixed toggle state synchronization between frontend and backend
- **System Rules**: Consolidated hardcoded toggles into the `rules` table for better maintainability

### Changed
- **Architecture**: Refactored `actions.updateSettings` to modify rules instead of user_settings

## [2.3.7] - 2026-01-16

### Added
- **Live Terminal**: Real-time feed of AI processing events (analysis, actions, errors)
- **AI Trace**: Granular logs for each processed email (prompts, responses)
- **Sync Trace**: Timeline view of all actions taken during a sync run
- **Manual Migration**: `/api/migrate` endpoint and UI for triggering DB migrations
- **System Logs**: Persistent logging of server-side errors to Supabase

### Fixed
- **Sync Logic**: Fixed infinite loop and skipped emails in sync process
- **Gmail Drafts**: Correctly threading drafts using Message-ID and References
- **Build Errors**: Fixed image paths in documentation

## [2.0.0] - 2026-01-14

### Added
- Initial Release
- React + Vite Frontend
- Express API backend
- Supabase database integration

[2.4.0]: https://github.com/therealtimex/email-automator/compare/v2.3.8...v2.4.0
[2.3.8]: https://github.com/therealtimex/email-automator/compare/v2.3.7...v2.3.8
[2.3.7]: https://github.com/therealtimex/email-automator/compare/v2.0.0...v2.3.7
[2.0.0]: https://github.com/therealtimex/email-automator/compare/v1.0.0...v2.0.0