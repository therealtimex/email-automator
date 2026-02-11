import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { useTTS } from '../hooks/useTTS';
import { getTTSFromLocalStorage } from '../lib/tts-sync';
import { getApiConfig } from '../lib/api-config';

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

// Helper to get TTS auto-play setting from localStorage
// Falls back to true if not set (default enabled)
function getTTSAutoPlayEnabled(): boolean {
    const settings = getTTSFromLocalStorage();
    return settings.autoPlay;
}

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

            // Get Supabase config for BYOK mode
            const config = getApiConfig();

            // Payload matches api/src/routes/agent.ts expectations
            // Payload: Strip callbacks from tools before sending
            const contextPayload = {
                ...currentConfig,
                lang: localStorage.getItem('app_language') || 'en',
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
                    // Pass Supabase config for RAG (BYOK mode)
                    'X-Supabase-Url': config.edgeFunctionsUrl.replace('/functions/v1', ''),
                    'X-Supabase-Anon-Key': config.anonKey,
                },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                throw new Error(`API request failed: ${res.status} ${res.statusText}`);
            }

            const data = await res.json();

            if (data.success && data.response) {
                const aiContent = data.response.content;
                const aiAction = data.response.action;

                const aiMsg: ChatMessage = { role: 'assistant', content: aiContent };
                setChatHistory(prev => [...prev, aiMsg]);

                // Speak response (if auto-speak is enabled)
                if (aiContent && getTTSAutoPlayEnabled()) {
                    setAgentState('speaking');
                    await speak(aiContent, undefined, getTTSFromLocalStorage());
                }

                // Execute Action
                if (aiAction && currentConfig.tools) {
                    console.log(`[AgentContext] Executing tool: ${aiAction.name}`, aiAction.args);
                    const tool = currentConfig.tools.find(t => t.name === aiAction.name);

                    if (tool) {
                        try {
                            // Validate that required parameters are present
                            if (tool.parameters?.required) {
                                const missing = tool.parameters.required.filter(
                                    (param: string) => !(param in (aiAction.args || {}))
                                );
                                if (missing.length > 0) {
                                    throw new Error(`Missing required parameters: ${missing.join(', ')}`);
                                }
                            }

                            // Execute callback
                            const result = await tool.callback(aiAction.args);

                            // Provide success feedback
                            const successMsg = result?.message || `✓ Action completed: ${aiAction.name}`;
                            setChatHistory(prev => [...prev, {
                                role: 'system',
                                content: successMsg
                            }]);

                            console.log(`[AgentContext] Tool executed successfully:`, result);
                        } catch (err: any) {
                            console.error(`[AgentContext] Tool execution failed:`, err);
                            const errorMsg = err?.message || 'Unknown error occurred';
                            setChatHistory(prev => [...prev, {
                                role: 'system',
                                content: `⚠️ Error: ${errorMsg}`
                            }]);

                            // Speak error message (if auto-speak is enabled)
                            if (getTTSAutoPlayEnabled()) {
                                await speak(`Error: ${errorMsg}`, undefined, getTTSFromLocalStorage());
                            }
                        }
                    } else {
                        const errorMsg = `Tool "${aiAction.name}" not found. Available tools: ${currentConfig.tools.map(t => t.name).join(', ')}`;
                        console.warn(`[AgentContext] ${errorMsg}`);
                        setChatHistory(prev => [...prev, {
                            role: 'system',
                            content: `⚠️ ${errorMsg}`
                        }]);
                    }
                }

                setAgentState('idle');
            } else {
                const errorMsg = data.error || "Sorry, I encountered an error processing your request.";
                console.error('[AgentContext] API error:', data.error);
                setChatHistory(prev => [...prev, {
                    role: 'assistant',
                    content: `⚠️ ${errorMsg}`
                }]);
                setAgentState('idle');
            }

        } catch (error: any) {
            console.error('[AgentContext] Chat failed:', error);
            let errorMessage = "Network error. Please try again.";

            if (error.message?.includes('Failed to fetch')) {
                errorMessage = "Cannot connect to the AI service. Please ensure the API server is running.";
            } else if (error.message) {
                errorMessage = error.message;
            }

            setChatHistory(prev => [...prev, {
                role: 'system',
                content: `⚠️ ${errorMessage}`
            }]);
            setAgentState('idle');
        }
    }, [currentConfig, chatHistory, speak]);

    const value = useMemo(() => ({
        currentConfig,
        registerAgent,
        chatHistory,
        agentState,
        sendMessage,
        resetAgent
    }), [currentConfig, registerAgent, chatHistory, agentState, sendMessage, resetAgent]);

    return (
        <AgentContext.Provider value={value}>
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
