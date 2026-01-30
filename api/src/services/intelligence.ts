import { z } from 'zod';
import { createLogger } from '../utils/logger.js';
import { EventLogger } from './eventLogger.js';
import { ContentCleaner } from '../utils/contentCleaner.js';
import { SDKService } from './SDKService.js';

const logger = createLogger('Intelligence');

// Define the schema for email analysis
export const EmailAnalysisSchema = z.object({
    summary: z.string().describe('A brief summary of the email content'),
    category: z.enum(['spam', 'newsletter', 'promotional', 'transactional', 'social', 'support', 'client', 'internal', 'personal', 'other'])
        .describe('The category of the email'),
    sentiment: z.enum(['Positive', 'Neutral', 'Negative'])
        .describe('The emotional tone of the email'),
    is_useless: z.boolean()
        .describe('Whether the email is considered useless (spam, newsletter, etc.)'),
    suggested_actions: z.array(z.enum(['none', 'delete', 'archive', 'reply', 'flag']))
        .describe('The recommended next actions (e.g. ["reply", "archive"])'),
    draft_response: z.string().optional()
        .describe('A suggested draft response if the action is reply'),
    priority: z.enum(['High', 'Medium', 'Low'])
        .describe('The urgency of the email'),
    key_points: z.array(z.string()).optional()
        .describe('Key points extracted from the email'),
    action_items: z.array(z.string()).optional()
        .describe('Action items mentioned in the email'),
});

export type EmailAnalysis = z.infer<typeof EmailAnalysisSchema>;

// Context-Aware Analysis Schema - AI evaluates email against user's rules
export const ContextAwareAnalysisSchema = z.object({
    summary: z.string().describe('A brief summary of the email content'),
    category: z.enum(['spam', 'newsletter', 'promotional', 'transactional', 'social', 'support', 'client', 'internal', 'personal', 'other'])
        .describe('The category of the email'),
    priority: z.enum(['High', 'Medium', 'Low'])
        .describe('The urgency of the email'),

    matched_rule: z.object({
        rule_id: z.string().nullable().describe('ID of the matched rule, or null if no match'),
        rule_name: z.string().nullable().describe('Name of the matched rule'),
        confidence: z.number().min(0).max(1).describe('Confidence score for the match (0-1)'),
        reasoning: z.string().describe('Explanation of why this rule was matched or why no rule matched'),
    }),

    actions_to_execute: z.array(z.enum(['none', 'delete', 'archive', 'draft', 'read', 'star']))
        .describe('Actions to execute based on the matched rule'),

    draft_content: z.string().nullable().optional()
        .describe('Generated draft reply if the action includes drafting'),
});

export type ContextAwareAnalysis = z.infer<typeof ContextAwareAnalysisSchema>;

// Rule context for AI matching
export interface RuleContext {
    id: string;
    name: string;
    description?: string;
    intent?: string;
    actions: string[];
    draft_instructions?: string;
}

export interface EmailContext {
    subject: string;
    sender: string;
    date: string;
    metadata?: {
        importance?: string;
        listUnsubscribe?: string;
        autoSubmitted?: string;
        mailer?: string;
    };
    userPreferences?: {
        autoTrashSpam?: boolean;
        smartDrafts?: boolean;
    };
}

export class IntelligenceService {
    private isConfigured: boolean = false;

    constructor() {
        this.isConfigured = true;
        logger.info('Intelligence service initialized via RealTimeX SDK');
    }

    isReady(): boolean {
        return this.isConfigured && !!SDKService.getSDK();
    }

