import OpenAI from 'openai';
import Instructor from '@instructor-ai/instructor';
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
    private client: any;
    private model: string;
    private isConfigured: boolean = false;

    constructor(overrides?: { model?: string; baseUrl?: string; apiKey?: string }) {
        const apiKey = overrides?.apiKey || config.llm.apiKey;
        const baseUrl = overrides?.baseUrl || config.llm.baseUrl;
        this.model = overrides?.model || config.llm.model;

        // Allow local LLM servers (LM Studio, Ollama) or custom endpoints that don't need API keys
        // We assume any custom baseUrl might be a local/private instance.
        const isCustomEndpoint = baseUrl && !baseUrl.includes('api.openai.com');

        if (!apiKey && !isCustomEndpoint) {
            logger.warn('LLM_API_KEY is missing and no custom LLM endpoint configured. AI analysis will not work.');
            return;
        }

        try {
            const oai = new OpenAI({
                apiKey: apiKey || 'not-needed-for-local',  // Placeholder for local LLMs
                baseURL: baseUrl,
            });

            this.client = Instructor({
                client: oai,
                mode: 'MD_JSON',
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

    async analyzeEmail(content: string, context: EmailContext, eventLogger?: EventLogger): Promise<EmailAnalysis | null> {
        console.log('[Intelligence] analyzeEmail called for:', context.subject);
        
        if (!this.isReady()) {
            console.log('[Intelligence] Not ready, skipping');
            logger.warn('Intelligence service not ready, skipping analysis');
            if (eventLogger) {
                await eventLogger.info('Skipped', 'AI Analysis skipped: Model not configured. Please check settings.');
            }
            return null;
        }

        if (eventLogger) {
            console.log('[Intelligence] Logging "Thinking" event');
            await eventLogger.info('Thinking', `Analyzing email: ${context.subject}`, { model: this.model });
        }

        // Clean and truncate content to avoid token overflow and noise
        const cleanedContent = ContentCleaner.cleanEmailBody(content).substring(0, 2500);

        try {
            const metadataSignals = [];
            if (context.metadata?.listUnsubscribe) metadataSignals.push('- Contains Unsubscribe header (High signal for Newsletter/Promo)');
            if (context.metadata?.autoSubmitted && context.metadata.autoSubmitted !== 'no') metadataSignals.push(`- Auto-Submitted: ${context.metadata.autoSubmitted}`);
            if (context.metadata?.importance) metadataSignals.push(`- Sender Priority/Importance: ${context.metadata.importance}`);
            if (context.metadata?.mailer) metadataSignals.push(`- Sent via: ${context.metadata.mailer}`);

            const systemPrompt = `You are an AI Email Assistant. Your task is to analyze the provided email and extract structured information as JSON.
Do NOT include any greetings, chatter, or special tokens like <|channel|> in your output.

Definitions for Categories:
- "important": Work-related, urgent, from known contacts
- "promotional": Marketing, sales, discounts
- "transactional": Receipts, shipping, confirmations
- "social": LinkedIn, friends, social updates
- "newsletter": Subscribed content
- "spam": Junk, suspicious

Context:
- Current Date: ${new Date().toISOString()}
- Subject: ${context.subject}
- From: ${context.sender}
- Date: ${context.date}
${metadataSignals.length > 0 ? `\nMetadata Signals:\n${metadataSignals.join('\n')}` : ''}
${context.userPreferences?.autoTrashSpam ? '- User has auto-trash spam enabled' : ''}
${context.userPreferences?.smartDrafts ? '- User wants draft responses for important emails' : ''}`;

            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: cleanedContent || '[Empty email body]' },
                ],
                response_model: {
                    schema: EmailAnalysisSchema,
                    name: 'EmailAnalysis',
                },
                temperature: 0.1,
                max_retries: config.processing.maxRetries,
            });

            logger.debug('Email analyzed', {
                category: response.category,
                action: response.suggested_action,
            });

            if (eventLogger) {
                await eventLogger.analysis('Decided', 'Analysis complete', response);
            }

            return response;
        } catch (error) {
            logger.error('AI Analysis failed', error);
            if (eventLogger) {
                await eventLogger.error('Error', error);
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
            const response = await this.client.chat.completions.create({
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
            await this.client.chat.completions.create({
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
