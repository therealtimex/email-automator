import { SETUP_KNOWLEDGE } from './setup-knowledge.generated.js';

export async function getLocalSetupGuide(): Promise<string> {
    // Return GETTING-STARTED.md if available, or a fallback
    return SETUP_KNOWLEDGE['GETTING-STARTED.md'] ||
        "## Setup Guide Not Found\nPlease refer to the online documentation.";
}

/**
 * Returns a quick answer for common setup questions without LLM call if possible.
 */
export function getSetupWizardShortcut(message: string, pageId: string, step?: string, localGuide?: string): string | null {
    const lowerMsg = message.toLowerCase();

    // Only apply shortcuts on the setup wizard page
    if (pageId !== 'setup_wizard') return null;

    // Shortcut 1: Where do I find the Anon Key?
    if (lowerMsg.includes('anon key') || lowerMsg.includes('api key') || lowerMsg.includes('find key')) {
        return `**Where to find your Supabase Anon Key:**

1. Go to your Supabase Project Dashboard.
2. Click on **Settings** (cog icon) in the sidebar.
3. Select **API**.
4. Look for the **anon** / **public** key under "Project API keys".`;
    }

    // Shortcut 2: Where is the Project URL?
    if (lowerMsg.includes('project url') || lowerMsg.includes('url')) {
        return `**Where to find your Project URL:**

1. Go to your Supabase Project Dashboard.
2. Click on **Settings** (cog icon).
3. Select **API**.
4. The URL is at the top under "Project URL" (e.g., https://xyz.supabase.co).`;
    }

    // Shortcut 3: Troubleshooting connection
    if ((lowerMsg.includes('connect') || lowerMsg.includes('fail') || lowerMsg.includes('error')) && step === 'credentials') {
        return `**Connection Troubleshooting:**

- Ensure you copied the **Project URL** exactly (no extra spaces).
- Ensure you used the **anon** key (not service_role).
- Check if your database is paused (Supabase pauses free tier projects after inactivity).
- Verify your internet connection.`;
    }

    return null;
}