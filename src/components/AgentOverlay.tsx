import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, X, MessageSquare, Loader2, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAgentContext } from '../context/AgentContext';
import { useApp } from '../context/AppContext';
import { useTTS } from '../hooks/useTTS';
import { useTTSContext } from '../context/TTSContext';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

// Get friendly page title
const getPageTitle = (pageId: string): string => {
    const titles: Record<string, string> = {
        'configuration_wizard': 'Configuration Helper',
        'draft_review': 'Draft Assistant',
        'explainer': 'Translation Helper',
        'global': 'AI Assistant'
    };
    return titles[pageId] || `${pageId.replace(/_/g, ' ')} Assistant`;
};

// Context-aware intro messages based on page_id
const getContextualIntro = (pageId: string, data?: any): string => {
    switch (pageId) {
        case 'configuration_wizard':
            const accountsCount = data?.accounts_count || 0;
            const rulesCount = data?.rules_count || 0;
            return `👋 Welcome to Configuration! I can help you:\n• Connect email accounts (${accountsCount} connected)\n• Set up automation rules (${rulesCount} active)\n• Configure LLM & TTS settings\n• Troubleshoot connection issues\n\nWhat would you like to set up?`;

        case 'draft_review':
            const draftsCount = data?.count || 0;
            return `📧 I'm your Draft Review Assistant!\n\nYou have ${draftsCount} pending draft${draftsCount !== 1 ? 's' : ''}.\n\nI can help you:\n• Summarize all drafts\n• Send or dismiss specific drafts\n• Preview draft content\n• Review recipients and subjects\n\nTry: "Summarize my drafts" or "Send the draft to John"`;

        case 'explainer':
            return `🌐 Translation & Explanation Helper\n\nI can help you understand:\n• What automation rules mean\n• How settings affect your workflow\n• Technical terms in plain language\n\nAsk me anything about what you're seeing!`;

        case 'global':
            return `👋 Hi! I'm your AI Assistant.\n\nI can help you navigate and understand any part of the Email Automator.\n\nWhat would you like to know?`;

        default:
            return `👋 Hi! I'm here to help with ${pageId.replace(/_/g, ' ')}.\n\nWhat can I assist you with?`;
    }
};

