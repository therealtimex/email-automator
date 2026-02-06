/**
 * Email Header Parsing Utilities
 *
 * Extracts and normalizes email headers for rule matching and LLM analysis
 */

import { ParsedMail } from 'mailparser';
import { createLogger } from './logger.js';

const logger = createLogger('EmailHeaders');

export interface ParsedEmailHeaders {
    // Raw headers (JSONB storage)
    raw: {
        to?: string;
        cc?: string;
        bcc?: string;
        from?: string;
        replyTo?: string;
        listUnsubscribe?: string;
        precedence?: string;
        autoSubmitted?: string;
        inReplyTo?: string;
        references?: string;
        xPriority?: string;
        importance?: string;
        xMailer?: string;
        returnPath?: string;
        messageId?: string;
    };

    // Parsed metadata (database columns)
    recipient_type: 'to' | 'cc' | 'bcc' | null;
    is_automated: boolean;
    has_unsubscribe: boolean;
    is_reply: boolean;
    thread_id: string | null;
    mailer: string | null;
    sender_priority: 'high' | 'normal' | 'low' | null;
}

/**
 * Extract and parse email headers from mailparser output
 */
export function parseEmailHeaders(
    parsed: ParsedMail,
    userEmail: string
): ParsedEmailHeaders {
    const headers = parsed.headers;

    // Helper to extract text from AddressObject (can be single or array)
    const getAddressText = (addr: any): string | undefined => {
        if (!addr) return undefined;
        if (Array.isArray(addr)) return addr[0]?.text;
        return addr.text;
    };

    // Extract raw header values
    // NOTE: Use parsed.addressField.text for email addresses (not headers.get().toString())
    // because mailparser returns AddressObject which serializes to [object Object]
    const raw = {
        to: getAddressText(parsed.to) || headers.get('to')?.toString(),
        cc: getAddressText(parsed.cc) || headers.get('cc')?.toString(),
        bcc: getAddressText(parsed.bcc) || headers.get('bcc')?.toString(),
        from: getAddressText(parsed.from) || headers.get('from')?.toString(),
        replyTo: getAddressText(parsed.replyTo) || headers.get('reply-to')?.toString(),
        listUnsubscribe: headers.get('list-unsubscribe')?.toString(),
        precedence: headers.get('precedence')?.toString(),
        autoSubmitted: headers.get('auto-submitted')?.toString(),
        inReplyTo: headers.get('in-reply-to')?.toString(),
        references: headers.get('references')?.toString(),
        xPriority: headers.get('x-priority')?.toString(),
        importance: headers.get('importance')?.toString(),
        xMailer: headers.get('x-mailer')?.toString(),
        returnPath: headers.get('return-path')?.toString(),
        messageId: headers.get('message-id')?.toString(),
    };

    // Parse recipient type (how user received this email)
    const recipient_type = determineRecipientType(raw, userEmail);

    // Detect automated/bulk emails
    const is_automated = isAutomatedEmail(raw);

    // Check for unsubscribe header
    const has_unsubscribe = !!raw.listUnsubscribe;

    // Detect if this is a reply
    const is_reply = !!raw.inReplyTo || !!raw.references;

    // Extract thread ID (use In-Reply-To or Message-ID)
    const thread_id = raw.inReplyTo || raw.messageId || null;

    // Extract mailer (normalize to common names)
    const mailer = normalizeMailer(raw.xMailer);

    // Parse sender priority
    const sender_priority = parsePriority(raw.xPriority, raw.importance);

    return {
        raw,
        recipient_type,
        is_automated,
        has_unsubscribe,
        is_reply,
        thread_id,
        mailer,
        sender_priority,
    };
}

/**
 * Determine how user received this email (To/CC/BCC)
 */
function determineRecipientType(
    raw: ParsedEmailHeaders['raw'],
    userEmail: string
): 'to' | 'cc' | 'bcc' | null {
    if (!userEmail) return null;

    const normalizedUser = userEmail.toLowerCase();

    // Check To field
    if (raw.to && raw.to.toLowerCase().includes(normalizedUser)) {
        return 'to';
    }

    // Check CC field
    if (raw.cc && raw.cc.toLowerCase().includes(normalizedUser)) {
        return 'cc';
    }

    // Check BCC field (rarely available, but check anyway)
    if (raw.bcc && raw.bcc.toLowerCase().includes(normalizedUser)) {
        return 'bcc';
    }

    // If user email not found in To/CC/BCC, assume 'to' (direct recipient)
    // This handles cases where user has multiple email aliases
    return 'to';
}

