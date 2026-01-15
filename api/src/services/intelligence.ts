import OpenAI from 'openai';
import Instructor from '@instructor-ai/instructor';
import { z } from 'zod';
import { config } from '../config/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Intelligence');

// Define the schema for email analysis
export const EmailAnalysisSchema = z.object({
    summary: z.string().describe('A brief summary of the email content'),
    category: z.enum(['spam', 'newsletter', 'support', 'client', 'internal', 'personal', 'other'])
        .describe('The category of the email'),
    sentiment: z.enum(['Positive', 'Neutral', 'Negative'])
        .describe('The emotional tone of the email'),
    is_useless: z.boolean()
        .describe('Whether the email is considered useless (spam, newsletter, etc.)'),
    suggested_action: z.enum(['none', 'delete', 'archive', 'reply', 'flag'])
        .describe('The recommended next action'),
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

        if (!apiKey) {
            logger.warn('LLM_API_KEY is missing. AI analysis will not work.');
            return;
        }

        try {
            const oai = new OpenAI({
                apiKey,
                baseURL: baseUrl,
            });

            this.client = Instructor({
                client: oai,
                mode: 'JSON',
            });
            
            this.isConfigured = true;
            logger.info('Intelligence service initialized', { model: this.model, baseUrl: baseUrl || 'default' });
        } catch (error) {
            logger.error('Failed to initialize Intelligence service', error);
        }
    }

    isReady(): boolean {
        return this.isConfigured && !!this.client;
    }

    async analyzeEmail(content: string, context: EmailContext): Promise<EmailAnalysis | null> {
        if (!this.isReady()) {
            logger.warn('Intelligence service not ready, skipping analysis');
            return null;
        }

        try {
            const systemPrompt = `You are an AI Email Assistant. Analyze the provided email and extract structured information.
Your goal is to help the user manage their inbox efficiently by:
1. Categorizing emails accurately
2. Identifying spam and useless emails
3. Suggesting appropriate actions
4. Drafting responses when needed

Context:
- Current Date: ${new Date().toISOString()}
- Subject: ${context.subject}
- From: ${context.sender}
- Date: ${context.date}
${context.userPreferences?.autoTrashSpam ? '- User has auto-trash spam enabled' : ''}
${context.userPreferences?.smartDrafts ? '- User wants draft responses for important emails' : ''}`;

            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: content || '[Empty email body]' },
                ],
                response_model: {
                    schema: EmailAnalysisSchema,
                    name: 'EmailAnalysis',
                },
                max_retries: config.processing.maxRetries,
            });

            logger.debug('Email analyzed', { 
                category: response.category, 
                action: response.suggested_action,
            });

            return response;
        } catch (error) {
            logger.error('AI Analysis failed', error);
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
