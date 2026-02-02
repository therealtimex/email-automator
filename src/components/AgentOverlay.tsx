import React, { useState, useEffect, useRef } from 'react';
import { Mic, Send, X, MessageSquare, Loader2, Volume2 } from 'lucide-react';
import { useAgentContext } from '../context/AgentContext';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

export function AgentOverlay() {
    const { currentConfig, chatHistory, agentState, sendMessage } = useAgentContext();
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatHistory, isOpen]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;
        const msg = inputValue;
        setInputValue('');
        await sendMessage(msg);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2">


            {/* Chat Window */}
            {isOpen && (
                <div className="w-[350px] h-[500px] bg-background border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-200">
                    {/* Header */}
                    <div className="p-3 border-b bg-muted/40 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={cn(
                                "w-2 h-2 rounded-full",
                                agentState === 'idle' ? "bg-muted-foreground" :
                                    agentState === 'thinking' ? "bg-yellow-500 animate-pulse" :
                                        agentState === 'speaking' ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                            )} />
                            <span className="font-semibold text-sm">
                                {currentConfig.page_id === 'global' ? 'AI Assistant' : `Agent: ${currentConfig.page_id}`}
                            </span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Chat History */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                        {chatHistory.length === 0 && (
                            <div className="text-center text-muted-foreground text-xs mt-10">
                                {t('agent.intro') || "How can I help you with this page?"}
                            </div>
                        )}
                        {chatHistory.map((msg, i) => (
                            <div key={i} className={cn(
                                "flex flex-col max-w-[85%] rounded-lg p-3 text-sm",
                                msg.role === 'user'
                                    ? "self-end bg-primary/10 text-foreground ml-auto"
                                    : "self-start bg-secondary text-secondary-foreground"
                            )}>
                                {msg.content}
                            </div>
                        ))}
                        {agentState === 'thinking' && (
                            <div className="self-start bg-secondary/50 rounded-lg p-3 flex gap-1">
                                <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" />
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-3 border-t bg-background flex gap-2">
                        <input
                            className="flex-1 bg-secondary/30 border-0 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                            placeholder="Ask a question..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={agentState === 'thinking' || agentState === 'speaking'}
                        />
                        <Button
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={handleSend}
                            disabled={!inputValue.trim() || agentState === 'thinking'}
                        >
                            {agentState === 'thinking' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>
            )}

            {/* Floating Toggle Button */}
            <Button
                size="lg"
                className={cn(
                    "rounded-full h-14 w-14 shadow-lg transition-all duration-300",
                    isOpen ? "rotate-0 scale-0 opacity-0" : "scale-100 opacity-100",
                    agentState === 'speaking' && "ring-4 ring-emerald-500/30 animate-pulse"
                )}
                onClick={() => setIsOpen(true)}
            >
                {agentState === 'speaking' ? (
                    <Volume2 className="w-6 h-6 animate-pulse" />
                ) : (
                    <MessageSquare className="w-6 h-6" />
                )}
            </Button>
        </div>
    );
}
