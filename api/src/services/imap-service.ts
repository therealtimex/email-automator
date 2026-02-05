import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';
import { simpleParser } from 'mailparser';
import { createLogger } from '../utils/logger.js';
import { decrypt, encrypt } from '../utils/encryption.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ValidationError } from '../middleware/errorHandler.js';

const logger = createLogger('ImapService');

export interface ImapConfig {
    host: string;
    port: number;
    secure: boolean;
    // user: string; // Removed redundant field
    auth: {
        user: string;
        pass: string; // This will be encrypted in DB, but decrypted for use here
    };
}

export interface SmtpConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
}

export interface EmailMessage {
    id: string; // IMAP UID
    threadId: string; // Using Message-ID or similar
    internalDate: string; // Date string
    raw: Buffer; // Raw MIME bytes
}

export class ImapService {
    async verifyConnection(imapConfig: ImapConfig, smtpConfig: SmtpConfig): Promise<boolean> {
        const client = new ImapFlow({
            host: imapConfig.host,
            port: imapConfig.port,
            secure: imapConfig.secure,
            auth: imapConfig.auth,
            logger: false
        });

        try {
            await client.connect();
            await client.logout();

            const transporter = nodemailer.createTransport(smtpConfig);
            await transporter.verify();

            return true;
        } catch (error: any) {
            logger.warn('Connection verification failed', { error: error.message });
            // Map connection errors to 400 Bad Request
            throw new ValidationError(`Connection failed: ${error.message || 'Invalid credentials or server settings'}`);
        } finally {
            try {
                await client.close();
            } catch (closeError) {
                // Ignore close errors if connection failed
            }
        }
    }

