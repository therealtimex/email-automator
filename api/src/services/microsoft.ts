import * as msal from '@azure/msal-node';
import { SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';
import { createLogger } from '../utils/logger.js';
// Tokens are stored without encryption, protected by Supabase RLS
import { EmailAccount } from './supabase.js';

const logger = createLogger('MicrosoftService');

const GRAPH_SCOPES = [
    'https://graph.microsoft.com/Mail.Read',
    'https://graph.microsoft.com/Mail.ReadWrite',
    'https://graph.microsoft.com/User.Read',
];

export interface OutlookMessage {
    id: string;
    conversationId: string;
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
    };
}

export interface DeviceCodeResponse {
    userCode: string;
    verificationUri: string;
    message: string;
    expiresIn: number;
    interval: number;
    deviceCode: string;
}

export class MicrosoftService {
    private pca: msal.PublicClientApplication;
    private cca: msal.ConfidentialClientApplication | null = null;

    constructor() {
        const publicConfig: msal.Configuration = {
            auth: {
                clientId: config.microsoft.clientId,
                authority: `https://login.microsoftonline.com/${config.microsoft.tenantId}`,
            },
        };
        this.pca = new msal.PublicClientApplication(publicConfig);

        // Confidential client for server-side token refresh
        if (config.microsoft.clientSecret) {
            const confidentialConfig: msal.Configuration = {
                auth: {
                    clientId: config.microsoft.clientId,
                    authority: `https://login.microsoftonline.com/${config.microsoft.tenantId}`,
                    clientSecret: config.microsoft.clientSecret,
                },
            };
            this.cca = new msal.ConfidentialClientApplication(confidentialConfig);
        }
    }

    async initiateDeviceCodeFlow(): Promise<DeviceCodeResponse> {
        const deviceCodeRequest: msal.DeviceCodeRequest = {
            scopes: GRAPH_SCOPES,
            deviceCodeCallback: (response) => {
                logger.info('Device code received', { userCode: response.userCode });
            },
        };

        const response = await this.pca.acquireTokenByDeviceCode(deviceCodeRequest);

        // The device code flow returns tokens directly after user completes auth
        // For now, we return the device code info for the frontend to display
        return {
            userCode: '',
            verificationUri: 'https://microsoft.com/devicelogin',
            message: 'Please visit https://microsoft.com/devicelogin and enter the code shown',
            expiresIn: 900,
            interval: 5,
            deviceCode: '',
        };
    }

    async acquireTokenByDeviceCode(
        deviceCodeCallback: (response: { userCode: string; verificationUri: string; message: string }) => void
    ): Promise<msal.AuthenticationResult | null> {
        try {
            const response = await this.pca.acquireTokenByDeviceCode({
                scopes: GRAPH_SCOPES,
                deviceCodeCallback,
            });
            return response;
        } catch (error) {
            logger.error('Device code flow failed', error);
            return null;
        }
    }

