/**
 * Centralized TTS Settings Synchronization
 * Ensures localStorage and database stay in sync
 */

import { UserSettings } from './types';

/**
 * Sync TTS settings from database to localStorage
 * This is the single source of truth synchronization
 */
export function syncTTSToLocalStorage(settings: UserSettings | null): void {
    if (!settings) {
        console.warn('[TTS Sync] No settings provided, skipping sync');
        return;
    }

    try {
        // Sync TTS provider (required)
        const provider = settings.tts_provider || 'piper_local';
        localStorage.setItem('tts_provider', provider);

        // Sync voice (optional - can be null)
        if (settings.tts_voice) {
            localStorage.setItem('tts_voice', settings.tts_voice);
        } else {
            localStorage.removeItem('tts_voice');
        }

        // Sync speed (default to 1.0)
        const speed = settings.tts_speed ?? 1.0;
        localStorage.setItem('tts_speed', speed.toString());

        // Sync quality (default to 10)
        const quality = settings.tts_quality ?? 10;
        localStorage.setItem('tts_quality', quality.toString());

        // Sync auto-play (default to true)
        const autoPlay = settings.tts_auto_play ?? true;
        localStorage.setItem('auto_speak_enabled', autoPlay.toString());

        console.log('[TTS Sync] Synced to localStorage:', {
            provider,
            voice: settings.tts_voice || '(none)',
            speed,
            quality,
            autoPlay
        });
    } catch (error) {
        console.error('[TTS Sync] Failed to sync to localStorage:', error);
    }
}

/**
 * Clear TTS settings from localStorage
 * Call this on logout to prevent stale data
 */
export function clearTTSFromLocalStorage(): void {
    try {
        localStorage.removeItem('tts_provider');
        localStorage.removeItem('tts_voice');
        localStorage.removeItem('tts_speed');
        localStorage.removeItem('tts_quality');
        localStorage.removeItem('auto_speak_enabled');
        console.log('[TTS Sync] Cleared from localStorage');
    } catch (error) {
        console.error('[TTS Sync] Failed to clear localStorage:', error);
    }
}

/**
 * Get TTS settings from localStorage
 * Fallback to defaults if not found
 */
export function getTTSFromLocalStorage(): {
    provider?: string;
    voice?: string;
    speed: number;
    quality: number;
    autoPlay: boolean;
} {
    try {
        const provider = localStorage.getItem('tts_provider') || undefined;
        const voice = localStorage.getItem('tts_voice') || undefined;
        const speed = parseFloat(localStorage.getItem('tts_speed') || '1.0');
        const quality = parseInt(localStorage.getItem('tts_quality') || '10', 10);
        const autoPlay = localStorage.getItem('auto_speak_enabled') !== 'false';

        return { provider, voice, speed, quality, autoPlay };
    } catch (error) {
        console.error('[TTS Sync] Failed to read from localStorage:', error);
        return { speed: 1.0, quality: 10, autoPlay: true };
    }
}

/**
 * Verify localStorage and database are in sync
 * Returns true if in sync, false if mismatch detected
 */
export function verifyTTSSync(dbSettings: UserSettings | null): boolean {
    if (!dbSettings) return false;

    const localSettings = getTTSFromLocalStorage();

    const dbProvider = dbSettings.tts_provider || 'piper_local';
    const dbVoice = dbSettings.tts_voice || undefined;
    const dbSpeed = dbSettings.tts_speed ?? 1.0;
    const dbQuality = dbSettings.tts_quality ?? 10;

    const isProviderSync = localSettings.provider === dbProvider;
    const isVoiceSync = localSettings.voice === dbVoice;
    const isSpeedSync = Math.abs(localSettings.speed - dbSpeed) < 0.01;
    const isQualitySync = localSettings.quality === dbQuality;

    const inSync = isProviderSync && isVoiceSync && isSpeedSync && isQualitySync;

    if (!inSync) {
        console.warn('[TTS Sync] Mismatch detected:', {
            provider: { db: dbProvider, local: localSettings.provider, match: isProviderSync },
            voice: { db: dbVoice, local: localSettings.voice, match: isVoiceSync },
            speed: { db: dbSpeed, local: localSettings.speed, match: isSpeedSync },
            quality: { db: dbQuality, local: localSettings.quality, match: isQualitySync }
        });
    }

    return inSync;
}
