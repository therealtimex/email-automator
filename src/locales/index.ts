export type Locale = 'en' | 'fr' | 'es' | 'ja' | 'ko' | 'vi';

export const locales: Record<Locale, { name: string; flag: string }> = {
    en: { name: 'English', flag: '🇺🇸' },
    fr: { name: 'Français', flag: '🇫🇷' },
    es: { name: 'Español', flag: '🇪🇸' },
    ja: { name: '日本語', flag: '🇯🇵' },
    ko: { name: '한국어', flag: '🇰🇷' },
    vi: { name: 'Tiếng Việt', flag: '🇻🇳' },
};

// We export the default English translations to use as a fallback during the initial load
// or when a key is missing in other languages. 
// Note: In a production build, these will be bundled, but other languages will be lazy-loaded.
import enTranslations from './languages/en.json';

export const fallbackTranslations = enTranslations;