export function AgentOverlay({ className }: { className?: string }) {
    const { currentConfig, chatHistory, agentState, sendMessage } = useAgentContext();
    const { state } = useApp();
    const { speak } = useTTS();
    const { speakingId, stop } = useTTSContext();
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [hasSpokenIntro, setHasSpokenIntro] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const prevPageIdRef = useRef<string>(currentConfig.page_id);

    // Speech Recognition
    const {
        isListening,
        transcript,
        interimTranscript,
        isSupported,
        startListening,
        stopListening,
        resetTranscript
    } = useSpeechRecognition({ continuous: false, interimResults: true });

    // Auto-speak intro message when overlay opens or page changes
    useEffect(() => {
        const getTTSAutoPlay = (): boolean => {
            try {
                const stored = localStorage.getItem('auto_speak_enabled');
                return stored === null ? true : stored === 'true';
            } catch {
                return true;
            }
        };

        const shouldSpeak = isOpen &&
                           chatHistory.length === 0 &&
                           !hasSpokenIntro &&
                           getTTSAutoPlay();

        const pageChanged = currentConfig.page_id !== prevPageIdRef.current;

        if (shouldSpeak || (isOpen && pageChanged && chatHistory.length === 0)) {
            const introMessage = getContextualIntro(currentConfig.page_id, currentConfig.data);

            // Use user's configured TTS settings from Configuration
            const ttsOptions = {
                provider: state.settings?.tts_provider || undefined,
                voice: state.settings?.tts_voice || undefined,
                speed: state.settings?.tts_speed !== undefined ? state.settings.tts_speed : 1.0,
                quality: state.settings?.tts_quality !== undefined ? state.settings.tts_quality : 10
            };

            console.log('[AgentOverlay] Intro speaking with TTS options:', ttsOptions);
            speak(introMessage, `intro-${currentConfig.page_id}`, ttsOptions);
            setHasSpokenIntro(true);
            prevPageIdRef.current = currentConfig.page_id;
        }

        // Reset when overlay closes
        if (!isOpen) {
            setHasSpokenIntro(false);
        }
    }, [isOpen, chatHistory.length, currentConfig.page_id, hasSpokenIntro, speak]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatHistory, isOpen]);

    // Handle finalized speech transcript
    useEffect(() => {
        if (transcript && !isListening) {
            setInputValue(transcript.trim());
            resetTranscript();
        }
    }, [transcript, isListening, resetTranscript]);

    // Update input with interim results during listening
    useEffect(() => {
        if (isListening && (transcript || interimTranscript)) {
            setInputValue((transcript + ' ' + interimTranscript).trim());
        }
    }, [transcript, interimTranscript, isListening]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;
        const msg = inputValue;
        setInputValue('');
        resetTranscript();
        await sendMessage(msg);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleMicToggle = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    const handleSpeakMessage = async (message: string, index: number) => {
        const messageId = `msg-${index}`;

        // If this message is currently playing, stop it
        if (speakingId === messageId) {
            stop();
            return;
        }

        // Otherwise, play this message with user's configured settings
        const ttsOptions = {
            provider: state.settings?.tts_provider || undefined,
            voice: state.settings?.tts_voice || undefined,
            speed: state.settings?.tts_speed !== undefined ? state.settings.tts_speed : 1.0,
            quality: state.settings?.tts_quality !== undefined ? state.settings.tts_quality : 10
        };

        console.log('[AgentOverlay] Speaking with TTS options:', ttsOptions);
        await speak(message, messageId, ttsOptions);
    };

    const markdownComponents: Components = {
        p: ({ children }) => (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{children}</p>
        ),
        ul: ({ children }) => (
            <ul className="list-disc pl-4 space-y-1 text-sm">{children}</ul>
        ),
        ol: ({ children }) => (
            <ol className="list-decimal pl-4 space-y-1 text-sm">{children}</ol>
        ),
        li: ({ children }) => (
            <li className="text-sm">{children}</li>
        ),
        a: ({ href, children }) => (
            <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-2"
            >
                {children}
            </a>
        ),
        code: (props) => {
            const { inline, children } = props as { inline?: boolean; children?: React.ReactNode };
            return inline ? (
                <code className="px-1 py-0.5 rounded bg-background/60 text-[12px] font-mono">
                    {children}
                </code>
            ) : (
                <code className="text-[12px] font-mono">{children}</code>
            );
        },
        pre: ({ children }) => (
            <pre className="mt-2 overflow-x-auto rounded bg-background/60 p-2 text-[12px] font-mono">
                {children}
            </pre>
        ),
        blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-border pl-3 text-sm text-muted-foreground">
                {children}
            </blockquote>
        ),
        strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
        ),
        em: ({ children }) => (
            <em className="italic">{children}</em>
        )
    };

    return (
        <div className={cn("fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2", className)}>


            {/* Chat Window */}
            {isOpen && (
                <div
                    className={cn(
                        isExpanded
                            ? "w-[calc(100vw-2rem)] sm:w-[33vw] sm:max-w-[560px] h-[90vh] max-h-[calc(100vh-6rem)]"
                            : "w-[360px] sm:w-[380px] h-[520px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-6rem)]",
                        "bg-background border border-border/60 rounded-2xl shadow-2xl",
                        "flex flex-col overflow-hidden",
                        "animate-in slide-in-from-bottom-10 fade-in duration-200",
                        "transition-[width,height] duration-200 ease-out",
                        "motion-reduce:transition-none motion-reduce:animate-none"
                    )}
                >
                    {/* Header */}
                    <div className="p-3 border-b bg-muted/40 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={cn(
                                "w-2.5 h-2.5 rounded-full",
                                isListening ? "bg-red-500 animate-pulse" :
                                    agentState === 'idle' ? "bg-muted-foreground" :
                                        agentState === 'thinking' ? "bg-yellow-500 animate-pulse" :
                                            agentState === 'speaking' ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                            )} />
                            <div className="flex flex-col">
                                <span className="font-semibold text-sm leading-tight">
                                    {isListening ? 'Listening...' : getPageTitle(currentConfig.page_id)}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                    {agentState === 'thinking' ? 'Analyzing' : agentState === 'speaking' ? 'Speaking' : 'Ready'}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setIsExpanded((prev) => !prev)}
                                aria-label={isExpanded ? "Collapse assistant" : "Expand assistant"}
                                title={isExpanded ? "Collapse" : "Expand"}
                            >
                                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setIsOpen(false)}
                                aria-label="Close assistant"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Chat History */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
                        {chatHistory.length === 0 && (
                            <div className="text-center text-muted-foreground text-xs mt-10 whitespace-pre-line">
                                {getContextualIntro(currentConfig.page_id, currentConfig.data)}
                            </div>
                        )}
                        {chatHistory.map((msg, i) => {
                            const messageId = `msg-${i}`;
                            const isPlaying = speakingId === messageId;
                            const showSpeaker = msg.role !== 'user'; // Show speaker for assistant/system messages

                            return (
                                <div key={i} className={cn(
                                    "flex flex-col max-w-[85%] rounded-2xl p-3 text-sm relative group",
                                    msg.role === 'user'
                                        ? "self-end bg-primary/10 text-foreground ml-auto rounded-br-md"
                                        : "self-start bg-secondary text-secondary-foreground rounded-bl-md"
                                )}>
                                    <div className="flex items-start gap-2">
                                        <div className="flex-1">
                                            {msg.role === 'user' ? (
                                                msg.content
                                            ) : (
                                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                                    {msg.content}
                                                </ReactMarkdown>
                                            )}
                                        </div>
                                        {showSpeaker && (
                                            <button
                                            onClick={() => handleSpeakMessage(msg.content, i)}
                                            className={cn(
                                                "shrink-0 p-1.5 rounded-md hover:bg-background/60 transition-colors",
                                                "opacity-0 group-hover:opacity-100",
                                                isPlaying && "opacity-100"
                                            )}
                                            title={isPlaying ? "Stop speaking" : "Speak message"}
                                        >
                                                {isPlaying ? (
                                                    <VolumeX className="w-3.5 h-3.5 text-muted-foreground animate-pulse" />
                                                ) : (
                                                    <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {agentState === 'thinking' && (
                            <div className="self-start bg-secondary/50 rounded-lg p-3 flex gap-1">
                                <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" />
                            </div>
                        )}
                        {isListening && (
                            <div className="self-start bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex flex-col gap-2 animate-pulse">
                                <div className="flex items-center gap-2">
                                    <Mic className="w-4 h-4 text-red-500 animate-pulse" />
                                    <span className="text-xs font-semibold text-red-500">Recording...</span>
                                </div>
                                {/* Waveform Visualization */}
                                <div className="flex items-center justify-center gap-1 h-8">
                                    {[...Array(12)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="w-1 bg-red-500 rounded-full animate-pulse"
                                            style={{
                                                height: `${20 + Math.sin(i) * 15}px`,
                                                animationDelay: `${i * 0.1}s`,
                                                animationDuration: '0.8s'
                                            }}
                                        />
                                    ))}
                                </div>
                                {interimTranscript && (
                                    <div className="text-xs text-muted-foreground italic">
                                        "{interimTranscript}..."
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-3 border-t bg-background flex gap-2">
                        <input
                            className="flex-1 bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 outline-none"
                            placeholder={isListening ? "Listening..." : "Ask a question, or click the mic..."}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={agentState === 'thinking' || agentState === 'speaking' || isListening}
                        />
                        {isSupported && (
                            <Button
                                size="icon"
                                variant={isListening ? "default" : "outline"}
                                className={cn(
                                    "h-9 w-9 shrink-0",
                                    isListening && "bg-red-500 hover:bg-red-600 animate-pulse"
                                )}
                                onClick={handleMicToggle}
                                disabled={agentState === 'thinking' || agentState === 'speaking'}
                                aria-label={isListening ? "Stop listening" : "Start listening"}
                            >
                                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                            </Button>
                        )}
                        <Button
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={handleSend}
                            disabled={!inputValue.trim() || agentState === 'thinking' || isListening}
                            aria-label="Send message"
                        >
                            {agentState === 'thinking' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>
            )}

            {/* Floating Toggle Button */}
            <Button
                size="icon"
                className={cn(
                    "rounded-full h-11 w-11 border border-border/60 bg-primary text-primary-foreground shadow-md",
                    "transition-all duration-200 ease-out",
                    "hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5",
                    "active:translate-y-0 active:shadow-md active:scale-95",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    "motion-reduce:transition-none motion-reduce:hover:transform-none",
                    isOpen ? "rotate-0 scale-0 opacity-0" : "scale-100 opacity-100",
                    agentState === 'speaking' && "ring-4 ring-emerald-500/30 animate-pulse"
                )}
                onClick={() => setIsOpen(true)}
                aria-label="Open assistant chat"
                title="Open assistant chat"
            >
                {agentState === 'speaking' ? (
                    <Volume2 className="w-5 h-5 animate-pulse" />
                ) : (
                    <MessageSquare className="w-5 h-5" />
                )}
            </Button>
        </div>
    );
}
