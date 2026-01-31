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

    async analyzeEmail(content: string, context: EmailContext, eventLogger?: EventLogger, emailId?: string, llmSettings?: { llm_provider?: string; llm_model?: string }): Promise<(EmailAnalysis & { _metadata?: any }) | null> {
        const sdk = SDKService.getSDK();
        if (!sdk) {
            logger.warn('Intelligence service not ready, skipping analysis');
            if (eventLogger) {
                await eventLogger.info('Skipped', 'AI Analysis skipped: SDK not configured.', undefined, emailId);
            }
            return null;
        }

        const { provider, model, isDefaultFallback } = await SDKService.resolveChatProvider({
            llm_provider: llmSettings?.llm_provider,
            llm_model: llmSettings?.llm_model
        });

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
                provider: `${provider}/${model}`,
                is_fallback: isDefaultFallback,
                signals: metadataSignals,
                content_preview: cleanedContent.substring(0, 100) + '...'
            }, emailId);
        }

        try {
            const response = await sdk.llm.chat([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: cleanedContent || '[Empty body]' }
            ], { provider, model });

            // Check if SDK call failed
            if (!response.success || response.error) {
                const errorMsg = response.error || 'Unknown SDK error';
                logger.error('SDK chat failed for email analysis', {
                    provider,
                    model,
                    error: errorMsg,
                    code: response.code
                });
                if (eventLogger) await eventLogger.error('SDK Error', `${errorMsg} (${provider}/${model})`, emailId);
                return null;
            }

            const rawResponse = response.response?.content || '';
            if (!rawResponse) {
                logger.warn('SDK returned empty response for analysis', { provider, model });
                if (eventLogger) await eventLogger.error('Empty Response', `LLM (${provider}/${model}) returned no content`, emailId);
                return null;
            }

            const validated = this.parseRobustJSON<EmailAnalysis>(rawResponse, EmailAnalysisSchema, eventLogger, emailId);

            const result = validated ? {
                ...validated,
                _metadata: {
                    provider,
                    model,
                    is_fallback: isDefaultFallback,
                    timestamp: new Date().toISOString()
                }
            } : null;

            if (eventLogger && emailId && result) {
                await eventLogger.analysis('Decided', emailId, {
                    ...result,
                    _raw_response: rawResponse
                });
            } else if (eventLogger && !result) {
                await eventLogger.error('Malformed Response', {
                    message: 'AI returned data that did not match the required schema',
                    raw_response: rawResponse.substring(0, 500)
                }, emailId);
            }

            return result;
        } catch (error: any) {
            logger.error('Analysis failed', error);
            if (eventLogger) await eventLogger.error('Error', error.message, emailId);
            return null;
        }
    }

    async generateDraftReply(
        originalEmail: { subject: string; sender: string; body: string },
        instructions?: string,
        llmSettings?: { llm_provider?: string; llm_model?: string }
    ): Promise<string | null> {
        const sdk = SDKService.getSDK();
        if (!sdk) return null;

        const { provider, model } = await SDKService.resolveChatProvider({
            llm_provider: llmSettings?.llm_provider,
            llm_model: llmSettings?.llm_model
        });

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

            // Check if SDK call failed
            if (!response.success || response.error) {
                logger.error('SDK chat failed for draft generation', {
                    provider,
                    model,
                    error: response.error,
                    code: response.code
                });
                return null;
            }

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
        emailId?: string,
        llmSettings?: { llm_provider?: string; llm_model?: string }
    ): Promise<(ContextAwareAnalysis & { _metadata?: any }) | null> {
        const sdk = SDKService.getSDK();
        if (!sdk) return null;

        const { provider, model, isDefaultFallback } = await SDKService.resolveChatProvider({
            llm_provider: llmSettings?.llm_provider,
            llm_model: llmSettings?.llm_model
        });
        const cleanedContent = ContentCleaner.cleanEmailBody(content).substring(0, 2500);

        let rulesContext: string;
        if (typeof compiledRulesContext === 'string') {
            rulesContext = compiledRulesContext;
        } else {
            rulesContext = compiledRulesContext.map(r => `- ${r.name}: ${r.intent}`).join('\n');
        }

        const systemPrompt = `You are an AI Automation Agent. Analyze the email and match it against the user's rules.

Rules Context:
${rulesContext}

REQUIRED JSON STRUCTURE:
{
  "summary": "A brief summary of the email content",
  "category": "spam|newsletter|promotional|transactional|social|support|client|internal|personal|other",
  "priority": "High|Medium|Low",
  "matched_rule": {
    "rule_id": "string or null",
    "rule_name": "string or null",
    "confidence": 0.0 to 1.0,
    "reasoning": "Brief explanation"
  },
  "actions_to_execute": ["none"|"delete"|"archive"|"draft"|"read"|"star"],
  "draft_content": "Suggested reply if drafting, otherwise null"
}

IMPORTANT:
- Use "draft" action only if a rule explicitly requests it or if it's very clear a reply is needed.
- Categorize accurately.
- Confidence 0.7+ is required for automatic execution.`;

        if (eventLogger) {
            await eventLogger.info('Thinking', `Context-aware analysis: ${context.subject}`, {
                provider: `${provider}/${model}`,
                is_fallback: isDefaultFallback,
                rules_count: Array.isArray(compiledRulesContext) ? compiledRulesContext.length : 'compiled'
            }, emailId);
        }

        try {
            logger.debug('Calling SDK chat for rule analysis', { provider, model, promptLength: systemPrompt.length });
            const response = await sdk.llm.chat([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: cleanedContent || '[Empty body]' }
            ], { provider, model });

            // Check if SDK call failed
            if (!response.success || response.error) {
                const errorMsg = response.error || 'Unknown SDK error';
                logger.error('SDK chat failed for rule analysis', {
                    provider,
                    model,
                    error: errorMsg,
                    code: response.code
                });
                if (eventLogger) await eventLogger.error('SDK Error', `${errorMsg} (${provider}/${model})`, emailId);
                return null;
            }

            const rawResponse = response.response?.content || '';
            if (!rawResponse) {
                logger.warn('SDK returned empty response for rule analysis', {
                    provider,
                    model,
                    success: response.success
                });
                if (eventLogger) await eventLogger.error('Empty Response', `LLM (${provider}/${model}) returned no content`, emailId);
                return null;
            }

            const validated = this.parseRobustJSON<ContextAwareAnalysis>(rawResponse, ContextAwareAnalysisSchema, eventLogger, emailId);

            const result = validated ? {
                ...validated,
                _metadata: {
                    provider,
                    model,
                    is_fallback: isDefaultFallback,
                    timestamp: new Date().toISOString()
                }
            } : null;

            if (eventLogger && emailId && result) {
                await eventLogger.analysis('Decided', emailId, {
                    ...result,
                    _raw_response: rawResponse
                });
            } else if (eventLogger && !result) {
                await eventLogger.error('Malformed Response', {
                    message: 'AI returned rule analysis that did not match the required schema',
                    raw_response: rawResponse.substring(0, 500)
                }, emailId);
            }

            return result;
        } catch (error: any) {
            logger.error('Rule analysis failed', {
                error: error.message,
                stack: error.stack,
                provider,
                model,
                errorType: error.constructor.name
            });
            if (eventLogger) await eventLogger.error('Error', `${error.message} (${provider}/${model})`, emailId);
            return null;
        }
    }

    async testConnection(overrides?: { provider?: string; model?: string }): Promise<{ success: boolean; message: string }> {
        const sdk = SDKService.getSDK();
        if (!sdk) return { success: false, message: 'SDK not linked' };

        try {
            const { provider, model } = await SDKService.resolveChatProvider({
                llm_provider: overrides?.provider,
                llm_model: overrides?.model
            });
            await sdk.llm.chat([{ role: 'user', content: 'Say OK' }], { provider, model });
            return { success: true, message: `Connected to ${provider}/${model}` };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    private parseRobustJSON<T>(input: string, schema: z.ZodSchema<T>, eventLogger?: EventLogger, emailId?: string): T | null {
        try {
            // 1. Remove common LLM artifacts and markdown blocks
            let cleaned = input.trim();

            // Handle markdown blocks
            if (cleaned.includes('```json')) {
                cleaned = cleaned.split('```json')[1].split('```')[0].trim();
            } else if (cleaned.includes('```')) {
                cleaned = cleaned.split('```')[1].split('```')[0].trim();
            }

            // 2. Extract the first { ... } block if visible
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                cleaned = jsonMatch[0];
            }

            // 3. Strip aggressive local LLM tokens
            cleaned = cleaned.replace(/<\|[\s\S]*?\|>/g, '').trim();

            // 4. Parse and Normalize
            const parsed = JSON.parse(cleaned);

            // Normalize actions_to_execute: convert string to array if needed
            if (parsed && typeof parsed === 'object' && 'actions_to_execute' in parsed) {
                if (typeof parsed.actions_to_execute === 'string') {
                    parsed.actions_to_execute = [parsed.actions_to_execute];
                    logger.debug('Normalized actions_to_execute from string to array', { original: parsed.actions_to_execute[0] });
                }
            }

            // 5. Validate with Zod
            return schema.parse(parsed);
        } catch (e: any) {
            logger.error('JSON Robust Parsing failed', { error: e.message, input: input.substring(0, 200) });
            if (eventLogger && emailId) {
                eventLogger.error('JSON Parse Error', {
                    error: e.message,
                    raw_input_preview: input.substring(0, 500)
                }, emailId).catch(() => { });
            }
            return null;
        }
    }
}

let defaultInstance: IntelligenceService | null = null;

export function getIntelligenceService(): IntelligenceService {
    if (!defaultInstance) {
        defaultInstance = new IntelligenceService();
    }
    return defaultInstance;
}
