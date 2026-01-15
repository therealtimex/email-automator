import { google } from 'googleapis';
import { supabase } from '../lib/supabase';
import { IntelligenceLayer } from './intelligence';

export class EmailProcessor {
    private ai: IntelligenceLayer;

    constructor() {
        this.ai = new IntelligenceLayer();
    }

    async syncAccount(accountId: string) {
        // 1. Fetch account details
        const { data: account, error: accError } = await supabase
            .from('email_accounts')
            .select('*')
            .eq('id', accountId)
            .single();

        if (accError || !account) throw accError || new Error('Account not found');

        // 2. Setup client based on provider
        if (account.provider === 'gmail') {
            await this.syncGmail(account);
        } else {
            // TODO: Implement Outlook sync
            console.log('Outlook sync not implemented yet');
        }
    }

    private async syncGmail(account: any) {
        const auth = new google.auth.OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET
        );

        auth.setCredentials({
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expiry_date: account.token_expires_at ? new Date(account.token_expires_at).getTime() : undefined
        });

        const gmail = google.gmail({ version: 'v1', auth });

        // 3. List messages (simplification: last 20)
        const response = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 20
        });

        const messages = response.data.messages || [];

        for (const msg of messages) {
            if (!msg.id) continue;

            // Check if already processed
            const { data: existing } = await supabase
                .from('emails')
                .select('id')
                .eq('account_id', account.id)
                .eq('external_id', msg.id)
                .single();

            if (existing) continue;

            // 4. Get message details
            const detail = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id
            });

            const payload = detail.data.payload;
            const headers = payload?.headers || [];
            const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
            const sender = headers.find(h => h.name === 'From')?.value || 'Unknown';
            const date = headers.find(h => h.name === 'Date')?.value || '';

            // Extract body (very simplified)
            let body = '';
            if (payload?.parts) {
                body = Buffer.from(payload.parts[0].body?.data || '', 'base64').toString();
            } else {
                body = Buffer.from(payload?.body?.data || '', 'base64').toString();
            }

            // 5. Analyze with AI
            const analysis = await this.ai.analyzeEmail(body, { subject, sender, date });

            // 6. Save to Supabase
            if (analysis) {
                await supabase.from('emails').insert({
                    account_id: account.id,
                    external_id: msg.id,
                    subject,
                    sender,
                    recipient: 'me', // TODO: extract from headers
                    date: date ? new Date(date).toISOString() : null,
                    body_snippet: body.substring(0, 500),
                    category: analysis.category,
                    is_useless: analysis.is_useless,
                    ai_analysis: analysis,
                    suggested_action: analysis.suggested_action
                });

                // TODO: Execute automation rules here
            }
        }
    }
}
