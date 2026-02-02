import { createLogger } from './logger.js';
import { SupabaseClient } from '@supabase/supabase-js';

const logger = createLogger('NameExtraction');

/**
 * Extracts sender name from email address or From header
 * Handles formats like:
 * - "John Doe" <john@example.com>
 * - John Doe <john@example.com>
 * - john@example.com
 */
export function extractSenderName(fromHeader: string): string {
    // Try to extract display name from "Name" <email> format
    const displayNameMatch = fromHeader.match(/^"?([^"<]+)"?\s*</);
    if (displayNameMatch) {
        const name = displayNameMatch[1].trim();
        // Avoid returning email addresses as names
        if (!name.includes('@')) {
            return name;
        }
    }

    // Try to extract email address
    const emailMatch = fromHeader.match(/<([^>]+)>/) || fromHeader.match(/([^\s<>]+@[^\s<>]+)/);
    if (emailMatch) {
        const email = emailMatch[1];
        // Use username part as fallback: john.doe@example.com → "John Doe"
        const username = email.split('@')[0];
        // Convert john.doe or john_doe to "John Doe"
        return username
            .split(/[._-]/)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(' ');
    }

    // Last resort: return the whole thing cleaned up
    return fromHeader.trim();
}

/**
 * Fetches user's full name from database
 * Tries user_preferences first, then profiles table
 */
export async function getUserName(supabase: SupabaseClient, userId: string): Promise<string> {
    try {
        // Try user_preferences first
        const { data: prefs } = await supabase
            .from('user_preferences')
            .select('full_name')
            .eq('user_id', userId)
            .single();

        if (prefs?.full_name) {
            return prefs.full_name;
        }

        // Fallback to profiles table
        const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', userId)
            .single();

        if (profile?.name) {
            return profile.name;
        }

        logger.warn('No user name found in database', { userId });
        return 'User'; // Final fallback
    } catch (error) {
        logger.error('Failed to fetch user name', error, { userId });
        return 'User';
    }
}

/**
 * Replaces placeholders in draft content with actual names
 * Handles:
 * - [Sender Name]
 * - [Your Name]
 * - [User Name]
 */
export function replacePlaceholders(
    draft: string,
    senderName: string,
    userName: string
): string {
    return draft
        .replace(/\[Sender Name\]/gi, senderName)
        .replace(/\[Your Name\]/gi, userName)
        .replace(/\[User Name\]/gi, userName);
}

/**
 * Validates that draft doesn't contain unreplaced placeholders
 * Throws error if placeholders are detected
 */
export function validateDraft(draft: string): void {
    const placeholderPattern = /\[[^\]]*(?:name|sender|user|recipient)[^\]]*\]/gi;
    const matches = draft.match(placeholderPattern);

    if (matches && matches.length > 0) {
        throw new Error(`Draft contains unreplaced placeholders: ${matches.join(', ')}`);
    }
}

/**
 * Complete pipeline: extract names, replace placeholders, validate
 */
export async function processDraftWithNames(
    draft: string,
    senderEmail: string,
    userId: string,
    supabase: SupabaseClient
): Promise<string> {
    // Extract sender name
    const senderName = extractSenderName(senderEmail);

    // Fetch user name
    const userName = await getUserName(supabase, userId);

    // Replace placeholders
    const processedDraft = replacePlaceholders(draft, senderName, userName);

    // Validate no placeholders remain
    validateDraft(processedDraft);

    logger.debug('Draft processed with names', {
        senderName,
        userName,
        hadPlaceholders: draft !== processedDraft
    });

    return processedDraft;
}
