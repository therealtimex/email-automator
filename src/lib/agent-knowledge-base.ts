/**
 * Agent Knowledge Base
 * Provides comprehensive context about Email-Automator to the LLM
 */

/**
 * Core application knowledge - always included in agent context
 */
export const CORE_APP_KNOWLEDGE = `
# Email-Automator Overview

Email-Automator is an AI-powered email automation tool for Gmail and Outlook.

## Key Features
1. **AI Email Analysis**: Automatically categorizes emails (spam, newsletter, transactional, etc.)
2. **Smart Drafts**: AI generates contextual draft responses based on email content
3. **Automation Rules**: User-defined rules to archive, delete, draft, or star emails
4. **Voice Assistant**: Interactive AI assistant with text-to-speech capabilities
5. **Multi-Account**: Supports multiple Gmail and Outlook accounts
6. **Real-time Sync**: Background syncing of emails with AI processing

## Architecture
- **Frontend**: React SPA with Vite
- **Backend**: Express API for email sync and AI processing
- **Database**: Supabase (PostgreSQL) with RLS
- **AI**: OpenAI-compatible LLMs (supports local models via Ollama/LM Studio)
- **TTS**: RealTimeX SDK (Piper, Supertonic providers)

## Main Pages
1. **Dashboard**: Overview of emails, stats, and quick actions
2. **Inbox**: Browse and manage emails with AI analysis
3. **Drafts**: Review and send AI-generated draft responses
4. **Rules**: Create automation rules with conditions and actions
5. **Configuration**: Connect accounts, configure LLM/TTS, manage rules
6. **Account Settings**: User profile, security, database configuration

## Core Concepts

### Email Categories
- **spam**: Unsolicited/junk mail
- **newsletter**: Marketing emails, subscriptions
- **promotional**: Sales, offers, deals
- **transactional**: Receipts, confirmations, notifications
- **social**: Social media notifications
- **support**: Customer service, help desk
- **client**: Business communications from clients
- **internal**: Company-internal emails
- **personal**: Personal correspondence

### Email Actions
- **archive**: Move to archive (keep for reference)
- **delete**: Permanently delete
- **draft**: Generate AI draft response
- **star**: Mark as important
- **none**: No action

### Automation Rules
Rules have:
- **Condition**: When to apply (category, sender, keywords, age, etc.)
- **Actions**: What to do (can be multiple: archive + draft, delete, etc.)
- **Instructions**: For draft action, how to respond
- **Attachments**: Files to include in drafts
- **Priority**: Higher priority rules evaluated first

### AI Analysis
Every email gets analyzed for:
- Category (spam, newsletter, etc.)
- Sentiment (Positive, Neutral, Negative)
- Priority (High, Medium, Low)
- Suggested action
- Summary
- Key points and action items

## Common Workflows

### Connect Email Account
1. Go to Configuration → Email Accounts
2. Click "Connect Gmail" or "Connect Outlook"
3. Provide OAuth credentials (Client ID/Secret)
4. Authorize in browser
5. Account syncs automatically

### Create Automation Rule
1. Go to Configuration → Automation Rules
2. Click "Create New Rule"
3. Set condition (category, sender, keywords, etc.)
4. Choose actions (archive, delete, draft, star)
5. If draft action: add instructions and optional attachments
6. Enable rule

### Review AI Drafts
1. Go to Drafts page
2. See list of AI-generated draft responses
3. Preview draft content
4. Edit if needed
5. Send or dismiss

### Configure AI Assistant
1. Go to Configuration → Voice & Speech
2. Select TTS provider (Piper, Supertonic)
3. Choose voice
4. Adjust speed (0.5x - 2.0x) and quality (1-20)
5. Toggle auto-speak on/off
6. Test voice

## Technical Details

### Database Tables
- **email_accounts**: OAuth tokens for Gmail/Outlook
- **emails**: Processed emails with AI analysis (JSONB)
- **rules**: Automation rules with conditions and actions
- **user_settings**: LLM provider, TTS settings, preferences
- **processing_logs**: Sync history and status
- **drafts**: Generated draft responses

### API Endpoints
- \`/api/sync\`: Trigger email sync
- \`/api/actions\`: Execute actions on emails
- \`/api/agent/chat\`: Agent conversation endpoint
- \`/api/tts/speak\`: Text-to-speech generation
- \`/api/tts/providers\`: List available TTS providers

### Environment Variables
- \`LLM_PROVIDER\`: AI provider (openai, ollama, etc.)
- \`LLM_MODEL\`: Model name (gpt-4o, llama3, etc.)
- \`LLM_BASE_URL\`: For local LLMs (http://localhost:11434/v1)
- \`SUPABASE_URL\`, \`SUPABASE_ANON_KEY\`: Database connection
`;

