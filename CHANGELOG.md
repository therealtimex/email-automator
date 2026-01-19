# Changelog

All notable changes to Email Automator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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