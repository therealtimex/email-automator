import { SupabaseClient } from '@supabase/supabase-js';
import { SDKService } from './SDKService.js';
import { RAGService } from './RAGService.js';

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
    private supabase: SupabaseClient;
    private ragService: RAGService;

    constructor(supabase: SupabaseClient) {
        this.supabase = supabase;
        this.ragService = new RAGService(supabase);
    }

    /**
     * Process a context-aware chat request with RAG
     */
    async chat(
        userId: string,
        message: string,
        context: AgentContextPayload,
        history: AgentMessage[] = []
    ) {
        // 1. Retrieve relevant knowledge using RAG
        console.log('[AgentService] Retrieving relevant knowledge...');
        const ragContext = await this.ragService.retrieve(message, {
            topK: 5,
            similarityThreshold: 0.5  // Lowered from 0.7 to be less strict
        });

        console.log(`[AgentService] Retrieved ${ragContext.chunks.length} relevant chunks from: ${ragContext.sources.join(', ')}`);

        // 2. Construct System Prompt with RAG context
        const baseInstruction = context.system_instruction ||
            "You are a helpful Email Automator Assistant helping users with this page.";

        let systemPrompt = `${baseInstruction}

# CRITICAL: Anti-Hallucination Rules

**You MUST follow these rules strictly:**

1. **ONLY use information from the Retrieved Documentation below** - If information is not in the retrieved docs, say: "I don't have information about that in the available documentation"

2. **Never fabricate features** - Do not invent capabilities, settings, buttons, or workflows not documented in the retrieved content

3. **Be honest about limitations** - If the retrieved documentation doesn't cover the user's question, acknowledge it clearly

4. **Exact references only** - Only mention page names, buttons, settings, and steps that appear in the Retrieved Documentation

5. **Cite sources** - When answering, reference which documentation section you're using (e.g., "According to the Configuration guide...")

---

${ragContext.contextText}

---

# Current Context
- **Current Page**: ${context.page_id}
- **Page Data**: ${JSON.stringify(context.data || {}, null, 2)}

# Response Instructions

**When Answering:**
- Base your answer ONLY on the Retrieved Documentation above
- Reference the source file and section when relevant
- Provide step-by-step instructions when they exist in the docs
- If user asks about a different page, guide them: "Go to [Page Name] → [Section]"
- Use tools when available on current page
- If the retrieved documentation doesn't answer the question, say: "I don't have information about that in the documentation. The available docs cover: [list sources]"`;

        // Add Tool Instructions if tools are available
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

            systemPrompt += `\n\n# AVAILABLE TOOLS\n${toolDescs}\n\n## Tool Usage Rules:
1. To execute a tool, output the marker <<<ACTION>>> followed by a JSON object on the same line
2. The JSON MUST have "name" (tool name) and "args" (object with parameters)
3. Example: <<<ACTION>>>{"name": "send_draft", "args": {"draft_id": "123"}}
4. Do NOT wrap the JSON in markdown code blocks
5. Always include all required parameters as specified above
6. Provide a friendly explanation BEFORE the <<<ACTION>>> marker`;
        }

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

// Note: AgentService now requires Supabase client for RAG
// Instantiate in routes like: new AgentService(supabase)
