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
    'offline_access',
    'openid',
    'profile',
];

export interface OutlookMessage {
    id: string;
    conversationId: string;
    raw: string; // MIME content
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
        // MSAL Node doesn't expose refresh_token directly in AuthenticationResult
        // but it is available if you use a cache plugin or direct refresh token request.
        // For now, we'll store what we have.
        const { data, error } = await supabase
            .from('email_accounts')
            .upsert({
                user_id: userId,
                email_address: emailAddress,
                provider: 'outlook',
                access_token: authResult.accessToken,
                refresh_token: (authResult as any).refreshToken || null,
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

    async getProviderCredentials(supabase: SupabaseClient, userId: string): Promise<{ clientId: string; clientSecret?: string; tenantId: string }> {
        const { data: integration } = await supabase
            .from('integrations')
            .select('credentials')
            .eq('user_id', userId)
            .eq('provider', 'microsoft')
            .single();

        const creds = integration?.credentials as any;

        return {
            clientId: creds?.client_id || config.microsoft.clientId,
            clientSecret: creds?.client_secret || config.microsoft.clientSecret,
            tenantId: creds?.tenant_id || config.microsoft.tenantId || 'common'
        };
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

        const refreshToken = account.refresh_token;
        
        // If we have a refresh token stored, we can try to use the CCA
        if (refreshToken) {
            try {
                const creds = await this.getProviderCredentials(supabase, account.user_id);
                if (creds.clientSecret) {
                    const confidentialConfig: msal.Configuration = {
                        auth: {
                            clientId: creds.clientId,
                            authority: `https://login.microsoftonline.com/${creds.tenantId}`,
                            clientSecret: creds.clientSecret,
                        },
                    };
                    const cca = new msal.ConfidentialClientApplication(confidentialConfig);
                    const result = await cca.acquireTokenByRefreshToken({
                        refreshToken,
                        scopes: GRAPH_SCOPES,
                    });

                    if (result) {
                        const { data, error } = await supabase
                            .from('email_accounts')
                            .update({
                                access_token: result.accessToken,
                                refresh_token: (result as any).refreshToken || refreshToken, // Keep old if new not provided
                                token_expires_at: result.expiresOn?.toISOString() || null,
                                updated_at: new Date().toISOString(),
                            })
                            .eq('id', account.id)
                            .select()
                            .single();

                        if (error) throw error;
                        return data;
                    }
                }
            } catch (err) {
                logger.warn('Confidential refresh failed, attempting public refresh...', { error: err });
            }
        }

        // Fallback or if no refresh token: we can't refresh automatically without a persistent cache
        // Modern MSAL usually requires a TokenCache implementation for this
        throw new Error('Outlook session expired. Please reconnect your account in Settings.');
    }

    async fetchMessages(
        account: EmailAccount,
        options: { top?: number; skip?: number; filter?: string } = {}
    ): Promise<{ messages: OutlookMessage[]; hasMore: boolean }> {
        const accessToken = account.access_token || '';
        const { top = 20, skip = 0, filter } = options;

        let url = `https://graph.microsoft.com/v1.0/me/messages?$top=${top}&$skip=${skip}&$orderby=receivedDateTime asc&$select=id,conversationId`;
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
        const messageRefs = data.value || [];
        const messages: OutlookMessage[] = [];

        // For each message, fetch the raw MIME content
        for (const ref of messageRefs) {
            try {
                const rawResponse = await fetch(
                    `https://graph.microsoft.com/v1.0/me/messages/${ref.id}/$value`,
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    }
                );

                if (rawResponse.ok) {
                    const rawMime = await rawResponse.text();
                    messages.push({
                        id: ref.id,
                        conversationId: ref.conversationId,
                        raw: rawMime
                    });
                }
            } catch (error) {
                logger.warn('Failed to fetch raw content for Outlook message', { messageId: ref.id, error });
            }
        }

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

        // Get original message (minimal metadata)
        const originalResponse = await fetch(
            `https://graph.microsoft.com/v1.0/me/messages/${originalMessageId}?$select=id,conversationId`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );
        
        if (!originalResponse.ok) {
            throw new Error('Failed to fetch original message metadata');
        }

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
