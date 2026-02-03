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
            const toolDescs = context.tools.map(t => {
                const params = t.parameters?.properties
                    ? Object.entries(t.parameters.properties).map(([key, val]: [string, any]) =>
                        `${key}: ${val.type}${val.description ? ` (${val.description})` : ''}`
                    ).join(', ')
                    : 'none';
                const required = t.parameters?.required ? ` [Required: ${t.parameters.required.join(', ')}]` : '';
                return `- ${t.name}: ${t.description}\n  Parameters: {${params}}${required}`;
            }).join('\n');

            toolInstructions = `\n\nAVAILABLE TOOLS:\n${toolDescs}\n\nIMPORTANT TOOL USAGE RULES:
1. To execute a tool, output the marker <<<ACTION>>> followed by a JSON object on the same line
2. The JSON MUST have "name" (tool name) and "args" (object with parameters)
3. Example: <<<ACTION>>>{"name": "send_draft", "args": {"draft_id": "123"}}
4. Do NOT wrap the JSON in markdown code blocks
5. Always include all required parameters as specified above
6. Provide a friendly explanation BEFORE the <<<ACTION>>> marker`;
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
        if (!sdk) {
            throw new Error('AI service unavailable. Please ensure RealTimeX Desktop is running.');
        }

        // Use default provider resolution logic (can be enhanced to use specific agent models)
        // For now, we use a simple default or user preference if available
        let response;
        try {
            const { provider, model } = await SDKService.resolveChatProvider({});
            response = await sdk.llm.chat(messages, {
                provider,
                model
            });
        } catch (error: any) {
            console.error('[AgentService] LLM call failed:', error);
            throw new Error(`Failed to get AI response: ${error.message || 'Unknown error'}`);
        }

        console.log('[AgentService] LLM Response:', JSON.stringify(response, null, 2));

        let content = response.response?.content || "I couldn't generate a response.";
        let action: { name: string; args: any } | undefined = undefined;

        // Parse Action with multiple strategies
        if (content.includes('<<<ACTION>>>')) {
            const parts = content.split('<<<ACTION>>>');
            content = parts[0].trim(); // user-facing text
            try {
                let actionJson = parts[1].trim();

                // Clean up common JSON formatting issues
                // Remove markdown code blocks if present
                actionJson = actionJson.replace(/```json\s*/g, '').replace(/```\s*/g, '');

                const parsed = JSON.parse(actionJson);

                // Validate action structure
                if (!parsed || typeof parsed !== 'object' || !parsed.name || typeof parsed.name !== 'string') {
                    console.error('[AgentService] Invalid action: missing or invalid "name" field');
                    action = undefined;
                } else {
                    // Validate that the tool exists
                    const toolExists = context.tools?.some(t => t.name === parsed.name);
                    if (!toolExists) {
                        console.error(`[AgentService] Tool "${parsed.name}" not found in available tools`);
                        content += `\n\n⚠️ Note: I tried to use a tool called "${parsed.name}" but it's not available.`;
                        action = undefined;
                    } else {
                        action = { name: parsed.name, args: parsed.args || {} };
                        console.log('[AgentService] Detected valid action:', action);
                    }
                }
            } catch (e: any) {
                console.error('[AgentService] Failed to parse action JSON:', e.message);
                content += `\n\n⚠️ Note: I tried to take an action but the format was incorrect.`;
                action = undefined;
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
