#!/usr/bin/env tsx
/**
 * Generates docs/AGENT-KNOWLEDGE.md from user documentation
 * Sources: docs/README.md, docs/user-guide/*.md, CLAUDE.md
 * Run: npm run build:docs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

const OUTPUT_PATH = path.join(ROOT_DIR, 'docs/AGENT-KNOWLEDGE.md');
const USER_GUIDE_DIR = path.join(ROOT_DIR, 'docs/user-guide');

// Read source files
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf-8'));
const docsReadme = fs.readFileSync(path.join(ROOT_DIR, 'docs/README.md'), 'utf-8');
const claudeMd = fs.readFileSync(path.join(ROOT_DIR, 'CLAUDE.md'), 'utf-8');

// Read all user guide files
const userGuideFiles = fs.readdirSync(USER_GUIDE_DIR)
  .filter(file => file.endsWith('.md'))
  .sort(); // Alphabetical order

const userGuides: Record<string, string> = {};
userGuideFiles.forEach(file => {
  const content = fs.readFileSync(path.join(USER_GUIDE_DIR, file), 'utf-8');
  const title = file.replace('.md', '');
  userGuides[title] = content;
});

// Extract sections from CLAUDE.md (for technical architecture)
const extractSection = (content: string, heading: string): string => {
  const regex = new RegExp(`## ${heading}[\\s\\S]*?(?=\\n## |$)`, 'i');
  const match = content.match(regex);
  return match ? match[0] : '';
};

// Clean up markdown links to prevent confusion
const cleanContent = (content: string): string => {
  return content
    // Remove "Next step:" references with links
    .replace(/Next step:.*?\n/g, '')
    // Convert markdown links to plain text: [**Text**](./link) → "Text"
    .replace(/\[(\*\*)?([^\]]+)(\*\*)?\]\([^)]+\)/g, '"$2"')
    // Clean up excessive newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

// Build agent-optimized documentation from user guides
const agentDocs = `# Email-Automator AI Agent Knowledge Base
**Generated:** ${new Date().toISOString()}
**Version:** ${packageJson.version}
**Sources:** User documentation (docs/user-guide/), CLAUDE.md, README.md

---

# CRITICAL: Anti-Hallucination Rules

**You MUST follow these rules strictly:**

1. **ONLY use information from this knowledge base** - If information is not explicitly documented below, you MUST say "I don't have information about that feature" or "I'm not sure about that"

2. **Never fabricate features** - Do not invent capabilities, settings, buttons, or workflows that aren't documented

3. **Be honest about limitations** - If a user asks about something not in the knowledge base, acknowledge it clearly: "That's not covered in the documentation I have. Let me help with what I do know..."

4. **Exact references only** - Only mention page names, buttons, settings, and steps that are explicitly documented below

5. **No assumptions** - Don't assume features exist just because they seem logical or similar apps have them

---

# Response Guidelines

When answering user questions:
1. **Search the knowledge base first** - Find the relevant section before answering
2. **Be specific**: Reference exact page names, button labels, steps from the documentation
3. **Quote directly**: When possible, use the exact wording from the guides
4. **Provide step-by-step instructions** when documented
5. **Cross-page help**: Guide users to the correct page when needed (e.g., "Go to Configuration page → Voice & Speech section")
6. **Use tools when available**: If the current page has tools, offer to execute actions
7. **Be concise but complete**: Provide thorough answers without unnecessary verbosity
8. **If unsure, say so**: Better to admit uncertainty than provide wrong information

---

# Application Overview

${cleanContent(docsReadme.split('---')[0])}

---

# User Guide: Complete Documentation

${Object.entries(userGuides).map(([title, content]) => {
  // Clean up content - remove links, references, excessive newlines
  const cleaned = cleanContent(content)
    .replace(/^#\s+/m, '## '); // Convert H1 to H2

  return `---\n\n${cleaned}`;
}).join('\n\n')}

---

# Technical Architecture (For Context)

${extractSection(claudeMd, 'Architecture')}

---

# Common Commands (For Reference)

${extractSection(claudeMd, 'Common Commands')}

---

# Additional Context

## Email Categories
- **spam**: Unsolicited/junk mail
- **newsletter**: Marketing emails, subscriptions
- **promotional**: Sales, offers, deals
- **transactional**: Receipts, confirmations, notifications
- **social**: Social media notifications
- **support**: Customer service, help desk
- **client**: Business communications from clients
- **internal**: Company-internal emails
- **personal**: Personal correspondence

## Email Actions
- **archive**: Move to archive (keep for reference)
- **delete**: Permanently delete
- **draft**: Generate AI draft response
- **star**: Mark as important

## Available Tools (Page-Specific)

### Drafts Page Tools
- \`send_draft\`: Send specific draft by ID
- \`dismiss_draft\`: Dismiss draft without sending
- \`preview_draft\`: Show full draft content
- \`summarize_drafts\`: Get overview of all pending drafts

---

**End of Knowledge Base**
`;

// Ensure docs directory exists
fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

// Write to file
fs.writeFileSync(OUTPUT_PATH, agentDocs, 'utf-8');

console.log(`✓ Generated agent knowledge base: ${OUTPUT_PATH}`);
console.log(`  Version: ${packageJson.version}`);
console.log(`  Sources: ${Object.keys(userGuides).length} user guides + docs/README.md + CLAUDE.md`);
console.log(`  Size: ${(agentDocs.length / 1024).toFixed(2)} KB`);
console.log(`  Lines: ${agentDocs.split('\n').length}`);
