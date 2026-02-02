import { SupabaseClient } from '@supabase/supabase-js';
import { SDKService } from './SDKService.js';

export interface AgentContextPayload {
    page_id: string;
    system_instruction?: string;
    data?: any;
    tools?: any[];
}

export interface AgentMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export class AgentService {

    /**
     * Process a context-aware chat request
     */
    async chat(
        userId: string,
        message: string,
        context: AgentContextPayload,
        history: AgentMessage[] = []
    ) {
        // 1. Construct System Prompt
        const baseIdentity = "You are the Email Automator Assistant. You help the user manage their email workflows, drafts, and rules.";
        const pageInstruction = context.system_instruction
            ? `\nCURRENT CONTEXT: You are currently assisting on the "${context.page_id}" page. ${context.system_instruction}`
            : "";

        const dataContext = context.data
            ? `\nVISIBLE DATA:\n${JSON.stringify(context.data, null, 2)}`
            : "";

        // Construct Tool Instructions
        let toolInstructions = "";
        if (context.tools && context.tools.length > 0) {
            const toolDescs = context.tools.map(t => `- ${t.name}: ${t.description} (Args: ${JSON.stringify(t.parameters || {})})`).join('\n');
            toolInstructions = `\n\nAVAILABLE TOOLS:\n${toolDescs}\n\nIMPORTANT: To take action, you MUST output a JSON object at the END of your response in this EXACT format:\n<<<ACTION>>>{"name": "tool_name", "args": { ... }}`;
        }

        const systemPrompt = `${baseIdentity}${pageInstruction}${dataContext}${toolInstructions}\n\nBe concise and helpful.`;

        // 2. Prepare Messages
        // Explicitly map history to ensure role is strongly typed as 'system' | 'user' | 'assistant'
        // and not just 'string', which satisfies the SDK's ChatMessage interface.
        const historyMessages = history.slice(-5).map(m => ({
            role: m.role as 'system' | 'user' | 'assistant',
            content: m.content
        }));

        const messages = [
            { role: 'system' as const, content: systemPrompt },
            ...historyMessages,
            { role: 'user' as const, content: message }
        ];

        console.log('[AgentService] Sending to LLM:', JSON.stringify(messages, null, 2));

        // 3. Call SDK
        const sdk = SDKService.getSDK();
        if (!sdk) throw new Error('RealTimeX SDK not available');

        // Use default provider resolution logic (can be enhanced to use specific agent models)
        // For now, we use a simple default or user preference if available
        const { provider, model } = await SDKService.resolveChatProvider({});

        const response = await sdk.llm.chat(messages, {
            provider,
            model
        });

        console.log('[AgentService] LLM Response:', JSON.stringify(response, null, 2));

        let content = response.response?.content || "I couldn't generate a response.";
        let action = undefined;

        // Parse Action
        if (content.includes('<<<ACTION>>>')) {
            const parts = content.split('<<<ACTION>>>');
            content = parts[0].trim(); // user-facing text
            try {
                const actionJson = parts[1].trim();
                action = JSON.parse(actionJson);
                console.log('[AgentService] Detected Action:', action);
            } catch (e) {
                console.error('[AgentService] Failed to parse action JSON:', e);
            }
        }

        return {
            content,
            action,
            // SDK returns 'metrics' inside 'response' object, not top-level 'usage'
            usage: (response.response as any)?.metrics || undefined
        };

    }
}

export const agentService = new AgentService();
