import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useTTS } from '../hooks/useTTS';

export interface ToolDefinition {
    name: string;
    description: string;
    parameters?: any;
    callback: (args: any) => Promise<any> | any;
}

export interface AgentConfig {
    page_id: string;
    system_instruction?: string;
    data?: any;
    tools?: ToolDefinition[];
}


export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface AgentContextType {
    currentConfig: AgentConfig;
    registerAgent: (config: AgentConfig) => void;
    chatHistory: ChatMessage[];
    agentState: 'idle' | 'listening' | 'thinking' | 'speaking';
    sendMessage: (content: string) => Promise<void>;
    resetAgent: () => void;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

const DEFAULT_CONFIG: AgentConfig = {
    page_id: 'global',
    system_instruction: "You are a helpful Email Assistant. Use general knowledge to help the user."
};

export function AgentProvider({ children }: { children: ReactNode }) {
    const [currentConfig, setCurrentConfig] = useState<AgentConfig>(DEFAULT_CONFIG);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [agentState, setAgentState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
    const { speak } = useTTS();

    const registerAgent = useCallback((config: AgentConfig) => {
        // Only update if page_id changes to avoid loop
        setCurrentConfig(prev => {
            if (prev.page_id === config.page_id && JSON.stringify(prev.data) === JSON.stringify(config.data)) {
                return prev;
            }
            console.log(`[AgentContext] Registering new agent context: ${config.page_id}`);
            return config;
        });
    }, []);

    const resetAgent = useCallback(() => {
        setCurrentConfig(DEFAULT_CONFIG);
    }, []);

    const sendMessage = useCallback(async (content: string) => {
        setAgentState('thinking');

        // Optimistic update
        const userMsg: ChatMessage = { role: 'user', content };
        setChatHistory(prev => [...prev, userMsg]);

        try {
            const endpoint = '/api/agent/chat';
            // Use localStorage token if available (simple auth)
            const token = localStorage.getItem('supabase.auth.token');

            // Payload matches api/src/routes/agent.ts expectations
            // Payload: Strip callbacks from tools before sending
            const contextPayload = {
                ...currentConfig,
                tools: currentConfig.tools?.map(t => ({
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters
                }))
            };

            const body = {
                message: content,
                context: contextPayload,
                history: chatHistory.slice(-10)
            };


            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token || ''}`,
                    // Pass user id if we had it in context, but token usually carries it
                },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (data.success && data.response) {
                const aiContent = data.response.content;
                const aiAction = data.response.action;

                const aiMsg: ChatMessage = { role: 'assistant', content: aiContent };
                setChatHistory(prev => [...prev, aiMsg]);

                // Speak response
                if (aiContent) {
                    setAgentState('speaking');
                    await speak(aiContent, undefined, { speed: 1.1 });
                }

                // Execute Action
                if (aiAction && currentConfig.tools) {
                    console.log(`[AgentContext] Executing tool: ${aiAction.name}`, aiAction.args);
                    const tool = currentConfig.tools.find(t => t.name === aiAction.name);
                    if (tool) {
                        try {
                            // Execute callback
                            await tool.callback(aiAction.args);
                            // Optional: provide feedback to chat?
                        } catch (err) {
                            console.error(`[AgentContext] Tool execution failed:`, err);
                            setChatHistory(prev => [...prev, { role: 'system', content: `Error executing ${aiAction.name}` }]);
                        }
                    } else {
                        console.warn(`[AgentContext] Tool not found: ${aiAction.name}`);
                    }
                }

                setAgentState('idle');
            } else {
                setChatHistory(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error." }]);
                setAgentState('idle');
            }

        } catch (error) {
            console.error('[AgentContext] Chat failed:', error);
            setChatHistory(prev => [...prev, { role: 'assistant', content: "Network error. Please try again." }]);
            setAgentState('idle');
        }
    }, [currentConfig, chatHistory, speak]);

    return (
        <AgentContext.Provider value={{
            currentConfig,
            registerAgent,
            chatHistory,
            agentState,
            sendMessage,
            resetAgent
        }}>
            {children}
        </AgentContext.Provider>
    );
}

export function useAgentContext() {
    const context = useContext(AgentContext);
    if (context === undefined) {
        throw new Error('useAgentContext must be used within an AgentProvider');
    }
    return context;
}
