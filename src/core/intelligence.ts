import OpenAI from 'openai';
import Instructor from '@instructor-ai/instructor';
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

export class IntelligenceLayer {
    private client;

    constructor() {
        if (!process.env.LLM_API_KEY) {
            console.warn('LLM_API_KEY is missing. AI analysis will not work.');
            this.client = null as any;
            return;
        }

        const oai = new OpenAI({
            apiKey: process.env.LLM_API_KEY,
            baseURL: process.env.LLM_BASE_URL,
        });

        this.client = Instructor({
            client: oai,
            mode: 'JSON'
        });
    }

    async analyzeEmail(content: string, context: { subject: string; sender: string; date: string }): Promise<EmailAnalysis | null> {
        try {
            const response = await this.client.chat.completions.create({
                model: process.env.LLM_MODEL || 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are an AI Email Assistant. Analyze the provided email and extract structured information.
            Context Date: ${new Date().toISOString()}
            Subject: ${context.subject}
            From: ${context.sender}
            Date: ${context.date}`
                    },
                    {
                        role: 'user',
                        content: content
                    }
                ],
                response_model: {
                    schema: EmailAnalysisSchema,
                    name: "EmailAnalysis"
                },
                max_retries: 3
            });

            return response;
        } catch (error) {
            console.error('AI Analysis Error:', error);
            return null;
        }
    }
}
