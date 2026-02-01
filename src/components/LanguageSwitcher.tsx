import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { locales, Locale } from '../locales';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface LanguageSwitcherProps {
    className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
    const { language, setLanguage } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const currentLocale = locales[language];

    return (
        <div className={cn("relative z-50", className)} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200",
                    "bg-secondary/50 hover:bg-secondary border border-border/50 hover:border-border shadow-sm",
                    isOpen && "ring-2 ring-primary/20 border-primary/50"
                )}
            >
                <span className="text-lg leading-none">{currentLocale.flag}</span>
                <span className="text-xs font-medium uppercase tracking-wider">{language}</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className={cn(
                    "absolute right-0 mt-2 w-48 rounded-xl border border-border bg-card p-1.5 shadow-xl animate-in fade-in zoom-in duration-200",
                    "backdrop-blur-xl"
                )}>
                    <div className="px-2 py-1.5 mb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Choose Language
                    </div>
                    {Object.entries(locales).map(([code, { name, flag }]) => (
                        <button
                            key={code}
                            onClick={() => {
                                setLanguage(code as Locale);
                                setIsOpen(false);
                            }}
                            className={cn(
                                "flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-colors",
                                language === code
                                    ? "bg-primary/10 text-primary font-bold"
                                    : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-lg leading-none">{flag}</span>
                                <span>{name}</span>
                            </div>
                            {language === code && <Check className="w-4 h-4" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
