/**
 * Agent Knowledge Base (Backend)
 * Provides comprehensive context about Email-Automator to the LLM
 *
 * This file reads from docs/AGENT-KNOWLEDGE.md which is auto-generated
 * at build time by scripts/generate-agent-docs.ts from user documentation
 *
 * Sources:
 * - docs/user-guide/*.md (primary source)
 * - docs/README.md
 * - CLAUDE.md (technical architecture)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read generated documentation at runtime
let CORE_APP_KNOWLEDGE = '';

try {
    // Try to read from generated knowledge base
    const docsPath = path.join(__dirname, '../../../docs/AGENT-KNOWLEDGE.md');
    CORE_APP_KNOWLEDGE = fs.readFileSync(docsPath, 'utf-8');
    console.log('[AgentKnowledge] ✓ Loaded knowledge base from docs/AGENT-KNOWLEDGE.md');
    console.log(`[AgentKnowledge]   Size: ${(CORE_APP_KNOWLEDGE.length / 1024).toFixed(2)} KB`);
} catch (error) {
    console.warn('[AgentKnowledge] ⚠️  Could not load docs/AGENT-KNOWLEDGE.md, using fallback');
    console.warn('[AgentKnowledge]   Run: npm run build:docs');

    // Fallback minimal knowledge
    CORE_APP_KNOWLEDGE = `# Email-Automator Assistant

I'm your Email-Automator assistant. I can help you with:
- Connecting email accounts (Gmail, Outlook)
- Creating automation rules
- Managing drafts
- Configuring AI and voice settings

**⚠️ Note:** Full knowledge base not available. Please regenerate by running:
\`\`\`bash
npm run build:docs
\`\`\`
`;
}

export { CORE_APP_KNOWLEDGE };

export function getEnhancedSystemInstruction(
    pageId: string,
    userInstruction: string,
    data?: any
): string {
    // Base instruction with knowledge
    let instruction = `${userInstruction}

${CORE_APP_KNOWLEDGE}

# Current Context
- **Current Page**: ${pageId}
- **Page Data**: ${JSON.stringify(data || {}, null, 2)}

# Response Instructions

**CRITICAL - Anti-Hallucination Rules:**
1. ONLY answer using information explicitly documented in the knowledge base above
2. If you don't find information about something, say: "I don't have documentation about that"
3. NEVER invent features, buttons, settings, or workflows not documented above
4. When uncertain, acknowledge it clearly rather than guessing

**When Answering:**
- Search the knowledge base for relevant information first
- Reference exact page names and UI elements as documented
- Provide step-by-step instructions when they exist in the guides
- If user asks about a different page, guide them: "Go to [Page Name] → [Section]"
- Use tools when available on current page
- Be concise and accurate - better to say "I'm not sure" than provide wrong information`;

    return instruction;
}
