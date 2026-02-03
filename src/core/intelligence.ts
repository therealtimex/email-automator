import { RealtimeXSDK } from '@realtimex/sdk';
import { z } from 'zod';

// Define the schema for email analysis
export const EmailAnalysisSchema = z.object({
    summary: z.string().describe("A brief summary of the email content"),
    category: z.enum(['spam', 'newsletter', 'support', 'client', 'internal', 'personal', 'other'])
        .describe("The category of the email"),
    sentiment: z.enum(['Positive', 'Neutral', 'Negative'])
        .describe("The emotional tone of the email"),
    is_useless: z.boolean()
        .describe("Whether the email is considered useless (spam, newsletter, etc.)"),
    suggested_action: z.enum(['none', 'delete', 'archive', 'reply', 'flag'])
        .describe("The recommended next action"),
    draft_response: z.string().optional()
        .describe("A suggested draft response if the action is 'reply'"),
    priority: z.enum(['High', 'Medium', 'Low'])
        .describe("The urgency of the email")
});

export type EmailAnalysis = z.infer<typeof EmailAnalysisSchema>;

/**
 * IntelligenceLayer - Email analysis using RealTimeX SDK
 *
 * This class provides AI-powered email analysis through the RealTimeX SDK,
 * which connects to RealTimeX Desktop for LLM provider management.
 *
 * No API keys required - configuration is managed through RealTimeX Desktop.
 */
export class IntelligenceLayer {
    private sdk: RealtimeXSDK | null = null;

    constructor() {
        try {
            this.sdk = new RealtimeXSDK({
                realtimex: {
                    // @ts-ignore - Dev Mode feature
                    apiKey: 'SXKX93J-QSWMB04-K9E0GRE-J5DA8J0'
                },
                permissions: [
                    'llm.chat',         // Chat completion
                    'llm.providers',    // List LLM providers
                ],
            });
            console.log('[IntelligenceLayer] RealTimeX SDK initialized');
        } catch (error) {
            console.error('[IntelligenceLayer] Failed to initialize RealTimeX SDK:', error);
            this.sdk = null;
        }
    }

    async analyzeEmail(
        content: string,
        context: { subject: string; sender: string; date: string },
        userSettings?: any
    ): Promise<EmailAnalysis | null> {
        if (!this.sdk) {
            console.error('[IntelligenceLayer] SDK not initialized. Is RealTimeX Desktop running?');
            return null;
        }

        try {
            // Resolve provider from user settings or use defaults
            let provider = 'realtimexai';
            let model = 'gpt-4o-mini';

            if (userSettings?.llm_provider) {
                provider = userSettings.llm_provider;
            }
            if (userSettings?.llm_model) {
                model = userSettings.llm_model;
            }

            // Build system prompt with email analysis instructions
            let systemPrompt = `You are an AI Email Assistant. Analyze the provided email and extract structured information.
Return ONLY a valid JSON object with these fields:
{
  "summary": "string - brief summary",
  "category": "spam|newsletter|support|client|internal|personal|other",
  "sentiment": "Positive|Neutral|Negative",
  "is_useless": boolean,
  "suggested_action": "none|delete|archive|reply|flag",
  "draft_response": "string (optional)",
  "priority": "High|Medium|Low"
}

Context:
- Current Date: ${new Date().toISOString()}
- Subject: ${context.subject}
- From: ${context.sender}
- Date: ${context.date}`;

            // --- Adaptive Learning Injection (Phase 4) ---
            if (userSettings) {
                const patterns = userSettings.category_patterns || {};
                const senderDomain = context.sender.split('@')[1];

                systemPrompt += `\n\nUSER PREFERENCES (LEARNED):`;

                // 1. Learned Categories
                if (senderDomain && patterns[senderDomain]) {
                    systemPrompt += `\n- CRITICAL: User has explicitly categorized emails from "@${senderDomain}" as "${patterns[senderDomain]}". YOU MUST RESPECT THIS.`;
                }

                // 2. Draft Preferences
                if (userSettings.preferred_tone) {
                    systemPrompt += `\n- Draft Tone: ${userSettings.preferred_tone}`;
                }
                if (userSettings.preferred_length) {
                    systemPrompt += `\n- Draft Length: ${userSettings.preferred_length}`;
                }

                // 3. Negative Constraints
                if (userSettings.never_draft_domains?.includes(senderDomain)) {
                    systemPrompt += `\n- CRITICAL: DO NOT generate a draft_response for this sender. Set draft_response to null/empty string.`;
                }
            }

            // Call RealTimeX SDK for chat completion
            const response = await this.sdk.llm.chat([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: content }
            ], {
                provider,
                model,
                temperature: 0.1,
                response_format: { type: 'json_object' }
            });

            const rawResponse = response.response?.content || '';

            // Parse and validate with Zod
            const parsed = JSON.parse(rawResponse);

            // Hard override if critical pattern matched (Safety Net)
            if (userSettings) {
                const senderDomain = context.sender.split('@')[1];
                const patterns = userSettings.category_patterns || {};
                if (senderDomain && patterns[senderDomain]) {
                    parsed.category = patterns[senderDomain];
                }
            }

            const validated = EmailAnalysisSchema.parse(parsed);

            return validated;
        } catch (error) {
            console.error('[IntelligenceLayer] AI Analysis Error:', error);
            return null;
        }
    }
}