/**
 * Detect automated/bulk emails from headers
 */
function isAutomatedEmail(raw: ParsedEmailHeaders['raw']): boolean {
    // Check List-Unsubscribe (newsletter/marketing indicator)
    if (raw.listUnsubscribe) return true;

    // Check Precedence header
    if (raw.precedence) {
        const prec = raw.precedence.toLowerCase();
        if (prec.includes('bulk') || prec.includes('list') || prec.includes('junk')) {
            return true;
        }
    }

    // Check Auto-Submitted header
    if (raw.autoSubmitted) {
        const auto = raw.autoSubmitted.toLowerCase();
        if (auto !== 'no' && auto.includes('auto')) {
            return true;
        }
    }

    // Check for bulk mailer indicators
    if (raw.xMailer) {
        const mailer = raw.xMailer.toLowerCase();
        const bulkMailers = [
            'mailchimp',
            'sendgrid',
            'mailgun',
            'postmark',
            'amazon ses',
            'mandrill',
            'constant contact',
            'campaign monitor',
        ];
        if (bulkMailers.some(bulk => mailer.includes(bulk))) {
            return true;
        }
    }

    // Check sender email patterns (noreply, no-reply, automated addresses)
    if (raw.from) {
        const fromLower = raw.from.toLowerCase();
        const automatedPatterns = [
            'noreply@',
            'no-reply@',
            'no_reply@',
            'donotreply@',
            'do-not-reply@',
            'notifications@',
            'notify@',
            'alerts@',
            'updates@',
            'newsletter@',
            'auto@',
            'automated@',
            'bounce@',
            'mailer-daemon@',
        ];
        if (automatedPatterns.some(pattern => fromLower.includes(pattern))) {
            return true;
        }
    }

    // Check for known automated sender domains
    if (raw.from) {
        const fromLower = raw.from.toLowerCase();
        const automatedDomains = [
            'facebookmail.com',
            'linkedin.com',
            'twitter.com',
            'github.com',
            'notifications.google.com',
            'mail.google.com',
            'amazonses.com',
            'sendgrid.net',
            'mailgun.org',
        ];
        if (automatedDomains.some(domain => fromLower.includes(`@${domain}`))) {
            return true;
        }
    }

    return false;
}

/**
 * Normalize mailer names to common identifiers
 */
function normalizeMailer(xMailer: string | undefined): string | null {
    if (!xMailer) return null;

    const mailer = xMailer.toLowerCase();

    // Common bulk email services
    if (mailer.includes('mailchimp')) return 'Mailchimp';
    if (mailer.includes('sendgrid')) return 'SendGrid';
    if (mailer.includes('mailgun')) return 'Mailgun';
    if (mailer.includes('postmark')) return 'Postmark';
    if (mailer.includes('amazon ses') || mailer.includes('aws')) return 'Amazon SES';
    if (mailer.includes('mandrill')) return 'Mandrill';
    if (mailer.includes('constant contact')) return 'Constant Contact';
    if (mailer.includes('campaign monitor')) return 'Campaign Monitor';

    // Email clients
    if (mailer.includes('outlook')) return 'Outlook';
    if (mailer.includes('gmail')) return 'Gmail';
    if (mailer.includes('apple mail')) return 'Apple Mail';
    if (mailer.includes('thunderbird')) return 'Thunderbird';

    // Return first 50 chars if unrecognized
    return xMailer.substring(0, 50);
}

/**
 * Parse email priority from X-Priority or Importance headers
 */
function parsePriority(
    xPriority: string | undefined,
    importance: string | undefined
): 'high' | 'normal' | 'low' | null {
    // Check X-Priority (numeric: 1=high, 3=normal, 5=low)
    if (xPriority) {
        const priority = parseInt(xPriority.trim(), 10);
        if (priority === 1 || priority === 2) return 'high';
        if (priority === 4 || priority === 5) return 'low';
        return 'normal';
    }

    // Check Importance header
    if (importance) {
        const imp = importance.toLowerCase().trim();
        if (imp === 'high') return 'high';
        if (imp === 'low') return 'low';
        return 'normal';
    }

    return null;
}

/**
 * Extract email addresses from a header value (handles multiple formats)
 */
export function extractEmailAddresses(headerValue: string | undefined): string[] {
    if (!headerValue) return [];

    const emailRegex = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi;
    return headerValue.match(emailRegex) || [];
}
