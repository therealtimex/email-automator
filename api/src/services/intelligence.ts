import OpenAI from 'openai';
import { z } from 'zod';
import { config } from '../config/index.js';
import { createLogger } from '../utils/logger.js';
import { EventLogger } from './eventLogger.js';
import { ContentCleaner } from '../utils/contentCleaner.js';

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
    // Classification (kept for UI/logging)
    summary: z.string().describe('A brief summary of the email content'),
    category: z.enum(['spam', 'newsletter', 'promotional', 'transactional', 'social', 'support', 'client', 'internal', 'personal', 'other'])
        .describe('The category of the email'),
    priority: z.enum(['High', 'Medium', 'Low'])
        .describe('The urgency of the email'),
    
    // Rule Matching (core of context-aware engine)
    matched_rule: z.object({
        rule_id: z.string().nullable().describe('ID of the matched rule, or null if no match'),
        rule_name: z.string().nullable().describe('Name of the matched rule'),
        confidence: z.number().min(0).max(1).describe('Confidence score for the match (0-1)'),
        reasoning: z.string().describe('Explanation of why this rule was matched or why no rule matched'),
    }),
    
    // Actions to execute (derived from matched rule)
    actions_to_execute: z.array(z.enum(['none', 'delete', 'archive', 'draft', 'read', 'star']))
        .describe('Actions to execute based on the matched rule'),
    
    // Intent-aware draft content (if draft action is included)
    draft_content: z.string().optional()
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
    private client: OpenAI | null = null;
    private model: string = 'gpt-4o-mini';
    private isConfigured: boolean = false;

    constructor(overrides?: { model?: string; baseUrl?: string; apiKey?: string }) {
        const apiKey = overrides?.apiKey || config.llm.apiKey;
        const baseUrl = overrides?.baseUrl || config.llm.baseUrl;
        this.model = overrides?.model || config.llm.model || 'gpt-4o-mini';

        // Allow local LLM servers (LM Studio, Ollama) or custom endpoints that don't need API keys
        // We assume any custom baseUrl might be a local/private instance.
        const isCustomEndpoint = baseUrl && !baseUrl.includes('api.openai.com');

        if (!apiKey && !isCustomEndpoint) {
            logger.warn('LLM_API_KEY is missing and no custom LLM endpoint configured. AI analysis will not work.');
            return;
        }

        try {
            this.client = new OpenAI({
                apiKey: apiKey || 'not-needed-for-local',  // Placeholder for local LLMs
                baseURL: baseUrl,
            });

            this.isConfigured = true;
            logger.info('Intelligence service initialized', { model: this.model, baseUrl: baseUrl || 'default' });
        } catch (error) {
            console.error('[Intelligence] Init failed:', error);
            logger.error('Failed to initialize Intelligence service', error);
        }
    }

    isReady(): boolean {
        const ready = this.isConfigured && !!this.client;
        if (!ready) console.log('[Intelligence] isReady check failed:', { isConfigured: this.isConfigured, hasClient: !!this.client });
        return ready;
    }

    async analyzeEmail(content: string, context: EmailContext, eventLogger?: EventLogger, emailId?: string): Promise<EmailAnalysis | null> {
        console.log('[Intelligence] analyzeEmail called for:', context.subject);
        
        if (!this.isReady()) {
            console.log('[Intelligence] Not ready, skipping');
            logger.warn('Intelligence service not ready, skipping analysis');
            if (eventLogger) {
                await eventLogger.info('Skipped', 'AI Analysis skipped: Model not configured. Please check settings.', undefined, emailId);
            }
            return null;
        }

        // 1. Prepare Content and Signals
        const cleanedContent = ContentCleaner.cleanEmailBody(content).substring(0, 2500);
        
        const metadataSignals = [];
        if (context.metadata?.listUnsubscribe) metadataSignals.push('- Contains Unsubscribe header (High signal for Newsletter/Promo)');
        if (context.metadata?.autoSubmitted && context.metadata.autoSubmitted !== 'no') metadataSignals.push(`- Auto-Submitted: ${context.metadata.autoSubmitted}`);
        if (context.metadata?.importance) metadataSignals.push(`- Sender Priority/Importance: ${context.metadata.importance}`);
        if (context.metadata?.mailer) metadataSignals.push(`- Sent via: ${context.metadata.mailer}`);

        const systemPrompt = `You are an AI Email Assistant. Your task is to analyze the provided email and extract structured information as JSON.
Do NOT include any greetings, chatter, or special tokens like <|channel|> in your output.
Return ONLY a valid JSON object.

Definitions for Categories:
- "spam": Junk, suspicious, unwanted
- "newsletter": Subscribed content, digests
- "promotional": Marketing, sales, discounts
- "transactional": Receipts, shipping, confirmations
- "social": LinkedIn, friends, social updates
- "support": Help desk, customer service
- "client": Business clients, customers
- "internal": Company internal communications
- "personal": Friends, family, personal matters
- "other": Anything else

Context:
- Current Date: ${new Date().toISOString()}
- Subject: ${context.subject}
- From: ${context.sender}
- Date: ${context.date}
${metadataSignals.length > 0 ? `\nMetadata Signals:\n${metadataSignals.join('\n')}` : ''}
${context.userPreferences?.autoTrashSpam ? '- User has auto-trash spam enabled' : ''}
${context.userPreferences?.smartDrafts ? '- User wants draft responses for important emails' : ''}

REQUIRED JSON STRUCTURE:
{
  "summary": "string",
  "category": "spam|newsletter|promotional|transactional|social|support|client|internal|personal|other",
  "sentiment": "Positive|Neutral|Negative",
  "is_useless": boolean,
  "suggested_actions": ["none"|"delete"|"archive"|"reply"|"flag"],
  "draft_response": "string (optional)",
  "priority": "High|Medium|Low",
  "key_points": ["string"],
  "action_items": ["string"]
}`;

        // 2. Log Thinking Phase
        if (eventLogger) {
            console.log('[Intelligence] Logging "Thinking" event');
            try {
                await eventLogger.info('Thinking', `Analyzing email: ${context.subject}`, { 
                    model: this.model,
                    system_prompt: systemPrompt,
                    content_preview: cleanedContent,
                    content_length: cleanedContent.length
                }, emailId);
            } catch (err) {
                console.error('[Intelligence] Failed to log thinking event:', err);
            }
        }

        let rawResponse = '';
        try {
            // Request JSON response format for reliable parsing
            const response = await this.client!.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: cleanedContent || '[Empty email body]' },
                ],
                // response_format: { type: 'json_object' }, // Removed for compatibility
                temperature: 0.1,
            });

            rawResponse = response.choices[0]?.message?.content || '';
            console.log('[Intelligence] Raw LLM Response received (length:', rawResponse.length, ')');
            
            // Clean the response: Find first '{' and last '}'
            let jsonStr = rawResponse.trim();
            const startIdx = jsonStr.indexOf('{');
            const endIdx = jsonStr.lastIndexOf('}');
            
            if (startIdx === -1 || endIdx === -1) {
                throw new Error('Response did not contain a valid JSON object (missing curly braces)');
            }

            jsonStr = jsonStr.substring(startIdx, endIdx + 1);

            const parsed = JSON.parse(jsonStr);
            const validated = EmailAnalysisSchema.parse(parsed);

            logger.debug('Email analyzed', {
                category: validated.category,
                actions: validated.suggested_actions,
            });

            if (eventLogger && emailId) {
                await eventLogger.analysis('Decided', emailId, {
                    ...validated,
                    _raw_response: rawResponse 
                });
            }

            return validated;
        } catch (error) {
            console.error('[Intelligence] AI Analysis failed:', error);
            if (eventLogger) {
                await eventLogger.error('Error', {
                    error: error instanceof Error ? error.message : String(error),
                    raw_response: rawResponse || 'No response received from LLM'
                }, emailId);
            }
            return null;
        }
    }

    async generateDraftReply(
        originalEmail: { subject: string; sender: string; body: string },
        instructions?: string
    ): Promise<string | null> {
        if (!this.isReady()) {
            return null;
        }

        try {
            const response = await this.client!.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: `You are a professional email assistant. Generate a polite and appropriate reply to the email.
${instructions ? `Additional instructions: ${instructions}` : ''}
Keep the response concise and professional.`,
                    },
                    {
                        role: 'user',
                        content: `Original email from ${originalEmail.sender}:
Subject: ${originalEmail.subject}

${originalEmail.body}

Please write a reply.`,
                    },
                ],
            });

            return response.choices[0]?.message?.content || null;
        } catch (error) {
            logger.error('Draft generation failed', error);
            return null;
        }
    }

    /**
     * Context-Aware Analysis: AI evaluates email against user's rules semantically
     * This is the core of the new automation engine
     * 
     * @param compiledRulesContext - Pre-compiled rules context string (from user_settings.compiled_rule_context)
     *                               OR RuleContext[] for backwards compatibility
     */
    async analyzeEmailWithRules(
        content: string,
        context: EmailContext,
        compiledRulesContext: string | RuleContext[],
        eventLogger?: EventLogger,
        emailId?: string
    ): Promise<ContextAwareAnalysis | null> {
        console.log('[Intelligence] analyzeEmailWithRules called for:', context.subject);
        
        if (!this.isReady()) {
            console.log('[Intelligence] Not ready, skipping');
            logger.warn('Intelligence service not ready, skipping analysis');
            if (eventLogger) {
                await eventLogger.info('Skipped', 'AI Analysis skipped: Model not configured.', undefined, emailId);
            }
            return null;
        }

        // Prepare content
        const cleanedContent = ContentCleaner.cleanEmailBody(content).substring(0, 2500);
        
        // Use pre-compiled context if string, otherwise build from RuleContext[] (backwards compat)
        let rulesContext: string;
        let rulesCount: number;
        
        if (typeof compiledRulesContext === 'string') {
            // Fast path: use pre-compiled context
            rulesContext = compiledRulesContext || '\n[No rules defined - analyze email but take no actions]\n';
            rulesCount = (rulesContext.match(/Rule \d+/g) || []).length;
        } else {
            // Backwards compatibility: build from RuleContext[]
            const rules = compiledRulesContext;
            rulesCount = rules.length;
            rulesContext = rules.length > 0 
                ? rules.map((r, i) => `
### Rule ${i + 1}: "${r.name}" (ID: ${r.id})
- Description: ${r.description || 'No description provided'}
- Intent: ${r.intent || 'General automation'}
- Actions: ${r.actions.join(', ')}
${r.draft_instructions ? `- Draft Instructions: "${r.draft_instructions}"` : ''}
`).join('\n')
                : '\n[No rules defined - analyze email but take no actions]\n';
        }

        const systemPrompt = `You are an AI Email Automation Agent.

## Your Operating Rules
The user has defined the following automation rules. Your job is to:
1. Analyze the incoming email
2. Determine if ANY rule semantically matches this email's context
3. Match based on INTENT, not just keywords

${rulesContext}

## Matching Guidelines
- A "decline sales" rule should match ANY sales pitch, not just ones with "sales" in the subject
- Match the rule that best fits the USER'S INTENT
- Only match if you are confident (>= 0.7 confidence)
- If no rule clearly matches, return null for rule_id
- If a matched rule includes "draft" action, generate an appropriate draft using the rule's intent

## Email Context
- Current Date: ${new Date().toISOString()}
- Subject: ${context.subject}
- From: ${context.sender}
- Date: ${context.date}

## Required JSON Response
{
  "summary": "Brief summary of the email",
  "category": "spam|newsletter|promotional|transactional|social|support|client|internal|personal|other",
  "priority": "High|Medium|Low",
  "matched_rule": {
    "rule_id": "UUID or null",
    "rule_name": "Rule name or null",
    "confidence": 0.0-1.0,
    "reasoning": "Why this rule was or wasn't matched"
  },
  "actions_to_execute": ["none"] or ["archive", "read", etc.],
  "draft_content": "Optional: draft reply if action includes 'draft'"
}

Return ONLY valid JSON.`;

        // Log thinking phase
        if (eventLogger) {
            try {
                await eventLogger.info('Thinking', `Context-aware analysis: ${context.subject}`, { 
                    model: this.model,
                    system_prompt: systemPrompt,
                    content_preview: cleanedContent,
                    rules_count: rulesCount,
                }, emailId);
            } catch (err) {
                console.error('[Intelligence] Failed to log thinking event:', err);
            }
        }

        let rawResponse = '';
        try {
            const response = await this.client!.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: cleanedContent || '[Empty email body]' },
                ],
                temperature: 0.1,
            });

            rawResponse = response.choices[0]?.message?.content || '';
            console.log('[Intelligence] Context-aware response received (length:', rawResponse.length, ')');
            
            // Parse JSON from response
            let jsonStr = rawResponse.trim();
            const startIdx = jsonStr.indexOf('{');
            const endIdx = jsonStr.lastIndexOf('}');
            
            if (startIdx === -1 || endIdx === -1) {
                throw new Error('Response did not contain a valid JSON object');
            }

            jsonStr = jsonStr.substring(startIdx, endIdx + 1);
            const parsed = JSON.parse(jsonStr);
            const validated = ContextAwareAnalysisSchema.parse(parsed);

            logger.debug('Context-aware analysis complete', {
                matched_rule: validated.matched_rule.rule_name,
                confidence: validated.matched_rule.confidence,
                actions: validated.actions_to_execute,
            });

            if (eventLogger && emailId) {
                await eventLogger.analysis('Decided', emailId, {
                    ...validated,
                    _raw_response: rawResponse 
                });
            }

            return validated;
        } catch (error) {
            console.error('[Intelligence] Context-aware analysis failed:', error);
            if (eventLogger) {
                await eventLogger.error('Error', {
                    error: error instanceof Error ? error.message : String(error),
                    raw_response: rawResponse || 'No response received from LLM'
                }, emailId);
            }
            return null;
        }
    }

    async testConnection(): Promise<{ success: boolean; message: string }> {
        if (!this.isReady()) {
            return { success: false, message: 'Intelligence service not initialized. Check your API Key.' };
        }

        try {
            await this.client!.chat.completions.create({
                model: this.model,
                messages: [{ role: 'user', content: 'Say "Connection Successful"' }],
                max_tokens: 5,
            });
            return { success: true, message: 'Connection successful!' };
        } catch (error) {
            logger.error('Connection test failed', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}

// Singleton instance with default config
let defaultInstance: IntelligenceService | null = null;

export function getIntelligenceService(overrides?: { model?: string; baseUrl?: string; apiKey?: string }): IntelligenceService {
    if (overrides) {
        return new IntelligenceService(overrides);
    }

    if (!defaultInstance) {
        defaultInstance = new IntelligenceService();
    }
    return defaultInstance;
}