/**
 * Page-specific knowledge for contextual help
 */
export const PAGE_KNOWLEDGE: Record<string, string> = {
    dashboard: `
# Dashboard Page

The main overview page showing:
- **Email Stats**: Total emails, by category, actions taken
- **Recent Activity**: Latest syncs and processing
- **Quick Actions**: Sync now, view drafts, manage rules
- **Account Status**: Connected accounts and their sync status

User can:
- Trigger manual sync for all accounts or specific account
- View processing logs and errors
- Navigate to other pages
- See real-time updates via WebSocket
`,

    inbox: `
# Inbox Page

Browse and manage emails with AI analysis.

Features:
- **Filter by Category**: spam, newsletter, promotional, etc.
- **Search**: Full-text search across subject, sender, body
- **Sort**: By date or created_at
- **Pagination**: Load more emails with infinite scroll
- **AI Analysis Panel**: Click email to see detailed AI analysis
- **Actions**: Archive, delete, draft response, mark as star
- **Bulk Actions**: Select multiple emails for batch operations

Email Details Show:
- Subject, sender, recipient, date
- Full body content
- AI category, sentiment, priority
- AI summary and key points
- Suggested actions
- Action history (what was done)
`,

    drafts: `
# Drafts Page

Review and manage AI-generated draft responses.

Features:
- **Draft List**: All pending drafts sorted by date
- **Preview**: See draft content before sending
- **Edit**: Modify draft text inline
- **Send**: Send draft email via connected account
- **Dismiss**: Remove draft without sending
- **Voice Commands**: "Send draft to John", "Summarize my drafts"

Draft Information:
- Original email subject and sender
- Recipient email address
- AI-generated response content
- Timestamp of draft creation
- Associated rule (if generated by automation)

Voice Assistant Tools:
- send_draft: Send specific draft by ID
- dismiss_draft: Dismiss draft without sending
- preview_draft: Show full draft content
- summarize_drafts: Get overview of all pending drafts
`,

    rules: `
# Rules / Configuration Page

Create and manage automation rules.

Rule Components:
1. **Name**: Descriptive name for the rule
2. **Description**: Semantic context for AI matching (optional)
3. **Intent**: The goal/purpose of the rule (optional)
4. **Condition**: When to apply the rule
   - Category (spam, newsletter, etc.)
   - Sender (email, domain, contains)
   - Subject/Body keywords
   - Older than X days
   - Priority or Sentiment
5. **Actions**: What to do (multiple allowed)
   - Archive, Delete, Draft, Star
6. **Instructions**: For draft action, how to respond
7. **Attachments**: Files to include in drafts (optional)
8. **Priority**: Execution order (higher = first)

System Rules (Pre-defined):
- **Auto-Trash Spam**: Deletes emails categorized as spam
- **Smart Drafts**: Generates drafts for high-priority emails

Custom Rules:
- User-defined rules with flexible conditions
- Can combine multiple actions
- Support for attachments in drafts
- AI-assisted rule matching using semantic understanding
`,

    configuration_wizard: `
# Configuration Page

Central hub for all settings and setup.

Sections:

## Email Accounts
- Connect Gmail/Outlook accounts
- Manage OAuth credentials (BYOK - Bring Your Own Keys)
- View account status and last sync time
- Disconnect accounts

## LLM Settings
- Choose AI provider (RealTimeX AI, OpenAI, Ollama, etc.)
- Select model (GPT-4o, Llama3, etc.)
- Configure storage path for email data
- Test LLM connection
- Enable intelligent file renaming
- Set sync interval (minutes)

## Voice & Speech (TTS)
- Select TTS provider (Piper Local, Supertonic Local)
- Choose voice from available voices
- Adjust speed (0.5x - 2.0x)
- Set quality (1-20 inference steps)
- Toggle auto-speak on/off
- Test voice with sample text

## Automation Rules
- View all rules (system + custom)
- Create new rules
- Edit existing rules
- Enable/disable rules
- Delete rules
- Reorder by priority

## Provider Credentials (BYOK)
Optional: Bring your own OAuth keys for:
- Google/Gmail (Client ID, Client Secret)
- Microsoft/Outlook (Client ID, Tenant ID, Client Secret)
`,

    account_settings: `
# Account Settings Page

User profile and system configuration.

Tabs:

## Profile
- Upload avatar photo
- Edit first name and last name
- View email (read-only)
- Sound & haptic feedback toggle

## Persona (Optional)
- Define professional identity
- Set communication preferences (tone, length)
- Specify VIP senders and trusted domains
- Configure automation goals

## Security
- Change password
- View session information
- Manage authentication

## Database
- View Supabase connection status
- Configure database URL and keys
- Test database connection
- Migration status check
`,

    explainer: `
# AI Translation & Explanation Helper

Context-sensitive help for understanding:
- Automation rules in plain language
- Technical terms and concepts
- How settings affect workflow
- Email categories and their meanings
- AI analysis results interpretation
`
};

