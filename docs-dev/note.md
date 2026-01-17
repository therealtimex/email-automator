



## Current Architecture

Based on the code, here's how auto-pilot works:

```
Sync → AI Analysis → Rule Matching → Action Execution
```

**Flow:**
1. **Sync** fetches emails from Gmail/Outlook
2. **AI Analysis** (`IntelligenceService`) classifies each email:
   - `category`: spam, newsletter, support, client, internal, personal, other
   - `is_useless`: boolean
   - `suggested_action`: none, delete, archive, reply, flag
   - `draft_response`: AI-generated reply (if action is reply)
3. **Rules** match against analysis (e.g., `category === 'newsletter'` → archive)
4. **Actions** execute: delete, archive, draft

**Built-in auto-pilot features:**
- `auto_trash_spam`: Auto-delete spam emails
- `smart_drafts`: Auto-create reply drafts

**What do you want to focus on?**
1. **Test current AI analysis** - check if LLM is configured and working
2. **Create/manage rules** via the UI
3. **Enhance rule conditions** - add more matching options
4. **Improve AI prompts** - better classification accuracy
5. **Add new actions** - like auto-reply, forward, label