    async saveAccount(
        supabase: SupabaseClient,
        userId: string,
        email: string,
        imapConfig: ImapConfig,
        smtpConfig: SmtpConfig
    ) {
        // Encrypt passwords before saving
        const encryptedImapPass = encrypt(imapConfig.auth.pass);
        const encryptedSmtpPass = encrypt(smtpConfig.auth.pass);

        const dbImapConfig = {
            ...imapConfig,
            auth: { ...imapConfig.auth, pass: encryptedImapPass }
        };

        const dbSmtpConfig = {
            ...smtpConfig,
            auth: { ...smtpConfig.auth, pass: encryptedSmtpPass }
        };

        const { data, error } = await supabase
            .from('email_accounts')
            .upsert({
                user_id: userId,
                email_address: email,
                provider: 'imap', // Generic provider name
                connection_type: 'imap',
                imap_config: dbImapConfig,
                smtp_config: dbSmtpConfig,
                is_active: true,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id, email_address' })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    private getConfigs(account: any): { imap: ImapConfig, smtp: SmtpConfig } {
        if (!account.imap_config || !account.smtp_config) {
            throw new Error('Missing IMAP/SMTP configuration');
        }

        const imap: ImapConfig = { ...account.imap_config };
        // Decrypt password
        if (typeof imap.auth.pass === 'object') {
            imap.auth.pass = decrypt(imap.auth.pass as any);
        }

        const smtp: SmtpConfig = { ...account.smtp_config };
        if (typeof smtp.auth.pass === 'object') {
            smtp.auth.pass = decrypt(smtp.auth.pass as any);
        }

        return { imap, smtp };
    }

    private async runImapOp<T>(account: any, op: (client: ImapFlow) => Promise<T>): Promise<T> {
        const { imap } = this.getConfigs(account);
        const client = new ImapFlow({
            host: imap.host,
            port: imap.port,
            secure: imap.secure,
            auth: imap.auth,
            logger: false
        });

        await client.connect();
        try {
            return await op(client);
        } finally {
            await client.logout();
        }
    }

    async fetchMessagesOldestFirst(
        account: any,
        options: { limit: number; minTimestamp?: number }
    ): Promise<{ messages: EmailMessage[]; hasMore: boolean }> {
        return this.runImapOp(account, async (client) => {
            const lock = await client.getMailboxLock('INBOX');
            try {
                // Determine the total number of messages
                const status = await client.status('INBOX', { messages: true });
                const total = status.messages || 0;

                if (total === 0) return { messages: [], hasMore: false };

                let targetUids: string[] = [];
                let hasMore = false;

                if (options.minTimestamp) {
                    // STAGE 1: Lightweight Search
                    // Filter mainly by Day (SINCE ignores time)
                    const sinceDate = new Date(options.minTimestamp);
                    const searchCriteria = { since: sinceDate };

                    // fetch specific sequence numbers from search
                    const searchResult = await client.search(searchCriteria);
                    const seqNums = Array.isArray(searchResult) ? searchResult : [];

                    if (seqNums.length === 0) {
                        return { messages: [], hasMore: false };
                    }

                    // STAGE 2: Precise Filtering (Headers Only)
                    // We need to fetch InternalDate for these candidates to filter by millisecond
                    // Optimisation: If too many results, we might want to batch this. 
                    // But typically day-volume is manageable. If huge, we take first 1000.

                    const batchSeqs = seqNums.slice(0, 1000); // safety cap for metadata fetch
                    const range = batchSeqs.map(String).join(',');

                    const candidates: { uid: string; date: number }[] = [];

                    const metaFetcher = client.fetch(range, { uid: true, internalDate: true });

                    for await (const msg of metaFetcher) {
                        const date = msg.internalDate instanceof Date ? msg.internalDate.getTime() : 0;
                        // Strict > minTimestamp to avoid loops on same-millisecond edge cases
                        // (Use >= if we handle deduplication elsewhere, but > is safer for checkpointing)
                        if (date > options.minTimestamp) {
                            candidates.push({ uid: msg.uid.toString(), date });
                        }
                    }

                    // Sort candidates oldest first (should be already, but ensure)
                    candidates.sort((a, b) => a.date - b.date);

                    // STAGE 3: Targeted Selection
                    // Take the first 'limit' valid UIDs
                    targetUids = candidates.slice(0, options.limit).map(c => c.uid);

                    // Check if more exist
                    hasMore = candidates.length > options.limit || seqNums.length > 1000;

                } else {
                    // Fallback to absolute oldest (Sequence 1..N) if no timestamp provided
                    const end = Math.min(options.limit, total);
                    const range = `1:${end}`;
                    const fetcher = client.fetch(range, { uid: true });
                    for await (const msg of fetcher) {
                        targetUids.push(msg.uid.toString());
                    }
                    hasMore = total > options.limit;
                }

                if (targetUids.length === 0) {
                    return { messages: [], hasMore: false };
                }

                // STAGE 4: Full Content Download
                // Now fetch bodies for the specific UIDs we selected
                const messages: EmailMessage[] = [];

                // Construct UID range string (e.g. "100,102,105")
                const uidRange = targetUids.join(',');

                const contentFetcher = client.fetch(uidRange, {
                    uid: true,
                    internalDate: true,
                    source: true,
                    envelope: true
                }, { uid: true }); // Important: Tell fetch we are passing UIDs, not Sequence Numbers

                for await (const msg of contentFetcher) {
                    messages.push({
                        id: msg.uid.toString(),
                        threadId: (msg.envelope?.messageId || msg.uid.toString()).replace(/[<>]/g, ''),
                        internalDate: msg.internalDate ? (msg.internalDate instanceof Date ? msg.internalDate.toISOString() : String(msg.internalDate)) : new Date().toISOString(),
                        raw: msg.source || Buffer.alloc(0)
                    });
                }

                return { messages, hasMore };

            } finally {
                lock.release();
            }
        });
    }

    async trashMessage(account: any, uid: string) {
        return this.runImapOp(account, async (client) => {
            await client.mailboxOpen('INBOX');
            // Try to move to Trash/Bin/Deleted Items
            // Auto-detect trash folder?
            // Common names: Trash, [Gmail]/Trash, Deleted Items, Bin
            const list = await client.list();
            const trash = list.find(f =>
                f.specialUse === '\\Trash' ||
                f.name.toLowerCase().includes('trash') ||
                f.name.toLowerCase().includes('deleted')
            );

            if (trash) {
                await client.messageMove(uid, trash.path);
            } else {
                // If no trash, just delete (add \Deleted flag)
                await client.messageDelete(uid);
            }
        });
    }

    async archiveMessage(account: any, uid: string) {
        return this.runImapOp(account, async (client) => {
            // For Gmail IMAP, 'archive' means removing from Inbox (removing \Inbox label or moving to All Mail)
            // For standard IMAP, it usually means moving to 'Archive' folder.

            await client.mailboxOpen('INBOX');

            // Check if it's Gmail (usually has [Gmail] folders)
            // But simpler strategy: Move to "Archive" folder if exists, or remove Inbox tag?
            // Standard way: Messages in Inbox are there. To archive, move them to another folder.

            const list = await client.list();
            const archive = list.find(f =>
                f.specialUse === '\\Archive' ||
                f.name.toLowerCase() === 'archive' ||
                f.name === '[Gmail]/All Mail' // Gmail specific
            );

            if (archive) {
                await client.messageMove(uid, archive.path);
            } else {
                logger.warn('No Archive folder found for account', { email: account.email_address });
                throw new Error(`Archive failed: No 'Archive' or 'All Mail' folder found for this account.`);
            }
        });
    }

    async sendReply(account: any, originalMessageId: string, replyContent: string, subject: string) {
        // Fetch original message details for threading
        return this.runImapOp(account, async (client) => {
            const lock = await client.getMailboxLock('INBOX');
            try {
                // Fetch envelope for threading info
                // originalMessageId is assumed to be the IMAP UID here
                const message = await client.fetchOne(originalMessageId, { envelope: true });

                if (!message || !message.envelope) {
                    throw new Error(`Original message ${originalMessageId} not found`);
                }

                const originalEnvelope = message.envelope;
                const originalMsgId = originalEnvelope.messageId;

                // Construct recipient (Reply-To > From)
                // envelope.replyTo is array of {name, address}
                const replyToAddresses = originalEnvelope.replyTo && originalEnvelope.replyTo.length > 0
                    ? originalEnvelope.replyTo
                    : originalEnvelope.from;

                if (!replyToAddresses || replyToAddresses.length === 0) {
                    throw new Error('No valid recipient found in original message');
                }

                const toAddress = replyToAddresses[0].address;

                // Send reply via SMTP
                const { smtp } = this.getConfigs(account);
                const transporter = nodemailer.createTransport(smtp);

                const info = await transporter.sendMail({
                    from: smtp.auth.user,
                    to: toAddress,
                    subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
                    text: replyContent,
                    headers: {
                        'In-Reply-To': originalMsgId,
                        'References': originalMsgId // Ideally we append to existing references, but this minimal valid threading
                    } as any
                });

                // Ideally append the sent message to Sent folder, but nodemailer won't do that automatically for IMAP.
                // We'd need to append manually. Skipping for V1.

                return (info as any).messageId;

            } finally {
                lock.release();
            }
        });
    }

    // Helper to send mail generally
    async sendMail(account: any, mailOptions: any) {
        const { smtp } = this.getConfigs(account);
        const transporter = nodemailer.createTransport(smtp);
        const info = await transporter.sendMail({
            from: smtp.auth.user,
            ...mailOptions
        });
        return info.messageId;
    }
}

let instance: ImapService | null = null;
export function getImapService(): ImapService {
    if (!instance) {
        instance = new ImapService();
    }
    return instance;
}