/**
 * Get comprehensive context for the agent based on current page
 */
export function getAgentContext(pageId: string, includeAllPages: boolean = false): string {
    let context = CORE_APP_KNOWLEDGE;

    // Add current page knowledge
    if (PAGE_KNOWLEDGE[pageId]) {
        context += `\n\n# Current Page: ${pageId}\n${PAGE_KNOWLEDGE[pageId]}`;
    }

    // Optionally include all page knowledge for cross-page help
    if (includeAllPages) {
        context += `\n\n# All Available Pages\n`;
        Object.entries(PAGE_KNOWLEDGE).forEach(([id, knowledge]) => {
            if (id !== pageId) {
                context += `\n## ${id}\n${knowledge}`;
            }
        });
    }

    return context;
}

/**
 * Detect if user is asking about a different page
 */
export function detectCrossPageQuery(query: string, currentPageId: string): string | null {
    const pageKeywords: Record<string, string[]> = {
        dashboard: ['dashboard', 'overview', 'stats', 'summary'],
        inbox: ['inbox', 'email list', 'browse emails', 'filter emails'],
        drafts: ['draft', 'drafts', 'draft response', 'pending drafts'],
        rules: ['rule', 'rules', 'automation', 'automate'],
        configuration_wizard: ['configuration', 'config', 'setup', 'connect account', 'llm settings', 'tts', 'voice'],
        account_settings: ['account settings', 'profile', 'security', 'password', 'persona']
    };

    const lowerQuery = query.toLowerCase();

    for (const [pageId, keywords] of Object.entries(pageKeywords)) {
        if (pageId !== currentPageId) {
            for (const keyword of keywords) {
                if (lowerQuery.includes(keyword)) {
                    return pageId;
                }
            }
        }
    }

    return null;
}

/**
 * Get enhanced system instruction with knowledge base
 */
export function getEnhancedSystemInstruction(
    pageId: string,
    baseInstruction: string,
    includeAllPages: boolean = true
): string {
    const knowledgeBase = getAgentContext(pageId, includeAllPages);

    return `${baseInstruction}

# Knowledge Base
${knowledgeBase}

# Response Guidelines
- Answer questions about Email-Automator features and capabilities
- If user asks about a feature on a different page, still provide helpful information
- Suggest navigation steps if user needs to go to another page
- Use specific terminology from the knowledge base
- Provide step-by-step instructions when helpful
- If using tools, explain what you're doing
- Be concise but comprehensive`;
}
