import { google } from 'googleapis';
import * as msal from '@azure/msal-node';
import { supabase } from '../lib/supabase';

export class GmailHandler {
    private oauth2Client;

    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            'urn:ietf:wg:oauth:2.0:oob'
        );
    }

    async getAuthUrl() {
        const scopes = ['https://www.googleapis.com/auth/gmail.readonly'];
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent'
        });
    }

    async handleCallback(code: string) {
        const { tokens } = await this.oauth2Client.getToken(code);
        this.oauth2Client.setCredentials(tokens);

        // For now, save to Supabase without user_id (will need proper auth later)
        const { error } = await supabase
            .from('email_accounts')
            .insert({
                email_address: 'user@gmail.com', // TODO: Extract from token
                provider: 'gmail',
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
                scopes: tokens.scope ? tokens.scope.split(' ') : [],
                is_active: true
            });

        if (error) throw error;
        return tokens;
    }

    async authenticate(code: string, userId: string, emailAddress: string) {
        const { tokens } = await this.oauth2Client.getToken(code);
        this.oauth2Client.setCredentials(tokens);

        // Save tokens to Supabase
        const { error } = await supabase
            .from('email_accounts')
            .upsert({
                user_id: userId,
                email_address: emailAddress,
                provider: 'gmail',
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
                scopes: tokens.scope ? tokens.scope.split(' ') : [],
                is_active: true
            }, { onConflict: 'user_id, email_address' });

        if (error) throw error;
        return tokens;
    }
}

export class MicrosoftGraphHandler {
    private cca;

    constructor() {
        const config = {
            auth: {
                clientId: process.env.MS_GRAPH_CLIENT_ID || '',
                authority: `https://login.microsoftonline.com/${process.env.MS_GRAPH_TENANT_ID || 'common'}`,
            }
        };
        this.cca = new msal.PublicClientApplication(config);
    }

    async initiateDeviceFlow() {
        const scopes = ['https://graph.microsoft.com/Mail.Read'];
        const deviceCodeRequest = {
            deviceCodeCallback: (response: any) => {
                return response;
            },
            scopes: scopes,
        };

        const response = await this.cca.acquireTokenByDeviceCode(deviceCodeRequest);
        return {
            device_code: (response as any).deviceCode,
            user_code: (response as any).userCode,
            message: (response as any).message
        };
    }

    async completeDeviceFlow(deviceCode: string) {
        // The device flow is already handled by acquireTokenByDeviceCode
        // This is a placeholder for completing the flow
        // In practice, you'd poll or wait for the user to complete auth
        return { success: true };
    }

    async saveToken(userId: string, emailAddress: string, response: msal.AuthenticationResult) {
        const { error } = await supabase
            .from('email_accounts')
            .upsert({
                user_id: userId,
                email_address: emailAddress,
                provider: 'outlook',
                access_token: response.accessToken,
                refresh_token: (response as any).refreshToken || null, // msal-node handles refresh tokens in cache, but we might want to store it
                token_expires_at: response.expiresOn ? response.expiresOn.toISOString() : null,
                scopes: response.scopes,
                is_active: true
            }, { onConflict: 'user_id, email_address' });

        if (error) throw error;
    }
}
