import { google } from 'googleapis';

export class EmailActions {
    private supabase: any;

    constructor(supabaseClient?: any) {
        this.supabase = supabaseClient;
    }

    async executeAction(emailId: string, action: 'delete' | 'archive' | 'draft', draftContent?: string) {
        if (!this.supabase) throw new Error('Supabase client not configured');

        // 1. Fetch email and account details
        const { data: email, error: emailError } = await this.supabase
            .from('emails')
            .select('*, email_accounts(*)')
            .eq('id', emailId)
            .single();

        if (emailError || !email) throw new Error('Email not found');
        const account = email.email_accounts;

        if (account.provider === 'gmail') {
            await this.executeGmailAction(account, email.external_id, action, draftContent);
        } else {
            console.log('Outlook actions not implemented yet');
        }

        // 2. Update status in Supabase
        await this.supabase.from('emails').update({ action_taken: action }).eq('id', emailId);
    }

    private async executeGmailAction(account: any, messageId: string, action: string, draftContent?: string) {
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

        if (action === 'delete') {
            await gmail.users.messages.trash({ userId: 'me', id: messageId });
        } else if (action === 'archive') {
            await gmail.users.messages.modify({
                userId: 'me',
                id: messageId,
                requestBody: { removeLabelIds: ['INBOX'] }
            });
        } else if (action === 'draft' && draftContent) {
            // Get original message for thread continuity (optional but better)
            const original = await gmail.users.messages.get({ userId: 'me', id: messageId });
            const threadId = original.data.threadId;

            await gmail.users.drafts.create({
                userId: 'me',
                requestBody: {
                    message: {
                        threadId: threadId,
                        raw: Buffer.from(
                            `To: ${original.data.payload?.headers?.find(h => h.name === 'From')?.value || ''} \r\n` +
                            `Subject: Re: ${original.data.payload?.headers?.find(h => h.name === 'Subject')?.value || ''} \r\n` +
                            `In - Reply - To: ${messageId} \r\n` +
                            `References: ${messageId} \r\n\r\n` +
                            `${draftContent} `
                        ).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
                    }
                }
            });
        }
    }
}
