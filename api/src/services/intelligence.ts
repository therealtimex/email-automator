import { z } from 'zod';
import { createLogger } from '../utils/logger.js';
import { EventLogger } from './eventLogger.js';
import { ContentCleaner } from '../utils/contentCleaner.js';
import { SDKService } from './SDKService.js';

const logger = createLogger('Intelligence');

// Define the schema for email analysis
export const EmailAnalysisSchema = z.object({
    summary: z.string().describe('A brief summary of the email content'),
    category: z.enum(['spam', 'newsletter', 'news', 'promotional', 'transactional', 'social', 'support', 'client', 'internal', 'personal', 'notification', 'other'])
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
    category: z.enum(['spam', 'newsletter', 'news', 'promotional', 'transactional', 'social', 'support', 'client', 'internal', 'personal', 'notification', 'other'])
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
        // Original metadata fields (deprecated but kept for compatibility)
        importance?: string;
        listUnsubscribe?: string;
        autoSubmitted?: string;
        mailer?: string;
        // Enhanced header metadata for better LLM analysis
        recipient_type?: 'to' | 'cc' | 'bcc';
        is_automated?: boolean;
        has_unsubscribe?: boolean;
        is_reply?: boolean;
        sender_priority?: 'high' | 'normal' | 'low';
        thread_id?: string;
    };
    userPreferences?: {
        autoTrashSpam?: boolean;
        smartDrafts?: boolean;
        categoryPatterns?: Record<string, string>;
        vipSenders?: string[];
        preferredLength?: number;
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

    /**
     * Fallback analysis using simple heuristics when LLM fails
     */
    private createFallbackAnalysis(context: EmailContext, content: string): EmailAnalysis {
        const sender = context.sender.toLowerCase();
        const subject = context.subject?.toLowerCase() || '';
        const body = content.toLowerCase();

        // Simple heuristic categorization
        let category: any = 'other';
        let is_useless = false;

        if (sender.includes('noreply') || sender.includes('no-reply')) {
            if (body.includes('unsubscribe')) category = 'newsletter';
            else category = 'notification';
            is_useless = true;
        } else if (body.includes('receipt') || body.includes('order') || body.includes('invoice')) {
            category = 'transactional';
        } else if (body.includes('unsubscribe') || subject.includes('newsletter')) {
            category = 'newsletter';
            is_useless = true;
        } else if (sender.includes('linkedin') || sender.includes('twitter') || sender.includes('facebook')) {
            category = 'social';
            is_useless = true;
        }

        return {
            summary: subject || 'Email received',
            category,
            sentiment: 'Neutral',
            is_useless,
            suggested_actions: is_useless ? ['archive'] : [],
            priority: 'Medium',
            key_points: [],
            action_items: []
        };
    }

    async analyzeEmail(content: string, context: EmailContext, eventLogger?: EventLogger, emailId?: string, llmSettings?: { llm_provider?: string; llm_model?: string }): Promise<(EmailAnalysis & { _metadata?: any }) | null> {
        const sdk = SDKService.getSDK();
        if (!sdk) {
            logger.warn('Intelligence service not ready, using fallback analysis');
            if (eventLogger) {
                await eventLogger.info('Fallback', 'AI Analysis skipped: SDK not configured. Using heuristic analysis.', undefined, emailId);
            }
            return this.createFallbackAnalysis(context, content);
        }

        const { provider, model, isDefaultFallback } = await SDKService.resolveChatProvider({
            llm_provider: llmSettings?.llm_provider,
            llm_model: llmSettings?.llm_model
        });

        const cleanedContent = ContentCleaner.cleanEmailBody(content).substring(0, 2500);

        const metadataSignals = [];
        // Header-based signals (enhanced)
        if (context.metadata?.recipient_type === 'cc') metadataSignals.push('- Recipient: CC (not directly addressed)');
        if (context.metadata?.recipient_type === 'bcc') metadataSignals.push('- Recipient: BCC (bulk/mass email)');
        if (context.metadata?.is_automated) metadataSignals.push('- Automated/Bulk email detected (List-Unsubscribe or Precedence:bulk)');
        if (context.metadata?.has_unsubscribe) metadataSignals.push('- Contains Unsubscribe header (likely newsletter/marketing)');
        if (context.metadata?.is_reply) metadataSignals.push('- Part of reply thread (ongoing conversation)');
        if (context.metadata?.sender_priority === 'high') metadataSignals.push('- Sender Priority: HIGH (marked as urgent)');
        if (context.metadata?.sender_priority === 'low') metadataSignals.push('- Sender Priority: LOW');
        if (context.metadata?.mailer) metadataSignals.push(`- Sent via: ${context.metadata.mailer}`);
        // Legacy metadata (deprecated but kept for compatibility)
        if (context.metadata?.listUnsubscribe && !context.metadata?.has_unsubscribe) metadataSignals.push('- Contains Unsubscribe header');
        if (context.metadata?.autoSubmitted && context.metadata.autoSubmitted !== 'no') metadataSignals.push(`- Auto-Submitted: ${context.metadata.autoSubmitted}`);
        if (context.metadata?.importance) metadataSignals.push(`- Priority: ${context.metadata.importance}`);

        // Adaptive Learning Signals
        if (context.userPreferences?.vipSenders?.includes(context.sender)) {
            metadataSignals.push('- SENDER IS VIP (High Priority Required)');
        }

        const senderDomain = context.sender.split('@')[1];
        if (senderDomain && context.userPreferences?.categoryPatterns?.[senderDomain]) {
            const learnedCategory = context.userPreferences.categoryPatterns[senderDomain];
            metadataSignals.push(`- LEARNED PATTERN: Sender domain '${senderDomain}' is strictly category '${learnedCategory}'`);
        }

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
2. Automated sender addresses (noreply@, no-reply@, donotreply@, alerts@, notifications@, updates@, newsletter@, etc.) are ALWAYS "transactional", "notification", or "newsletter" - NEVER "personal"
3. Weekly/Monthly digests are "newsletter"
4. If "List-Unsubscribe" header is present, it is likely "newsletter" or "promotional"
5. Follow "LEARNED PATTERN" signals strictly if present
6. VIP Senders must be "High" priority unless irrelevant (e.g. OOO auto-reply)
7. Google Alerts (googlealerts-noreply@google.com) are ALWAYS "news" category, NEVER "personal" or "promotional"

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
                logger.error('SDK chat failed for email analysis, using fallback', {
                    provider,
                    model,
                    error: errorMsg,
                    code: response.code
                });
                if (eventLogger) {
                    await eventLogger.error('SDK Error', `${errorMsg} (${provider}/${model})`, emailId);
                    await eventLogger.info('Fallback', 'Using heuristic analysis due to SDK error', undefined, emailId);
                }
                return this.createFallbackAnalysis(context, cleanedContent);
            }

            const rawResponse = response.response?.content || '';
            if (!rawResponse) {
                logger.warn('SDK returned empty response for analysis, using fallback', { provider, model });
                if (eventLogger) {
                    await eventLogger.error('Empty Response', `LLM (${provider}/${model}) returned no content`, emailId);
                    await eventLogger.info('Fallback', 'Using heuristic analysis due to empty response', undefined, emailId);
                }
                return this.createFallbackAnalysis(context, cleanedContent);
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
                // Clean raw response for logging (remove markdown code fences)
                let cleanedRawResponse = rawResponse.trim();
                if (cleanedRawResponse.includes('```json')) {
                    cleanedRawResponse = cleanedRawResponse.split('```json')[1].split('```')[0].trim();
                } else if (cleanedRawResponse.includes('```')) {
                    cleanedRawResponse = cleanedRawResponse.split('```')[1].split('```')[0].trim();
                }

                await eventLogger.analysis('Decided', emailId, {
                    ...result,
                    system_prompt: systemPrompt,
                    content_preview: cleanedContent?.substring(0, 500) || '[Empty]',
                    _raw_response: cleanedRawResponse
                });
            } else if (eventLogger && !result) {
                await eventLogger.error('Malformed Response', {
                    message: 'AI returned data that did not match the required schema',
                    raw_response: rawResponse.substring(0, 500),
                    system_prompt: systemPrompt,
                    content_preview: cleanedContent?.substring(0, 500) || '[Empty]'
                }, emailId);
            }

            return result;
        } catch (error: any) {
            logger.error('Analysis failed, using fallback', error);
            if (eventLogger) {
                await eventLogger.error('Error', error.message, emailId);
                await eventLogger.info('Fallback', 'Using heuristic analysis due to LLM error', undefined, emailId);
            }
            return this.createFallbackAnalysis(context, cleanedContent || content);
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

        // Build metadata signals (same as analyzeEmail)
        const metadataSignals = [];
        // Header-based signals (enhanced)
        if (context.metadata?.recipient_type === 'cc') metadataSignals.push('- Recipient: CC (not directly addressed)');
        if (context.metadata?.recipient_type === 'bcc') metadataSignals.push('- Recipient: BCC (bulk/mass email)');
        if (context.metadata?.is_automated) metadataSignals.push('- Automated/Bulk email detected (likely newsletter/marketing)');
        if (context.metadata?.has_unsubscribe) metadataSignals.push('- Contains Unsubscribe header (newsletter indicator)');
        if (context.metadata?.is_reply) metadataSignals.push('- Part of reply thread (ongoing conversation)');
        if (context.metadata?.sender_priority === 'high') metadataSignals.push('- Sender Priority: HIGH (marked as urgent)');
        if (context.metadata?.sender_priority === 'low') metadataSignals.push('- Sender Priority: LOW');
        if (context.metadata?.mailer) metadataSignals.push(`- Sent via: ${context.metadata.mailer}`);
        // Legacy metadata (deprecated but kept for compatibility)
        if (context.metadata?.listUnsubscribe && !context.metadata?.has_unsubscribe) metadataSignals.push('- Contains Unsubscribe header');
        if (context.metadata?.autoSubmitted && context.metadata.autoSubmitted !== 'no') metadataSignals.push(`- Auto-Submitted: ${context.metadata.autoSubmitted}`);
        if (context.metadata?.importance) metadataSignals.push(`- Priority: ${context.metadata.importance}`);

        // Adaptive Learning Signals
        if (context.userPreferences?.vipSenders?.includes(context.sender)) {
            metadataSignals.push('- SENDER IS VIP (High Priority Required)');
        }

        const senderDomain = context.sender.split('@')[1];
        if (senderDomain && context.userPreferences?.categoryPatterns?.[senderDomain]) {
            const learnedCategory = context.userPreferences.categoryPatterns[senderDomain];
            metadataSignals.push(`- LEARNED PATTERN: Sender domain '${senderDomain}' is strictly category '${learnedCategory}'`);
        }

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

Email Context:
- Subject: ${context.subject}
- From: ${context.sender}
${metadataSignals.join('\n')}

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
- Automated sender addresses (noreply@, no-reply@, donotreply@, alerts@, notifications@, updates@, newsletter@, etc.) are ALWAYS "transactional", "notification", or "newsletter" - NEVER "personal"
- Google Alerts (googlealerts-noreply@google.com) are ALWAYS "news" category`;

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
                logger.error('SDK chat failed for rule analysis, using fallback', {
                    provider,
                    model,
                    error: errorMsg,
                    code: response.code
                });
                if (eventLogger) {
                    await eventLogger.error('SDK Error', `${errorMsg} (${provider}/${model})`, emailId);
                    await eventLogger.info('Fallback', 'Using heuristic analysis due to SDK error', undefined, emailId);
                }
                // Return fallback analysis wrapped in ContextAwareAnalysis structure
                const fallbackAnalysis = this.createFallbackAnalysis(context, cleanedContent);
                const actions = fallbackAnalysis.suggested_actions?.includes('archive') ? ['archive' as const] : [];
                return {
                    ...fallbackAnalysis,
                    matched_rules: [],
                    actions_to_execute: actions,
                    _metadata: {
                        provider,
                        model,
                        is_fallback: true,
                        timestamp: new Date().toISOString()
                    }
                };
            }

            const rawResponse = response.response?.content || '';
            if (!rawResponse) {
                logger.warn('SDK returned empty response for rule analysis, using fallback', {
                    provider,
                    model,
                    success: response.success
                });
                if (eventLogger) {
                    await eventLogger.error('Empty Response', `LLM (${provider}/${model}) returned no content`, emailId);
                    await eventLogger.info('Fallback', 'Using heuristic analysis due to empty response', undefined, emailId);
                }
                // Return fallback analysis wrapped in ContextAwareAnalysis structure
                const fallbackAnalysis = this.createFallbackAnalysis(context, cleanedContent);
                const actions = fallbackAnalysis.suggested_actions?.includes('archive') ? ['archive' as const] : [];
                return {
                    ...fallbackAnalysis,
                    matched_rules: [],
                    actions_to_execute: actions,
                    _metadata: {
                        provider,
                        model,
                        is_fallback: true,
                        timestamp: new Date().toISOString()
                    }
                };
            }

            const validated = this.parseRobustJSON<ContextAwareAnalysis>(rawResponse, ContextAwareAnalysisSchema, eventLogger, emailId);

            if (!validated) {
                // JSON parsing failed - use fallback
                logger.warn('JSON parsing failed for rule analysis, using fallback', { provider, model });
                if (eventLogger) {
                    await eventLogger.error('Malformed Response', {
                        message: 'AI returned rule analysis that did not match the required schema',
                        raw_response: rawResponse.substring(0, 500),
                        system_prompt: systemPrompt,
                        content_preview: cleanedContent?.substring(0, 500) || '[Empty]'
                    }, emailId);
                    await eventLogger.info('Fallback', 'Using heuristic analysis due to malformed response', undefined, emailId);
                }
                const fallbackAnalysis = this.createFallbackAnalysis(context, cleanedContent);
                const actions = fallbackAnalysis.suggested_actions?.includes('archive') ? ['archive' as const] : [];
                return {
                    ...fallbackAnalysis,
                    matched_rules: [],
                    actions_to_execute: actions,
                    _metadata: {
                        provider,
                        model,
                        is_fallback: true,
                        timestamp: new Date().toISOString()
                    }
                };
            }

            const result = {
                ...validated,
                _metadata: {
                    provider,
                    model,
                    is_fallback: isDefaultFallback,
                    timestamp: new Date().toISOString()
                }
            };

            if (eventLogger && emailId) {
                // Clean raw response for logging (remove markdown code fences)
                let cleanedRawResponse = rawResponse.trim();
                if (cleanedRawResponse.includes('```json')) {
                    cleanedRawResponse = cleanedRawResponse.split('```json')[1].split('```')[0].trim();
                } else if (cleanedRawResponse.includes('```')) {
                    cleanedRawResponse = cleanedRawResponse.split('```')[1].split('```')[0].trim();
                }

                await eventLogger.analysis('Decided', emailId, {
                    ...result,
                    system_prompt: systemPrompt,
                    content_preview: cleanedContent?.substring(0, 500) || '[Empty]',
                    _raw_response: cleanedRawResponse
                });
            }

            return result;
        } catch (error: any) {
            logger.error('Rule analysis failed, using fallback', {
                error: error.message,
                stack: error.stack,
                provider,
                model,
                errorType: error.constructor.name
            });
            if (eventLogger) {
                await eventLogger.error('Error', `${error.message} (${provider}/${model})`, emailId);
                await eventLogger.info('Fallback', 'Using heuristic analysis due to LLM error', undefined, emailId);
            }

            // Create fallback analysis with no rule matches
            const basicAnalysis = this.createFallbackAnalysis(context, cleanedContent || '');
            // Convert actions to ContextAwareAnalysis format
            const actions = basicAnalysis.suggested_actions?.includes('archive') ? ['archive' as const] : [];
            return {
                ...basicAnalysis,
                matched_rules: [],
                actions_to_execute: actions,
                _metadata: {
                    provider: 'fallback',
                    model: 'heuristic',
                    is_fallback: true,
                    timestamp: new Date().toISOString()
                }
            };
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
            const firstAttempt = schema.safeParse(parsed);
            if (firstAttempt.success) return firstAttempt.data;

            // 6. Coerce invalid enum values and retry before giving up
            const coerced = this.coerceEnumErrors(parsed, firstAttempt.error);
            if (coerced) {
                logger.debug('Coerced enum values in LLM response', { coercions: coerced.log });
                if (eventLogger && emailId) {
                    eventLogger.info('Coerced', `Auto-corrected: ${coerced.log.join(', ')}`, {}, emailId).catch(() => {});
                }
                const retry = schema.safeParse(coerced.data);
                if (retry.success) return retry.data;
            }

            // Still failing after coercion — throw original error for the catch block
            throw firstAttempt.error;
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

    /**
     * Extracts invalid_enum_value issues from a ZodError, coerces each to the
     * closest valid option, and returns the patched object + a log of what changed.
     * Returns null if there were no enum issues to fix.
     */
    private coerceEnumErrors(parsed: any, error: z.ZodError): { data: any; log: string[] } | null {
        const enumIssues = error.issues.filter(
            (i): i is z.ZodIssue & { code: 'invalid_enum_value'; options: string[]; received: string } => i.code === 'invalid_enum_value'
        );
        if (enumIssues.length === 0) return null;

        const coerced = JSON.parse(JSON.stringify(parsed)); // deep clone
        const log: string[] = [];

        for (const issue of enumIssues) {
            const options = issue.options as string[];
            const received = String(issue.received);
            const mapped = this.mapToClosestEnum(received, options);

            // Walk the path to set the coerced value (handles nested e.g. actions_to_execute[0])
            let target = coerced;
            for (let i = 0; i < issue.path.length - 1; i++) {
                target = target[issue.path[i]];
                if (target == null) break;
            }
            if (target != null && issue.path.length > 0) {
                target[issue.path[issue.path.length - 1]] = mapped;
                log.push(`${issue.path.join('.')}: "${received}" → "${mapped}"`);
            }
        }

        return log.length > 0 ? { data: coerced, log } : null;
    }

    /**
     * Maps an unexpected enum value to the closest valid option using:
     * 1. Case-insensitive exact match (e.g. "positive" → "Positive")
     * 2. Known synonym table (e.g. "marketing" → "promotional")
     * 3. Substring containment (e.g. "newsletter_digest" → "newsletter")
     * 4. Sensible field-agnostic defaults ("other", "Neutral", "Medium", "none")
     */
    private mapToClosestEnum(received: string, options: string[]): string {
        const lower = received.toLowerCase().trim();

        // 1. Case-insensitive exact match
        const exact = options.find(o => o.toLowerCase() === lower);
        if (exact) return exact;

        // 2. Known synonyms (covers common LLM drift across category + action enums)
        const synonyms: Record<string, string> = {
            // Category
            'marketing': 'promotional',
            'advertisement': 'promotional',
            'ads': 'promotional',
            'alert': 'notification',
            'alerts': 'notification',
            'automated': 'transactional',
            'receipt': 'transactional',
            'confirmation': 'transactional',
            'update': 'transactional',
            'updates': 'transactional',
            'digest': 'newsletter',
            'subscription': 'newsletter',
            'work': 'client',
            'business': 'client',
            'colleague': 'internal',
            'team': 'internal',
            'family': 'personal',
            'friends': 'personal',
            'security': 'transactional',
            'bug': 'support',
            'ticket': 'support',
            // Actions
            'trash': 'delete',
            'remove': 'delete',
            'reply': 'draft',
            'respond': 'draft',
            'mark': 'star',
            'flag': 'star',
        };
        if (synonyms[lower] && options.includes(synonyms[lower])) {
            return synonyms[lower];
        }

        // 3. Substring containment (e.g. "newsletter_digest" contains "newsletter")
        const partial = options.find(o => lower.includes(o.toLowerCase()) || o.toLowerCase().includes(lower));
        if (partial) return partial;

        // 4. Sensible defaults — pick the most neutral option available
        if (options.includes('other')) return 'other';
        if (options.includes('Neutral')) return 'Neutral';
        if (options.includes('Medium')) return 'Medium';
        if (options.includes('none')) return 'none';

        return options[options.length - 1];
    }
}

let defaultInstance: IntelligenceService | null = null;

export function getIntelligenceService(): IntelligenceService {
    if (!defaultInstance) {
        defaultInstance = new IntelligenceService();
    }
    return defaultInstance;
}
