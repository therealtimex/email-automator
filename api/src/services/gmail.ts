import { google, gmail_v1, Auth } from 'googleapis';
import { SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';
import { createLogger } from '../utils/logger.js';
// Tokens are stored without encryption, protected by Supabase RLS
import { EmailAccount } from './supabase.js';

const logger = createLogger('GmailService');

export interface RuleAttachment {
    name: string;
    path: string;
    type: string;
    size: number;
}

export interface GmailMessage {
    id: string;
    threadId: string;
    subject: string;
    sender: string;
    recipient: string;
    date: string;
    body: string;
    snippet: string;
    headers: {
        importance?: string;
        listUnsubscribe?: string;
        autoSubmitted?: string;
        mailer?: string;
    };
}

export interface OAuthCredentials {
    clientId: string;
    clientSecret: string;
    redirectUri?: string;
}

export class GmailService {
    private createOAuth2Client(credentials?: OAuthCredentials): Auth.OAuth2Client {
        return new google.auth.OAuth2(
            credentials?.clientId || config.gmail.clientId,
            credentials?.clientSecret || config.gmail.clientSecret,
            credentials?.redirectUri || config.gmail.redirectUri
        );
    }

    async getProviderCredentials(supabase: SupabaseClient, userId: string): Promise<OAuthCredentials> {
        const { data: integration } = await supabase
            .from('integrations')
            .select('credentials')
            .eq('user_id', userId)
            .eq('provider', 'google')
            .single();

        const creds = integration?.credentials as any;

        if (creds?.client_id && creds?.client_secret) {
            return {
                clientId: creds.client_id,
                clientSecret: creds.client_secret,
                redirectUri: config.gmail.redirectUri
            };
        }

        if (config.gmail.clientId && config.gmail.clientSecret) {
            return {
                clientId: config.gmail.clientId,
                clientSecret: config.gmail.clientSecret,
                redirectUri: config.gmail.redirectUri
            };
        }

        throw new Error('Gmail OAuth credentials not configured (Database or Env)');
    }

    getAuthUrl(scopes: string[] = ['https://www.googleapis.com/auth/gmail.modify']): string {
        const client = this.createOAuth2Client();
        return client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent',
        });
    }

    async exchangeCode(code: string): Promise<{
        access_token: string;
        refresh_token?: string;
        expiry_date?: number;
        scope?: string;
    }> {
        const client = this.createOAuth2Client();
        const { tokens } = await client.getToken(code);
        return {
            access_token: tokens.access_token!,
            refresh_token: tokens.refresh_token ?? undefined,
            expiry_date: tokens.expiry_date ?? undefined,
            scope: tokens.scope ?? undefined,
        };
    }

    async saveAccount(
        supabase: SupabaseClient,
        userId: string,
        emailAddress: string,
        tokens: { access_token: string; refresh_token?: string; expiry_date?: number; scope?: string }
    ): Promise<EmailAccount> {
        const { data, error } = await supabase
            .from('email_accounts')
            .upsert({
                user_id: userId,
                email_address: emailAddress,
                provider: 'gmail',
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token || null,
                token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
                scopes: tokens.scope?.split(' ') || [],
                is_active: true,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id, email_address' })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    private async getAuthenticatedClient(account: EmailAccount): Promise<gmail_v1.Gmail> {
        const accessToken = account.access_token || '';
        const refreshToken = account.refresh_token || '';
        const client = this.createOAuth2Client();

        client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken,
            expiry_date: account.token_expires_at ? new Date(account.token_expires_at).getTime() : undefined,
        });

        return google.gmail({ version: 'v1', auth: client });
    }

    async refreshTokenIfNeeded(
        supabase: SupabaseClient,
        account: EmailAccount
    ): Promise<EmailAccount> {
        if (!account.token_expires_at) return account;

        const expiresAt = new Date(account.token_expires_at).getTime();
        const now = Date.now();
        const bufferMs = 5 * 60 * 1000; // 5 minutes buffer

        if (expiresAt > now + bufferMs) {
            return account; // Token still valid
        }

        logger.info('Refreshing Gmail token', { accountId: account.id });

        const refreshToken = account.refresh_token;
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        const credentials = await this.getProviderCredentials(supabase, account.user_id);
        const client = this.createOAuth2Client(credentials);
        client.setCredentials({ refresh_token: refreshToken });
        const { credentials: newTokens } = await client.refreshAccessToken();

        const { data, error } = await supabase
            .from('email_accounts')
            .update({
                access_token: newTokens.access_token!,
                token_expires_at: newTokens.expiry_date
                    ? new Date(newTokens.expiry_date).toISOString()
                    : null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', account.id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async fetchMessages(
        account: EmailAccount,
        options: { maxResults?: number; query?: string; pageToken?: string } = {}
    ): Promise<{ messages: GmailMessage[]; nextPageToken?: string }> {
        const gmail = await this.getAuthenticatedClient(account);
        const { maxResults = config.processing.batchSize, query, pageToken } = options;

        const response = await gmail.users.messages.list({
            userId: 'me',
            maxResults,
            q: query,
            pageToken,
        });

        const messages: GmailMessage[] = [];

        for (const msg of response.data.messages || []) {
            if (!msg.id) continue;

            try {
                const detail = await gmail.users.messages.get({
                    userId: 'me',
                    id: msg.id,
                    format: 'full',
                });

                const parsed = this.parseMessage(detail.data);
                if (parsed) {
                    messages.push(parsed);
                }
            } catch (error) {
                logger.warn('Failed to fetch message details', { messageId: msg.id, error });
            }
        }

        return {
            messages,
            nextPageToken: response.data.nextPageToken ?? undefined,
        };
    }

    private parseMessage(message: gmail_v1.Schema$Message): GmailMessage | null {
        if (!message.id || !message.threadId) return null;

        const headers = message.payload?.headers || [];
        const getHeader = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

        let body = '';
        const payload = message.payload;

        if (payload?.parts) {
            // Multipart message
            const textPart = payload.parts.find(p => p.mimeType === 'text/plain');
            const htmlPart = payload.parts.find(p => p.mimeType === 'text/html');
            const part = textPart || htmlPart || payload.parts[0];
            body = this.decodeBody(part?.body?.data);
        } else if (payload?.body?.data) {
            body = this.decodeBody(payload.body.data);
        }

        return {
            id: message.id,
            threadId: message.threadId,
            subject: getHeader('Subject') || 'No Subject',
            sender: getHeader('From'),
            recipient: getHeader('To'),
            date: getHeader('Date'),
            body,
            snippet: message.snippet || '',
            headers: {
                importance: getHeader('Importance') || getHeader('X-Priority'),
                listUnsubscribe: getHeader('List-Unsubscribe'),
                autoSubmitted: getHeader('Auto-Submitted'),
                mailer: getHeader('X-Mailer'),
            }
        };
    }

    private decodeBody(data?: string | null): string {
        if (!data) return '';
        try {
            return Buffer.from(data, 'base64').toString('utf-8');
        } catch {
            return '';
        }
    }

    async trashMessage(account: EmailAccount, messageId: string): Promise<void> {
        const gmail = await this.getAuthenticatedClient(account);
        await gmail.users.messages.trash({ userId: 'me', id: messageId });
        logger.debug('Message trashed', { messageId });
    }

    async archiveMessage(account: EmailAccount, messageId: string): Promise<void> {
        const gmail = await this.getAuthenticatedClient(account);
        await gmail.users.messages.modify({
            userId: 'me',
            id: messageId,
            requestBody: { removeLabelIds: ['INBOX'] },
        });
        logger.debug('Message archived', { messageId });
    }

    async createDraft(
        account: EmailAccount,
        originalMessageId: string,
        replyContent: string,
        supabase?: SupabaseClient,
        attachments?: RuleAttachment[]
    ): Promise<string> {
        const gmail = await this.getAuthenticatedClient(account);

        // Fetch original message to get threadId and Message-ID for threading
        const original = await gmail.users.messages.get({ userId: 'me', id: originalMessageId });
        const headers = original.data.payload?.headers || [];
        const getHeader = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

        const toAddress = getHeader('From');
        const subject = getHeader('Subject');
        const originalMsgId = getHeader('Message-ID');
        const threadId = original.data.threadId;

        // Threading headers: In-Reply-To should be the Message-ID of the mail we reply to
        const replyHeaders = [];
        if (originalMsgId) {
            replyHeaders.push(`In-Reply-To: ${originalMsgId}`);
            replyHeaders.push(`References: ${originalMsgId}`);
        }

        let rawMessage = '';
        const boundary = `----=_Part_${Math.random().toString(36).substring(2)}`;

        if (attachments && attachments.length > 0 && supabase) {
            // Multipart message
            rawMessage = [
                `To: ${toAddress}`,
                `Subject: Re: ${subject}`,
                ...replyHeaders,
                'MIME-Version: 1.0',
                `Content-Type: multipart/mixed; boundary="${boundary}"`,
                '',
                `--${boundary}`,
                'Content-Type: text/plain; charset="UTF-8"',
                'Content-Transfer-Encoding: 7bit',
                '',
                replyContent,
                '',
            ].join('\r\n');

            for (const attachment of attachments) {
                try {
                    const content = await this.fetchAttachment(supabase, attachment.path);
                    const base64Content = Buffer.from(content).toString('base64');
                    
                    rawMessage += [
                        `--${boundary}`,
                        `Content-Type: ${attachment.type}; name="${attachment.name}"`,
                        `Content-Disposition: attachment; filename="${attachment.name}"`,
                        'Content-Transfer-Encoding: base64',
                        '',
                        base64Content,
                        '',
                    ].join('\r\n');
                } catch (err) {
                    logger.error('Failed to attach file', err, { path: attachment.path });
                }
            }
            
            rawMessage += `--${boundary}--`;
        } else {
            // Simple plain text message
            rawMessage = [
                `To: ${toAddress}`,
                `Subject: Re: ${subject}`,
                ...replyHeaders,
                'MIME-Version: 1.0',
                'Content-Type: text/plain; charset="UTF-8"',
                '',
                replyContent,
            ].join('\r\n');
        }

        const encodedMessage = Buffer.from(rawMessage)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        const draft = await gmail.users.drafts.create({
            userId: 'me',
            requestBody: {
                message: {
                    threadId,
                    raw: encodedMessage,
                },
            },
        });

        const draftId = draft.data.id || 'unknown';
        logger.debug('Draft created', { draftId, threadId, attachments: attachments?.length || 0 });
        return draftId;
    }

    async addLabel(account: EmailAccount, messageId: string, labelIds: string[]): Promise<void> {
        const gmail = await this.getAuthenticatedClient(account);
        await gmail.users.messages.modify({
            userId: 'me',
            id: messageId,
            requestBody: { addLabelIds: labelIds },
        });
    }

    async removeLabel(account: EmailAccount, messageId: string, labelIds: string[]): Promise<void> {
        const gmail = await this.getAuthenticatedClient(account);
        await gmail.users.messages.modify({
            userId: 'me',
            id: messageId,
            requestBody: { removeLabelIds: labelIds },
        });
    }

    async markAsRead(account: EmailAccount, messageId: string): Promise<void> {
        await this.removeLabel(account, messageId, ['UNREAD']);
        logger.debug('Message marked as read', { messageId });
    }

    async starMessage(account: EmailAccount, messageId: string): Promise<void> {
        await this.addLabel(account, messageId, ['STARRED']);
        logger.debug('Message starred', { messageId });
    }

    private async fetchAttachment(supabase: SupabaseClient, path: string): Promise<Uint8Array> {
        const { data, error } = await supabase.storage
            .from('rule-attachments')
            .download(path);

        if (error) throw error;
        return new Uint8Array(await data.arrayBuffer());
    }

    async getProfile(account: EmailAccount): Promise<{ emailAddress: string; messagesTotal: number }> {
        const gmail = await this.getAuthenticatedClient(account);
        const profile = await gmail.users.getProfile({ userId: 'me' });
        return {
            emailAddress: profile.data.emailAddress || '',
            messagesTotal: profile.data.messagesTotal || 0,
        };
    }
}

// Singleton
let instance: GmailService | null = null;

export function getGmailService(): GmailService {
    if (!instance) {
        instance = new GmailService();
    }
    return instance;
}
