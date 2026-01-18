# Changelog

All notable changes to Email Automator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.7] - 2026-01-18

### Fixed
- **NPX Dependency Loop**: Resolved infinite dependency resolution loop that caused `npx @realtimex/email-automator` to hang indefinitely
  - Root cause: Conflicting peer dependencies between `@instructor-ai/instructor` (requires `openai >= 4.58.0`) and `zod-stream` (requires `openai = 4.47.1` exactly)
  - Solution: Removed `@instructor-ai/instructor` and replaced with direct OpenAI SDK usage

### Changed
- **AI Integration**: Migrated from `@instructor-ai/instructor` to direct OpenAI SDK with native JSON mode
  - Uses `response_format: { type: 'json_object' }` for structured outputs
  - Zod validation preserved for type safety
  - No functional changes to AI analysis capabilities

### Removed
- **@instructor-ai/instructor**: Removed dependency to fix npm resolution issues

## [2.0.0] - 2026-01-15

### Added
- **Hybrid Architecture**: Split into Edge Functions (Supabase) and Local API (Express)
- **Edge Functions**: OAuth management, secure credentials, database proxy
- **npx Support**: Fully compatible with npx for easy installation
- **CLI Commands**: `email-automator`, `email-automator-setup`, `email-automator-deploy`
- **Port Configuration**: Configurable ports to avoid conflicts with RealTimeX Desktop
- **RealTimeX Integration**: Designed to work as Local App in RealTimeX ecosystem
- **Interactive Setup**: Wizard-based configuration via `email-automator-setup`
- **Auto Deploy**: One-command Edge Functions deployment

### Changed
- **Default Port**: Changed from 3001 to 3004 (avoids RealTimeX Desktop conflicts)
- **Package Name**: Renamed to `@realtimex/email-automator` (scoped package)
- **Architecture**: Migrated from monolithic to hybrid serverless + local
- **API Client**: Refactored to route requests to Edge Functions vs Express API

### Removed
- **Docker Support**: Removed all Docker files and configurations
- **Monolithic API**: Split auth/database routes to Edge Functions

### Security
- **Token Encryption**: OAuth tokens encrypted in Edge Functions
- **RLS Enforcement**: Database access controlled by Supabase RLS
- **No Public Auth**: Local API trusts local environment (DISABLE_AUTH)

### Documentation
- Added comprehensive NPX usage guide
- Added RealTimeX Desktop integration guide
- Added port configuration documentation
- Added NPM publishing guide
- Updated architecture documentation

## [1.0.0] - 2025-12-01

### Added
- Initial release
- Gmail and Microsoft 365 integration
- AI-powered email categorization
- Automation rules engine
- Background email sync
- React frontend with TailwindCSS
- Express API backend
- Supabase database integration

[2.3.7]: https://github.com/therealtimex/email-automator/compare/v2.0.0...v2.3.7
[2.0.0]: https://github.com/therealtimex/email-automator/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/therealtimex/email-automator/releases/tag/v1.0.0
