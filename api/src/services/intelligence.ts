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
                    content_preview: cleanedContent
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
                response_format: { type: 'json_object' },
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
