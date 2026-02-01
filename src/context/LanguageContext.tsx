import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Locale, fallbackTranslations } from '../locales';

interface LanguageContextType {
    language: Locale;
    setLanguage: (lang: Locale) => void;
    t: (key: string) => string;
    isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Locale>(() => {
        const saved = localStorage.getItem('app_language');
        return (saved as Locale) || 'en';
    });

    const [translations, setTranslations] = useState<Record<string, string>>(
        language === 'en' ? fallbackTranslations : {}
    );
    const [isLoading, setIsLoading] = useState(language !== 'en');

    useEffect(() => {
        localStorage.setItem('app_language', language);
        document.documentElement.lang = language;

        // Dynamic load of the translation file
        const loadTranslations = async () => {
            if (language === 'en') {
                setTranslations(fallbackTranslations);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                // Using Vite's dynamic import which automatically handles chunking
                const module = await import(`../locales/languages/${language}.json`);
                setTranslations(module.default);
            } catch (error) {
                console.error(`Failed to load translations for ${language}:`, error);
                // Fallback to English on error
                setTranslations(fallbackTranslations);
            } finally {
                setIsLoading(false);
            }
        };

        loadTranslations();
    }, [language]);

    const setLanguage = (lang: Locale) => {
        setLanguageState(lang);
    };

    const t = (key: string): string => {
        // 1. Try current language
        // 2. Try English fallback
        // 3. Return key
        return translations[key] || fallbackTranslations[key as keyof typeof fallbackTranslations] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, isLoading }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
