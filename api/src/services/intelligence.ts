import { z } from 'zod';
import { createLogger } from '../utils/logger.js';
import { EventLogger } from './eventLogger.js';
import { ContentCleaner } from '../utils/contentCleaner.js';
import { SDKService } from './SDKService.js';

const logger = createLogger('Intelligence');

// Define the schema for email analysis
export const EmailAnalysisSchema = z.object({
    summary: z.string().describe('A brief summary of the email content'),
    category: z.enum(['spam', 'newsletter', 'news', 'promotional', 'transactional', 'social', 'support', 'client', 'internal', 'personal', 'other'])
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
    language: z.string().optional()
        .describe('The primary language of the email (e.g., "English", "Vietnamese", "Japanese", "Spanish")'),
});

export type EmailAnalysis = z.infer<typeof EmailAnalysisSchema>;

// Context-Aware Analysis Schema - AI evaluates email against user's rules
export const ContextAwareAnalysisSchema = z.object({
    summary: z.string().describe('A brief summary of the email content'),
    category: z.enum(['spam', 'newsletter', 'news', 'promotional', 'transactional', 'social', 'support', 'client', 'internal', 'personal', 'other'])
        .describe('The category of the email'),
    sentiment: z.enum(['Positive', 'Neutral', 'Negative']).optional()
        .describe('The emotional tone of the email'),
    priority: z.enum(['High', 'Medium', 'Low'])
        .describe('The urgency of the email'),
    key_points: z.array(z.string()).optional()
        .describe('Key points extracted from the email'),
    language: z.string().optional()
        .describe('The primary language of the email (e.g., "English", "Vietnamese", "Japanese")'),

    matched_rules: z.array(z.object({
        rule_id: z.string().describe('ID of the matched rule'),
        rule_name: z.string().describe('Name of the matched rule'),
        confidence: z.number().min(0).max(1).describe('Confidence score for the match (0-1)'),
        reasoning: z.string().describe('Brief explanation of why this rule matched'),
    })).describe('All rules that apply to this email (can be multiple)'),

    actions_to_execute: z.array(z.enum(['none', 'delete', 'archive', 'draft', 'star']))
        .describe('Actions to execute after conflict resolution'),

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

CATEGORY DEFINITIONS:
- spam: Unwanted/unsolicited bulk email, phishing attempts
- newsletter: Recurring subscription content (weekly digests, company updates) - check for List-Unsubscribe
- news: Breaking news alerts, timely notifications (Google Alerts, news feeds)
- promotional: Marketing emails, sales offers, advertisements
- transactional: Receipts, confirmations, order updates, account notifications
- social: Social media notifications (LinkedIn, Twitter, Facebook)
- support: Customer service, help desk, support tickets
- client: Business correspondence from clients/customers (High Importance)
- internal: Company-internal communications (colleagues, HR, IT)
- personal: Personal correspondence from friends/family
- notification: Platform alerts/notifications (Github, Linear, etc) - distinct from social
- other: Anything that doesn't fit above categories

CRITICAL RULES:
1. Platform notifications (linkedin.com, github.com) are ALWAYS "notification" or "social", never "personal"
2. Emails from noreply@, no-reply@ are likely "transactional" or "notification"
3. Weekly/Monthly digests are "newsletter"
4. If "List-Unsubscribe" header is present, it is likely "newsletter" or "promotional"

FEW-SHOT EXAMPLES:

Example 1: LinkedIn Connection
Subject: Canh Le wants to connect
From: messages-noreply@linkedin.com
Signals: [List-Unsubscribe]
-> { "category": "social", "is_useless": true, "priority": "Low", "suggested_actions": ["archive"] }

Example 2: Cold Sales
Subject: Boost your productivity
From: sales@unknown-vendor.com
-> { "category": "spam", "is_useless": true, "priority": "Low", "suggested_actions": ["delete"] }

Example 3: Client Question
Subject: Question about the contract
From: client@valued-customer.com
-> { "category": "client", "priority": "High", "is_useless": false, "suggested_actions": ["reply", "flag"] }

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
        llmSettings?: { llm_provider?: string; llm_model?: string },
        richContext?: {
            // User/Account metadata
            myEmail?: string;
            myName?: string;
            myRole?: string;
            myCompany?: string;
            myIndustry?: string;
            workStyle?: 'corporate' | 'startup' | 'creative' | 'academic';
            communicationStyle?: {
                tone?: string;
                length?: string;
                signature?: string;
                commonPhrases?: string[];
            };
            primaryGoal?: string;

            // Email analysis metadata
            category?: string;
            sentiment?: string;
            priority?: string;
            keyPoints?: string[];
            language?: string;

            // Sender metadata
            senderEmail?: string;
            senderName?: string;
            receivedDate?: Date;
        }
    ): Promise<string | null> {
        const sdk = SDKService.getSDK();
        if (!sdk) return null;

        const { provider, model } = await SDKService.resolveChatProvider({
            llm_provider: llmSettings?.llm_provider,
            llm_model: llmSettings?.llm_model
        });

        try {
            // Build rich system prompt with context
            let systemPrompt = 'You are an AI email assistant drafting a professional reply.';

            if (richContext?.myEmail) {
                systemPrompt += `\n\nYou are responding on behalf of ${richContext.myName || 'the user'} (${richContext.myEmail})`;
                if (richContext.myRole) {
                    systemPrompt += `, a ${richContext.myRole}`;
                }
                if (richContext.myCompany) {
                    systemPrompt += ` at ${richContext.myCompany}`;
                }
                if (richContext.myIndustry) {
                    systemPrompt += ` (${richContext.myIndustry} industry)`;
                }
                systemPrompt += '.';
            }

            if (richContext?.category) {
                systemPrompt += `\n\nThis is a ${richContext.category} email`;
                if (richContext.sentiment) {
                    systemPrompt += ` with a ${richContext.sentiment.toLowerCase()} tone`;
                }
                if (richContext.priority) {
                    systemPrompt += ` (priority: ${richContext.priority.toLowerCase()})`;
                }
                systemPrompt += '.';
            }

            if (instructions) {
                systemPrompt += `\n\nYOUR SPECIFIC TASK: ${instructions}`;
            }

            // Language handling - CRITICAL for multi-language support
            if (richContext?.language) {
                systemPrompt += `\n\nIMPORTANT: The incoming email is written in ${richContext.language}. You MUST write your reply in ${richContext.language}. Maintain appropriate formality and cultural conventions for ${richContext.language}.`;
            }

            // Add persona-specific instructions
            if (richContext?.workStyle) {
                const styles = {
                    corporate: "Maintain a formal, structured, and polite tone.",
                    startup: "Be direct, concise, and action-oriented. Avoid fluff.",
                    creative: "Be expressive, flexible, and approachable.",
                    academic: "Be thorough, precise, and formal."
                };
                systemPrompt += `\nYour work style is: ${richContext.workStyle}. ${styles[richContext.workStyle as keyof typeof styles] || ''}`;
            }

            // Communication Preferences
            if (richContext?.communicationStyle) {
                const { tone, length, commonPhrases } = richContext.communicationStyle;

                if (tone) systemPrompt += `\nPreferred Tone: ${tone}.`;

                if (length) {
                    const lengths = {
                        brief: "Keep the reply very short (1-2 sentences).",
                        medium: "Keep the reply distinct and focused (2-3 paragraphs max).",
                        detailed: "Provide a comprehensive and detailed response."
                    };
                    systemPrompt += `\nResponse Length: ${lengths[length as keyof typeof lengths] || 'Medium'}.`;
                }

                if (commonPhrases && commonPhrases.length > 0) {
                    systemPrompt += `\nincorporate these phrases if natural: ${commonPhrases.join(', ')}.`;
                }
            }

            // Goal Alignment
            if (richContext?.primaryGoal) {
                const goals = {
                    inbox_zero: "Goal: Clear the inbox. Resolve efficiently.",
                    respond_faster: "Goal: Quick acknowledgment or resolution.",
                    focus: "Goal: Protect user's time. Defer low-priority items.",
                    reduce_time: "Goal: Minimal user editing required. Draft ready-to-send."
                };
                systemPrompt += `\n${goals[richContext.primaryGoal as keyof typeof goals] || ''}`;
            }

            systemPrompt += '\n\nWrite ONLY the email body (no subject line). Match the tone of the incoming email unless overridden by preferences.';
            systemPrompt += '\n\nSTYLE GUIDELINES:';
            systemPrompt += '\n- Start directly (e.g., "Thanks for the update" or "Hi [Name],")';
            systemPrompt += '\n- NEVER use robotic phrases like "I hope this email finds you well" or "I am writing to you today"';
            systemPrompt += '\n- Avoid "Please let me know if you have any questions" unless necessary - just say "Let me know if you need anything else"';
            systemPrompt += '\n- Keep it under 150 words unless detail is explicitly requested';
            systemPrompt += '\n- Use active voice';

            // Build user message with email context
            let userMessage = '';

            if (richContext?.senderEmail || richContext?.senderName) {
                userMessage += `INCOMING EMAIL:\n`;
                userMessage += `From: ${richContext.senderName || originalEmail.sender}`;
                if (richContext.senderEmail && richContext.senderEmail !== originalEmail.sender) {
                    userMessage += ` <${richContext.senderEmail}>`;
                }
                userMessage += '\n';
                if (richContext.receivedDate) {
                    userMessage += `Received: ${richContext.receivedDate.toLocaleString()}\n`;
                }
            }

            userMessage += `Subject: ${originalEmail.subject}\n\n`;

            if (richContext?.keyPoints && richContext.keyPoints.length > 0) {
                userMessage += `KEY POINTS:\n${richContext.keyPoints.map(p => `• ${p}`).join('\n')}\n\n`;
            }

            userMessage += `FULL MESSAGE:\n${originalEmail.body}`;

            const response = await sdk.llm.chat([
                {
                    role: 'system',
                    content: systemPrompt,
                },
                {
                    role: 'user',
                    content: userMessage,
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

        const systemPrompt = `You are an AI Automation Agent. Analyze the email and identify ALL rules that apply.

CATEGORY DEFINITIONS:
- spam: Unwanted/unsolicited bulk email, phishing attempts
- newsletter: Recurring subscription content (weekly digests, company updates) - check for List-Unsubscribe
- news: Breaking news alerts, timely notifications (Google Alerts, news feeds)
- promotional: Marketing emails, sales offers, advertisements
- transactional: Receipts, confirmations, order updates, account notifications
- social: Social media notifications (LinkedIn, Twitter, Facebook)
- support: Customer service, help desk, support tickets
- client: Business correspondence from clients/customers (High Importance)
- internal: Company-internal communications (colleagues, HR, IT)
- personal: Personal correspondence from friends/family
- notification: Platform alerts/notifications (Github, Linear, etc) - distinct from social
- other: Anything that doesn't fit above categories

Rules Context:
${rulesContext}

REQUIRED JSON STRUCTURE:
{
  "summary": "A brief summary of the email content",
  "category": "spam|newsletter|news|promotional|transactional|social|support|client|internal|personal|notification|other",
  "priority": "High|Medium|Low",
  "matched_rules": [
    {
      "rule_id": "string",
      "rule_name": "string",
      "confidence": 0.0 to 1.0,
      "reasoning": "Brief explanation"
    }
  ],
  "actions_to_execute": ["none"|"delete"|"archive"|"draft"|"star"],
  "draft_content": "Suggested reply if drafting, otherwise null"
}

CRITICAL INSTRUCTIONS:
- Identify ALL rules that apply to this email (not just the best one)
- Return an empty array if no rules match
- Only include rules with confidence >= 0.7
- For each matched rule, explain why it applies
- Actions will be merged by the system - you don't need to resolve conflicts
- Use "draft" action only if a rule explicitly requests it
- Platform notifications (linkedin, github) are ALWAYS "notification" or "social"
- Emails from noreply@ are likely "transactional" or "notification"`;

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
