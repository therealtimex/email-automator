# Changelog

All notable changes to Email Automator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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