    async saveAccount(
        supabase: SupabaseClient,
        userId: string,
        emailAddress: string,
        authResult: msal.AuthenticationResult
    ): Promise<EmailAccount> {
        const { data, error } = await supabase
            .from('email_accounts')
            .upsert({
                user_id: userId,
                email_address: emailAddress,
                provider: 'outlook',
                access_token: authResult.accessToken,
                refresh_token: null, // MSAL handles token cache internally
                token_expires_at: authResult.expiresOn?.toISOString() || null,
                scopes: authResult.scopes,
                is_active: true,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id, email_address' })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async refreshTokenIfNeeded(
        supabase: SupabaseClient,
        account: EmailAccount
    ): Promise<EmailAccount> {
        if (!account.token_expires_at) return account;

        const expiresAt = new Date(account.token_expires_at).getTime();
        const now = Date.now();
        const bufferMs = 5 * 60 * 1000;

        if (expiresAt > now + bufferMs) {
            return account;
        }

        logger.info('Refreshing Microsoft token', { accountId: account.id });

        // For Microsoft, we need the CCA with client secret for refresh
        if (!this.cca) {
            throw new Error('Microsoft client secret not configured for token refresh');
        }

        // In production, you'd use refresh tokens stored in a token cache
        // This is a simplified implementation
        throw new Error('Microsoft token refresh requires re-authentication');
    }

    async fetchMessages(
        account: EmailAccount,
        options: { top?: number; skip?: number; filter?: string } = {}
    ): Promise<{ messages: OutlookMessage[]; hasMore: boolean }> {
        const accessToken = account.access_token || '';
        const { top = 20, skip = 0, filter } = options;

        let url = `https://graph.microsoft.com/v1.0/me/messages?$top=${top}&$skip=${skip}&$orderby=receivedDateTime desc&$select=id,conversationId,subject,from,toRecipients,receivedDateTime,body,bodyPreview,importance`;
        if (filter) {
            url += `&$filter=${encodeURIComponent(filter)}`;
        }

        const response = await fetch(
            url,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const error = await response.text();
            logger.error('Failed to fetch Outlook messages', new Error(error));
            throw new Error('Failed to fetch messages from Outlook');
        }

        const data = await response.json();
        const messages: OutlookMessage[] = (data.value || []).map((msg: any) => ({
            id: msg.id,
            conversationId: msg.conversationId,
            subject: msg.subject || 'No Subject',
            sender: msg.from?.emailAddress?.address || 'Unknown',
            recipient: msg.toRecipients?.[0]?.emailAddress?.address || '',
            date: msg.receivedDateTime,
            body: msg.body?.content || '',
            snippet: msg.bodyPreview || '',
            headers: {
                importance: msg.importance,
            }
        }));

        return {
            messages,
            hasMore: !!data['@odata.nextLink'],
        };
    }

    async trashMessage(account: EmailAccount, messageId: string): Promise<void> {
        const accessToken = account.access_token || '';

        const response = await fetch(
            `https://graph.microsoft.com/v1.0/me/messages/${messageId}/move`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ destinationId: 'deleteditems' }),
            }
        );

        if (!response.ok) {
            throw new Error('Failed to trash message');
        }
        logger.debug('Outlook message trashed', { messageId });
    }

    async archiveMessage(account: EmailAccount, messageId: string): Promise<void> {
        const accessToken = account.access_token || '';

        const response = await fetch(
            `https://graph.microsoft.com/v1.0/me/messages/${messageId}/move`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ destinationId: 'archive' }),
            }
        );

        if (!response.ok) {
            throw new Error('Failed to archive message');
        }
        logger.debug('Outlook message archived', { messageId });
    }

    async markAsRead(account: EmailAccount, messageId: string): Promise<void> {
        const accessToken = account.access_token || '';

        await fetch(
            `https://graph.microsoft.com/v1.0/me/messages/${messageId}`,
            {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ isRead: true }),
            }
        );
        logger.debug('Outlook message marked as read', { messageId });
    }

    async flagMessage(account: EmailAccount, messageId: string): Promise<void> {
        const accessToken = account.access_token || '';

        await fetch(
            `https://graph.microsoft.com/v1.0/me/messages/${messageId}`,
            {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ flag: { flagStatus: 'flagged' } }),
            }
        );
        logger.debug('Outlook message flagged', { messageId });
    }

    async createDraft(
        account: EmailAccount,
        originalMessageId: string,
        replyContent: string
    ): Promise<string> {
        const accessToken = account.access_token || '';

        // Get original message
        const originalResponse = await fetch(
            `https://graph.microsoft.com/v1.0/me/messages/${originalMessageId}`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );
        const original = await originalResponse.json();

        // Create reply draft
        const response = await fetch(
            `https://graph.microsoft.com/v1.0/me/messages/${originalMessageId}/createReply`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            throw new Error('Failed to create reply draft');
        }

        const draft = await response.json();

        // Update draft with content
        await fetch(
            `https://graph.microsoft.com/v1.0/me/messages/${draft.id}`,
            {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    body: {
                        contentType: 'text',
                        content: replyContent,
                    },
                }),
            }
        );

        logger.debug('Outlook draft created', { draftId: draft.id });
        return draft.id;
    }

    async getProfile(account: EmailAccount): Promise<{ emailAddress: string; displayName: string }> {
        const accessToken = account.access_token || '';

        const response = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to get profile');
        }

        const profile = await response.json();
        return {
            emailAddress: profile.mail || profile.userPrincipalName || '',
            displayName: profile.displayName || '',
        };
    }
}

// Singleton
let instance: MicrosoftService | null = null;

export function getMicrosoftService(): MicrosoftService {
    if (!instance) {
        instance = new MicrosoftService();
    }
    return instance;
}
