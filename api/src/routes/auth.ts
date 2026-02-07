import { Router } from 'express';
import { asyncHandler, ValidationError } from '../middleware/errorHandler.js';
import { authMiddleware } from '../middleware/auth.js';
import { authRateLimit, connectionRateLimit } from '../middleware/rateLimit.js';
import { validateBody, schemas } from '../middleware/validation.js';
import { getGmailService } from '../services/gmail.js';
import { getMicrosoftService } from '../services/microsoft.js';
import { getImapService } from '../services/imap-service.js';
import { createLogger } from '../utils/logger.js';
import { getEncryptionKeyHex } from '../utils/encryption.js';

const router = Router();
const logger = createLogger('AuthRoutes');

// IMAP/SMTP Connection
router.post('/imap/connect',
    connectionRateLimit, // More lenient for connection testing (30 attempts / 15 min)
    authMiddleware,
    validateBody(schemas.imapConnect),
    asyncHandler(async (req, res) => {
        const {
            email, password,
            imapHost, imapPort, imapSecure,
            smtpHost, smtpPort, smtpSecure
        } = req.body;

        // CRITICAL FIX: Ensure user has encryption key before IMAP operations
        // This handles the "first user connects IMAP immediately after signup" case
        const currentKey = getEncryptionKeyHex();
        if (currentKey) {
            const { data: userSettings } = await req.supabase!
                .from('user_settings')
                .select('encryption_key')
                .eq('user_id', req.user!.id)
                .single();

            if (userSettings && !userSettings.encryption_key) {
                // User doesn't have encryption key yet - persist it now
                logger.info('User missing encryption key, persisting immediately', { userId: req.user!.id });
                await req.supabase!
                    .from('user_settings')
                    .update({ encryption_key: currentKey })
                    .eq('user_id', req.user!.id);
                logger.info('✓ Encryption key persisted to user');
            }
        }

        const imapService = getImapService();
        const imapConfig = {
            host: imapHost,
            port: imapPort,
            secure: imapSecure,
            user: email,
            auth: { user: email, pass: password }
        };
        const smtpConfig = {
            host: smtpHost,
            port: smtpPort,
            secure: smtpSecure,
            auth: { user: email, pass: password }
        };

        // 1. Verify Connection
        await imapService.verifyConnection(imapConfig, smtpConfig);

        // 2. Save Account
        const account = await imapService.saveAccount(
            req.supabase!,
            req.user!.id,
            email,
            imapConfig,
            smtpConfig
        );

        logger.info('IMAP account connected', {
            userId: req.user!.id,
            email: email
        });

        res.json({
            success: true,
            account: {
                id: account.id,
                email_address: account.email_address,
                provider: 'imap',
                connection_type: 'imap'
            }
        });
    })
);

// Gmail OAuth
router.get('/gmail/url', authRateLimit, asyncHandler(async (req, res) => {
    const gmailService = getGmailService();
    const url = gmailService.getAuthUrl();
    logger.info('Gmail auth URL generated');
    res.json({ url });
}));

router.post('/gmail/callback',
    authRateLimit,
    authMiddleware,
    validateBody(schemas.gmailCallback),
    asyncHandler(async (req, res) => {
        const { code } = req.body;
        const gmailService = getGmailService();

        // Exchange code for tokens
        const tokens = await gmailService.exchangeCode(code);

        if (!tokens.access_token) {
            throw new ValidationError('Failed to obtain access token');
        }

        // Get email address from Gmail profile
        const tempAccount = {
            id: '',
            user_id: req.user!.id,
            provider: 'gmail' as const,
            email_address: '',
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || null,
            token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
            scopes: tokens.scope?.split(' ') || [],
            is_active: true,
            created_at: '',
            updated_at: '',
        };

        const profile = await gmailService.getProfile(tempAccount);

        // Save account
        const account = await gmailService.saveAccount(
            req.supabase!,
            req.user!.id,
            profile.emailAddress,
            tokens
        );

        logger.info('Gmail account connected', {
            userId: req.user!.id,
            email: profile.emailAddress
        });

        res.json({
            success: true,
            account: {
                id: account.id,
                email_address: account.email_address,
                provider: account.provider,
            }
        });
    })
);

// Microsoft OAuth (Device Code Flow)
router.post('/microsoft/device-flow',
    authRateLimit,
    authMiddleware,
    asyncHandler(async (req, res) => {
        const microsoftService = getMicrosoftService();

        // Start device code flow
        const result = await microsoftService.acquireTokenByDeviceCode((response) => {
            // This callback is called when the device code is ready
            res.json({
                userCode: response.userCode,
                verificationUri: response.verificationUri,
                message: response.message,
            });
        });

        // If we get here, the user completed the flow
        if (result) {
            const account = await microsoftService.saveAccount(
                req.supabase!,
                req.user!.id,
                result.account?.username || '',
                result
            );

            logger.info('Microsoft account connected', {
                userId: req.user!.id,
                email: account.email_address,
            });
        }
    })
);

router.post('/microsoft/complete',
    authRateLimit,
    authMiddleware,
    validateBody(schemas.deviceFlow),
    asyncHandler(async (_req, res) => {
        // Device flow completion is handled in the device-flow endpoint
        // This is kept for backwards compatibility
        res.json({ success: true });
    })
);

// Disconnect account
router.delete('/accounts/:accountId',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { accountId } = req.params;

        const { error } = await req.supabase!
            .from('email_accounts')
            .delete()
            .eq('id', accountId)
            .eq('user_id', req.user!.id);

        if (error) throw error;

        logger.info('Account disconnected', { accountId, userId: req.user!.id });
        res.json({ success: true });
    })
);

// List connected accounts
router.get('/accounts',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { data, error } = await req.supabase!
            .from('email_accounts')
            .select('id, provider, email_address, is_active, created_at, updated_at')
            .eq('user_id', req.user!.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ accounts: data || [] });
    })
);

export default router;
