import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, X, MessageSquare, Loader2, Volume2, VolumeX } from 'lucide-react';
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

export function AgentOverlay() {
    const { currentConfig, chatHistory, agentState, sendMessage } = useAgentContext();
    const { state } = useApp();
    const { speak } = useTTS();
    const { speakingId, stop } = useTTSContext();
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [hasSpokenIntro, setHasSpokenIntro] = useState(false);
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
                                isListening ? "bg-red-500 animate-pulse" :
                                    agentState === 'idle' ? "bg-muted-foreground" :
                                        agentState === 'thinking' ? "bg-yellow-500 animate-pulse" :
                                            agentState === 'speaking' ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                            )} />
                            <span className="font-semibold text-sm">
                                {isListening ? 'Listening...' : getPageTitle(currentConfig.page_id)}
                            </span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Chat History */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
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
                                    "flex flex-col max-w-[85%] rounded-lg p-3 text-sm relative group",
                                    msg.role === 'user'
                                        ? "self-end bg-primary/10 text-foreground ml-auto"
                                        : "self-start bg-secondary text-secondary-foreground"
                                )}>
                                    <div className="flex items-start gap-2">
                                        <div className="flex-1">{msg.content}</div>
                                        {showSpeaker && (
                                            <button
                                                onClick={() => handleSpeakMessage(msg.content, i)}
                                                className={cn(
                                                    "shrink-0 p-1 rounded hover:bg-background/60 transition-colors",
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
                            className="flex-1 bg-secondary/30 border-0 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                            placeholder={isListening ? "Listening..." : "Ask a question or click mic..."}
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
                            >
                                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                            </Button>
                        )}
                        <Button
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={handleSend}
                            disabled={!inputValue.trim() || agentState === 'thinking' || isListening}
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
