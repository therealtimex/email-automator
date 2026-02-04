# Glossary

Definitions of common terms used in Email Automator and the Setup Wizard.

## Supabase
A backend platform that provides a hosted Postgres database, authentication, storage, and APIs. Email Automator uses Supabase as its database and auth layer.

## BYOK (Bring Your Own Key)
A setup model where you connect your own Supabase project instead of using a shared backend. This keeps your data in your own infrastructure.

## Supabase Project ID
The unique identifier for your Supabase project (often shown in the project URL or settings).

## Supabase Project URL
The base URL for your Supabase project, used by the app to connect to the database and APIs.

## Anon Key (Public API Key)
The public API key for your Supabase project. It is safe for client-side use but still subject to Row Level Security (RLS).

## Access Token
A token from your Supabase account that lets the Setup Wizard create or manage projects on your behalf (used in Quick Start).

## Managed Provisioning (Quick Start)
The Setup Wizard uses your Access Token to automatically create a Supabase project, apply migrations, deploy Edge Functions, and ingest the knowledge base.

## Manual Sync (Connect Existing Project)
You connect an existing Supabase project by providing the Project URL and Anon Key. Migrations can be run by the wizard if an Access Token is provided.

## Managed Provisioning vs Manual Sync
**Managed Provisioning** creates a new Supabase project for you using an Access Token.  
**Manual Sync** connects to an existing Supabase project using your Project URL and Anon Key.

## Migration
Database changes that create or update tables, views, functions, and policies. Migrations keep your database schema aligned with the app.

## Schema
The structure of your database: tables, columns, types, indexes, functions, and policies.

## SQL
The language used to define and query database structures and data.

## Version Mismatch
When the app’s expected schema version differs from the database’s actual version. The Setup Wizard or migration tool will prompt you to normalize.

## Database Version (Account Settings)
The database major version shown in Account Settings. It’s used to guide migrations and should match your Supabase project’s Postgres version.

## Rollback
Reverting a migration. In Supabase, rollbacks are manual and should be used carefully.

## RLS (Row Level Security)
A Postgres security feature that restricts which rows a user can read or write. Supabase uses RLS to protect data.

## Edge Functions
Serverless functions hosted by Supabase. Email Automator uses them for OAuth flows and secure operations.

## Service Role Key
A powerful Supabase key that bypasses RLS. It must never be exposed to clients.

## Anon Key vs Service Role Key
The **anon key** is safe for client use and respects RLS. The **service role key** bypasses RLS and must only be used on trusted servers.

## RealTimeX Desktop
The local app that provides AI services (LLMs, embeddings, TTS) used by Email Automator.

## Digital Persona
A profile that defines your tone, style, and preferences for AI-generated drafts and responses.

## Persona Tone
The emotional character of replies (e.g., friendly, formal, direct).

## Persona Style
The writing style preferences (e.g., concise, detailed, bullet points).

## Persona Voice
The overall “sound” of your writing, including phrasing and rhythm.

## Persona Signature
A standardized sign-off used in replies (name, title, company).

## Persona Role
Your job title or role, used to shape response framing.

## Persona Company
The organization name used in replies when appropriate.

## Persona Language
The primary language for generated drafts.

## Edge Functions
Serverless functions hosted by Supabase. Email Automator uses them for OAuth flows and secure operations.

## Express API
The local backend that handles email syncing, AI processing, and automation execution.

## Realtime (Supabase)
Live updates from the database to the app. Used to reflect new emails, sync status, or activity without refreshing.

## LLM (Large Language Model)
An AI model used for analysis and generating responses (e.g., categorization, drafting replies).

## Embedding Model
A model that converts text into vectors for semantic search. Used by the knowledge base and RAG.

## Embeddings
Vector representations of text used for semantic search in the knowledge base.

## RAG (Retrieval-Augmented Generation)
A method that retrieves relevant documentation and feeds it to the AI so responses stay grounded in your docs.

## Knowledge Base Ingestion
The process of converting documentation into searchable embeddings and storing them in the database.

## TTS (Text-to-Speech)
Converts AI responses into spoken audio.

## TTS Provider vs Voice
The provider is the service that generates speech; the voice is the specific speaker/persona within that provider.

## OAuth
An authorization standard that lets the app access your email account without storing your password.

## OAuth Consent Screen
The screen where you grant Email Automator permission to access your email account.

## Access Token (OAuth)
A short-lived token used to call email provider APIs. It expires and is refreshed automatically.

## Refresh Token
A long-lived token used to obtain new access tokens without re‑authenticating.

## Gmail API
Google’s official API for accessing Gmail data and sending emails.

## Microsoft Graph
Microsoft’s API for Outlook and Microsoft 365 data (mail, calendar, contacts).

## IMAP / SMTP
Email protocols. IMAP reads mail; SMTP sends mail. (Email Automator uses provider APIs rather than raw IMAP/SMTP.)

## App Registration (Microsoft)
An app configuration in Azure that provides credentials for Microsoft Graph access.

## Client ID
The public identifier for your OAuth app (Google/Microsoft).

## Client Secret
A private secret for your OAuth app. Treat it like a password.

## Redirect URI
The callback URL where the email provider sends users after OAuth authorization.

## Device Code Flow
An OAuth flow where you authenticate in a browser using a short code, often used for desktop apps.

## Tenant ID
The Microsoft tenant identifier. Use “common” for multi‑tenant or a specific tenant for org‑only access.

## Sync Scope
Defines how much history to sync (e.g., last X days) and which accounts are included.

## Labels (Gmail) / Folders (Outlook)
Organization constructs in email providers. Labels tag messages; folders organize them into containers.
