import { Request, Response, Router } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AgentService } from '../services/AgentService.js';

const router = Router();

/**
 * Get Supabase client from request headers (BYOK mode) or environment (server mode)
 */
function getSupabaseFromRequest(req: Request): SupabaseClient | null {
    // Try request headers first (BYOK mode - credentials from Setup Wizard)
    const headerUrl = req.headers['x-supabase-url'] as string;
    const headerKey = req.headers['x-supabase-anon-key'] as string;

    if (headerUrl && headerKey) {
        try {
            return createClient(headerUrl, headerKey);
        } catch (error) {
            console.error('[Agent API] Failed to create Supabase client from headers:', error);
        }
    }

    // Fallback to environment variables (server mode)
    const envUrl = process.env.SUPABASE_URL;
    const envKey = process.env.SUPABASE_ANON_KEY;

    if (envUrl && envKey) {
        try {
            return createClient(envUrl, envKey);
        } catch (error) {
            console.error('[Agent API] Failed to create Supabase client from env:', error);
        }
    }

    return null;
}

/**
 * POST /api/agent/chat
 * Context-aware chat endpoint with optional RAG
 */
router.post('/chat', async (req: Request, res: Response) => {
    try {
        const userId = req.headers['x-user-id'] as string;
        const { message, context, history } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, error: 'Message is required' });
        }

        // Get Supabase client from request (BYOK) or environment
        const supabase = getSupabaseFromRequest(req);

        // If Supabase is available, use RAG-enhanced agent
        if (supabase) {
            console.log('[Agent API] Using RAG-enhanced agent');
            const agentService = new AgentService(supabase);

            const response = await agentService.chat(
                userId || 'anonymous',
                message,
                context || { page_id: 'global' },
                history || []
            );

            res.json({
                success: true,
                response
            });
        } else {
            // Fallback: Basic agent without RAG
            console.warn('[Agent API] Running without RAG - Supabase not configured');

            const { SDKService } = await import('../services/SDKService.js');
            const sdk = SDKService.getSDK();

            if (!sdk) {
                return res.status(503).json({
                    success: false,
                    error: 'AI service unavailable. Please ensure RealTimeX Desktop is running.'
                });
            }

            // Build system prompt without RAG
            const baseInstruction = context?.system_instruction ||
                "You are a helpful Email Automator Assistant.";

            let systemPrompt = `${baseInstruction}

# Current Context
- **Current Page**: ${context?.page_id || 'global'}
- **Page Data**: ${JSON.stringify(context?.data || {}, null, 2)}

# Response Instructions
**When Answering:**
- Provide helpful guidance based on the context
- Use tools when available on current page
- Be concise and actionable`;

            // Add Tool Instructions if tools are available
            if (context?.tools && context.tools.length > 0) {
                const toolDescs = context.tools.map((t: any) => {
                    const params = t.parameters?.properties
                        ? Object.entries(t.parameters.properties).map(([key, val]: [string, any]) =>
                            `${key}: ${val.type}${val.description ? ` (${val.description})` : ''}`
                        ).join(', ')
                        : 'none';
                    const required = t.parameters?.required ? ` [Required: ${t.parameters.required.join(', ')}]` : '';
                    return `- ${t.name}: ${t.description}\n  Parameters: {${params}}${required}`;
                }).join('\n');

                systemPrompt += `\n\n# AVAILABLE TOOLS\n${toolDescs}\n\n## Tool Usage Rules:
1. To execute a tool, output the marker <<<ACTION>>> followed by a JSON object on the same line
2. The JSON MUST have "name" (tool name) and "args" (object with parameters)
3. Example: <<<ACTION>>>{"name": "send_draft", "args": {"draft_id": "123"}}
4. Do NOT wrap the JSON in markdown code blocks
5. Always include all required parameters as specified above
6. Provide a friendly explanation BEFORE the <<<ACTION>>> marker`;
            }

            // Prepare messages
            const historyMessages = (history || []).slice(-5).map((m: any) => ({
                role: m.role as 'system' | 'user' | 'assistant',
                content: m.content
            }));

            const messages = [
                { role: 'system' as const, content: systemPrompt },
                ...historyMessages,
                { role: 'user' as const, content: message }
            ];

            // Call SDK
            const { provider, model } = await SDKService.resolveChatProvider({});
            const llmResponse = await sdk.llm.chat(messages, { provider, model });

            let content = llmResponse.response?.content || "I couldn't generate a response.";
            let action: { name: string; args: any } | undefined = undefined;

            // Parse Action
            if (content.includes('<<<ACTION>>>')) {
                const parts = content.split('<<<ACTION>>>');
                content = parts[0].trim();
                try {
                    let actionJson = parts[1].trim().replace(/```json\s*/g, '').replace(/```\s*/g, '');
                    const parsed = JSON.parse(actionJson);

                    if (parsed?.name && typeof parsed.name === 'string') {
                        const toolExists = context?.tools?.some((t: any) => t.name === parsed.name);
                        if (toolExists) {
                            action = { name: parsed.name, args: parsed.args || {} };
                        } else {
                            content += `\n\n⚠️ Note: Tool "${parsed.name}" not available.`;
                        }
                    }
                } catch (e) {
                    content += `\n\n⚠️ Note: I tried to take an action but the format was incorrect.`;
                }
            }

            res.json({
                success: true,
                response: {
                    content,
                    action,
                    usage: (llmResponse.response as any)?.metrics || undefined
                }
            });
        }
    } catch (error: any) {
        console.error('[Agent API] Chat failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
