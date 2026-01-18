import OpenAI from 'openai';
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
    private client: OpenAI | null = null;
    private model: string = 'gpt-4o-mini';

    constructor() {
        if (!process.env.LLM_API_KEY) {
            console.warn('LLM_API_KEY is missing. AI analysis will not work.');
            return;
        }

        this.client = new OpenAI({
            apiKey: process.env.LLM_API_KEY,
            baseURL: process.env.LLM_BASE_URL,
        });

        this.model = process.env.LLM_MODEL || 'gpt-4o-mini';
    }

    async analyzeEmail(content: string, context: { subject: string; sender: string; date: string }): Promise<EmailAnalysis | null> {
        if (!this.client) {
            console.error('AI client not initialized');
            return null;
        }

        try {
            const systemPrompt = `You are an AI Email Assistant. Analyze the provided email and extract structured information.
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

            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: content }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.1,
            });

            const rawResponse = response.choices[0]?.message?.content || '';

            // Parse and validate with Zod
            const parsed = JSON.parse(rawResponse);
            const validated = EmailAnalysisSchema.parse(parsed);

            return validated;
        } catch (error) {
            console.error('AI Analysis Error:', error);
            return null;
        }
    }
}