    async analyzeEmail(content: string, context: EmailContext, eventLogger?: EventLogger, emailId?: string): Promise<EmailAnalysis | null> {
        console.log('[Intelligence] analyzeEmail called for:', context.subject);

        const sdk = SDKService.getSDK();
        if (!sdk) {
            logger.warn('Intelligence service not ready, skipping analysis');
            if (eventLogger) {
                await eventLogger.info('Skipped', 'AI Analysis skipped: SDK not configured.', undefined, emailId);
            }
            return null;
        }

        const { provider, model } = await SDKService.resolveChatProvider({});

        const cleanedContent = ContentCleaner.cleanEmailBody(content).substring(0, 2500);

        const metadataSignals = [];
        if (context.metadata?.listUnsubscribe) metadataSignals.push('- Contains Unsubscribe header');
        if (context.metadata?.autoSubmitted && context.metadata.autoSubmitted !== 'no') metadataSignals.push(`- Auto-Submitted: ${context.metadata.autoSubmitted}`);
        if (context.metadata?.importance) metadataSignals.push(`- Priority: ${context.metadata.importance}`);

        const systemPrompt = `You are an AI Email Assistant. Analyze the email and return structured JSON.
Definitions for Categories: spam, newsletter, promotional, transactional, social, support, client, internal, personal, other.

Context:
- Subject: ${context.subject}
- From: ${context.sender}
${metadataSignals.join('\n')}

REQUIRED JSON STRUCTURE:
{
  "summary": "string",
  "category": "...",
  "sentiment": "Positive|Neutral|Negative",
  "is_useless": boolean,
  "suggested_actions": ["none"|"delete"|"archive"|"reply"|"flag"],
  "draft_response": "string (optional)",
  "priority": "High|Medium|Low",
  "key_points": ["string"],
  "action_items": ["string"]
}
`;

        if (eventLogger) {
            await eventLogger.info('Thinking', `Analyzing email: ${context.subject}`, {
                model,
                provider,
                content_preview: cleanedContent
            }, emailId);
        }

        try {
            const response = await sdk.llm.chat([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: cleanedContent || '[Empty body]' }
            ], { provider, model });

            const rawResponse = response.response?.content || '';
            const validated = this.parseRobustJSON<EmailAnalysis>(rawResponse, EmailAnalysisSchema);

            if (eventLogger && emailId && validated) {
                await eventLogger.analysis('Decided', emailId, {
                    ...validated,
                    _raw_response: rawResponse
                });
            }

            return validated;
        } catch (error: any) {
            logger.error('Analysis failed', error);
            if (eventLogger) await eventLogger.error('Error', error.message, emailId);
            return null;
        }
    }

    async generateDraftReply(
        originalEmail: { subject: string; sender: string; body: string },
        instructions?: string
    ): Promise<string | null> {
        const sdk = SDKService.getSDK();
        if (!sdk) return null;

        const { provider, model } = await SDKService.resolveChatProvider({});

        try {
            const response = await sdk.llm.chat([
                {
                    role: 'system',
                    content: `Generate a professional reply. ${instructions || ''}`,
                },
                {
                    role: 'user',
                    content: `From: ${originalEmail.sender}\nSubject: ${originalEmail.subject}\n\n${originalEmail.body}`,
                },
            ], { provider, model });

            return response.response?.content || null;
        } catch (error) {
            logger.error('Draft generation failed', error);
            return null;
        }
    }

    async analyzeEmailWithRules(
        content: string,
        context: EmailContext,
        compiledRulesContext: string | RuleContext[],
        eventLogger?: EventLogger,
        emailId?: string
    ): Promise<ContextAwareAnalysis | null> {
        const sdk = SDKService.getSDK();
        if (!sdk) return null;

        const { provider, model } = await SDKService.resolveChatProvider({});
        const cleanedContent = ContentCleaner.cleanEmailBody(content).substring(0, 2500);

        let rulesContext: string;
        if (typeof compiledRulesContext === 'string') {
            rulesContext = compiledRulesContext;
        } else {
            rulesContext = compiledRulesContext.map(r => `- ${r.name}: ${r.intent}`).join('\n');
        }

        const systemPrompt = `You are an AI Automation Agent. Match email against these rules:\n${rulesContext}\n\nReturn JSON with matched_rule, actions_to_execute, and draft_content.`;

        if (eventLogger) {
            await eventLogger.info('Thinking', `Context-aware analysis: ${context.subject}`, { model, provider }, emailId);
        }

        try {
            const response = await sdk.llm.chat([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: cleanedContent || '[Empty body]' }
            ], { provider, model });

            const rawResponse = response.response?.content || '';
            const validated = this.parseRobustJSON<ContextAwareAnalysis>(rawResponse, ContextAwareAnalysisSchema);

            if (eventLogger && emailId && validated) {
                await eventLogger.analysis('Decided', emailId, {
                    ...validated,
                    _raw_response: rawResponse
                });
            }

            return validated;
        } catch (error: any) {
            logger.error('Rule analysis failed', error);
            if (eventLogger) await eventLogger.error('Error', error.message, emailId);
            return null;
        }
    }

    async testConnection(): Promise<{ success: boolean; message: string }> {
        const sdk = SDKService.getSDK();
        if (!sdk) return { success: false, message: 'SDK not linked' };

        try {
            const { provider, model } = await SDKService.resolveChatProvider({});
            await sdk.llm.chat([{ role: 'user', content: 'Say OK' }], { provider, model });
            return { success: true, message: `Connected to ${provider}/${model}` };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    private parseRobustJSON<T>(input: string, schema: z.ZodSchema<T>): T | null {
        try {
            const jsonMatch = input.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : input;
            const cleaned = jsonStr.replace(/<\|[\s\S]*?\|>/g, '').replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleaned);
            return schema.parse(parsed);
        } catch (e) {
            return null;
        }
    }
}

let defaultInstance: IntelligenceService | null = null;

export function getIntelligenceService(overrides?: any): IntelligenceService {
    if (!defaultInstance) {
        defaultInstance = new IntelligenceService();
    }
    return defaultInstance;
}
