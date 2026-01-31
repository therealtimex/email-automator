/**
 * Version Check Utility
 *
 * Detects when a newer version is available on npm and prompts users to update.
 * Solves the npx cache staleness issue.
 */

const NPM_REGISTRY_URL = 'https://registry.npmjs.org/@realtimex/email-automator/latest';
const VERSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const VERSION_CHECK_CACHE_KEY = 'email_automator_last_version_check';
const UPDATE_DISMISSED_KEY = 'email_automator_update_dismissed';

export interface VersionInfo {
    current: string;
    latest: string;
    updateAvailable: boolean;
    updateUrl?: string;
}

/**
 * Get current app version
 */
export function getCurrentVersion(): string {
    return import.meta.env.VITE_APP_VERSION || 'unknown';
}

/**
 * Fetch latest version from npm registry
 */
export async function getLatestVersion(): Promise<string | null> {
    try {
        const response = await fetch(NPM_REGISTRY_URL, {
            cache: 'no-store', // Force fresh fetch
        });

        if (!response.ok) {
            console.warn('[Version Check] Failed to fetch latest version');
            return null;
        }

        const data = await response.json();
        return data.version || null;
    } catch (error) {
        console.error('[Version Check] Error fetching latest version:', error);
        return null;
    }
}

/**
 * Compare semantic versions
 * Returns true if v2 > v1
 */
export function isNewerVersion(current: string, latest: string): boolean {
    if (current === 'unknown' || latest === 'unknown') return false;

    const parseVersion = (v: string) => {
        const cleaned = v.replace(/^v/, ''); // Remove 'v' prefix if present
        return cleaned.split('.').map(n => parseInt(n, 10) || 0);
    };

    const [major1, minor1, patch1] = parseVersion(current);
    const [major2, minor2, patch2] = parseVersion(latest);

    if (major2 > major1) return true;
    if (major2 < major1) return false;

    if (minor2 > minor1) return true;
    if (minor2 < minor1) return false;

    if (patch2 > patch1) return true;

    return false;
}

/**
 * Check if version check is needed (throttled)
 */
function shouldCheckVersion(): boolean {
    try {
        const lastCheck = localStorage.getItem(VERSION_CHECK_CACHE_KEY);
        if (!lastCheck) return true;

        const lastCheckTime = new Date(lastCheck).getTime();
        const now = Date.now();
        const timeSinceLastCheck = now - lastCheckTime;

        return timeSinceLastCheck > VERSION_CHECK_INTERVAL;
    } catch {
        return true;
    }
}

/**
 * Mark version check as done
 */
function markVersionChecked(): void {
    try {
        localStorage.setItem(VERSION_CHECK_CACHE_KEY, new Date().toISOString());
    } catch (error) {
        console.error('[Version Check] Error saving check timestamp:', error);
    }
}

/**
 * Check if user dismissed the update prompt recently
 * @param hoursToWait - Hours to wait before showing prompt again (default: 24)
 */
export function isUpdatePromptDismissed(hoursToWait = 24): boolean {
    try {
        const dismissedAt = localStorage.getItem(UPDATE_DISMISSED_KEY);
        if (!dismissedAt) return false;

        const dismissedTime = new Date(dismissedAt).getTime();
        const now = Date.now();
        const hoursSinceDismissal = (now - dismissedTime) / (1000 * 60 * 60);

        return hoursSinceDismissal < hoursToWait;
    } catch {
        return false;
    }
}

/**
 * Mark update prompt as dismissed
 */
export function dismissUpdatePrompt(): void {
    try {
        localStorage.setItem(UPDATE_DISMISSED_KEY, new Date().toISOString());
    } catch (error) {
        console.error('[Version Check] Error dismissing update prompt:', error);
    }
}

/**
 * Clear update prompt dismissal
 */
export function clearUpdatePromptDismissal(): void {
    try {
        localStorage.removeItem(UPDATE_DISMISSED_KEY);
    } catch (error) {
        console.error('[Version Check] Error clearing update dismissal:', error);
    }
}

/**
 * Main version check function
 * Returns version info if update is available, null otherwise
 */
export async function checkForUpdates(): Promise<VersionInfo | null> {
    // Throttle checks to avoid spamming npm registry
    if (!shouldCheckVersion()) {
        console.log('[Version Check] Skipping (throttled)');
        return null;
    }

    const current = getCurrentVersion();
    const latest = await getLatestVersion();

    markVersionChecked();

    if (!latest) {
        console.warn('[Version Check] Could not determine latest version');
        return null;
    }

    const updateAvailable = isNewerVersion(current, latest);

    console.log('[Version Check]', {
        current,
        latest,
        updateAvailable,
    });

    if (updateAvailable) {
        return {
            current,
            latest,
            updateAvailable: true,
            updateUrl: 'https://github.com/realtimex/email-automator/releases/latest',
        };
    }

    return null;
}

/**
 * Trigger app reload/restart
 * This prompts the user's environment (RealTimeX Desktop) to restart the npx process
 */
export function triggerAppRestart(): void {
    // For web: simple reload
    if (typeof window !== 'undefined') {
        window.location.reload();
    }

    // For desktop environments, this might trigger a restart via the parent process
    // RealTimeX Desktop should listen for this event
    if ((window as any).electron?.ipcRenderer) {
        (window as any).electron.ipcRenderer.send('restart-app');
    }
}
