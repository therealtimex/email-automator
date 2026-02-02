import { createLogger } from './logger.js';

const logger = createLogger('SenderValidation');

/**
 * Patterns that indicate automated/noreply senders
 * These should NEVER receive draft replies
 */
const NOREPLY_PATTERNS = [
    /noreply@/i,
    /no-reply@/i,
    /no_reply@/i,
    /notification@/i,
    /notifications@/i,
    /mailer-daemon@/i,
    /do-not-reply@/i,
    /donotreply@/i,
    /automated@/i,
    /bounce@/i,
    /postmaster@/i,
    /messages-noreply@/i, // LinkedIn
    /notify@/i,
    /alerts@/i,
    /updates@/i,
];

/**
 * Platform domains that send automated notifications
 * Even if the sender doesn't match noreply patterns, these are automated
 */
const AUTOMATED_DOMAINS = [
    'linkedin.com',
    'github.com',
    'twitter.com',
    'facebook.com',
    'instagram.com',
    'slack.com',
    'discord.com',
    'reddit.com',
    'medium.com',
    'substack.com',
];

/**
 * Checks if sender is a noreply/automated address
 * Returns true if we should SKIP draft generation
 */
export function shouldSkipDraft(senderEmail: string): boolean {
    const email = senderEmail.toLowerCase();

    // Check noreply patterns
    const matchesPattern = NOREPLY_PATTERNS.some(pattern => pattern.test(email));
    if (matchesPattern) {
        logger.debug('Sender matches noreply pattern', { senderEmail });
        return true;
    }

    // Check automated domains
    const domain = email.split('@')[1];
    if (domain && AUTOMATED_DOMAINS.some(d => domain.includes(d))) {
        logger.debug('Sender from automated domain', { senderEmail, domain });
        return true;
    }

    return false;
}

/**
 * Extracts domain from email address
 */
export function extractDomain(email: string): string {
    const parts = email.split('@');
    return parts.length > 1 ? parts[1].toLowerCase() : '';
}

/**
 * Checks if email is from a platform notification
 * More specific than shouldSkipDraft - for categorization
 */
export function isPlatformNotification(senderEmail: string, subject?: string): boolean {
    const domain = extractDomain(senderEmail);

    // Check if from known platform
    const isFromPlatform = AUTOMATED_DOMAINS.some(d => domain.includes(d));

    // Additional subject-based checks
    if (subject) {
        const subjectLower = subject.toLowerCase();
        const notificationKeywords = [
            'wants to connect',
            'sent you a message',
            'mentioned you',
            'commented on',
            'liked your',
            'followed you',
            'new notification',
            'activity on',
        ];

        const hasNotificationKeyword = notificationKeywords.some(kw =>
            subjectLower.includes(kw)
        );

        if (isFromPlatform && hasNotificationKeyword) {
            return true;
        }
    }

    return isFromPlatform;
}

/**
 * Determines if email is likely a newsletter
 * Based on sender patterns and headers
 */
export function isLikelyNewsletter(senderEmail: string, headers?: {
    listUnsubscribe?: string;
    autoSubmitted?: string;
}): boolean {
    // Check for List-Unsubscribe header (strong signal)
    if (headers?.listUnsubscribe) {
        return true;
    }

    // Check for Auto-Submitted header
    if (headers?.autoSubmitted && headers.autoSubmitted !== 'no') {
        return true;
    }

    // Check sender patterns
    const email = senderEmail.toLowerCase();
    const newsletterPatterns = [
        /newsletter@/i,
        /news@/i,
        /marketing@/i,
        /promo@/i,
        /promotions@/i,
        /updates@/i,
        /digest@/i,
    ];

    return newsletterPatterns.some(pattern => pattern.test(email));
}
