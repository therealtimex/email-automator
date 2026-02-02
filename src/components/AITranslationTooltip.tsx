import React, { useState } from 'react';
import { HelpCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

interface AITranslationTooltipProps {
    term: string;
    context?: string;
    className?: string;
}

export function AITranslationTooltip({ term, context, className }: AITranslationTooltipProps) {
    const { t } = useLanguage();
    const [explanation, setExplanation] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const handleExplain = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (isOpen) {
            setIsOpen(false);
            return;
        }

        setIsOpen(true);
        if (explanation) return; // Cached

        setLoading(true);
        try {
            const res = await fetch('/api/agent/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: `Explain this term briefly: "${term}". Context: ${context || 'Email Automation App'}`,
                    context: {
                        page_id: 'explainer',
                        system_instruction: "You are a helpful UI Explainer. Provide 1-sentence clear explanations for technical terms."
                    }
                })
            });
            const data = await res.json();
            if (data.success && data.response) {
                setExplanation(data.response.content);
            } else {
                setExplanation("Could not load explanation.");
            }
        } catch (err) {
            setExplanation("Error loading explanation.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative inline-block">
            <button
                onClick={handleExplain}
                className={cn("text-muted-foreground hover:text-primary transition-colors ml-1 align-middle", className)}
                title="AI Explain"
            >
                <HelpCircle className="w-4 h-4" />
            </button>

            {isOpen && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-popover border text-popover-foreground text-xs rounded-md shadow-lg p-3 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="font-semibold mb-1 border-b pb-1 flex justify-between items-center">
                        {term}
                        <span className="text-[10px] bg-primary/10 text-primary px-1 rounded">AI</span>
                    </div>
                    <div>
                        {loading ? (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                {t('common.loading') || 'Thinking...'}
                            </div>
                        ) : (
                            explanation
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
