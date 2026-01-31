import { Router, Request, Response } from 'express';
import { SDKService } from '../services/SDKService.js';
import { ProvidersResponse } from '@realtimex/sdk';
import { apiRateLimit } from '../middleware/rateLimit.js';

const router = Router();

/**
 * GET /api/sdk/providers/chat
 * Returns available chat providers and their models
 */
router.get('/providers/chat', apiRateLimit, async (req: Request, res: Response) => {
    try {
        const sdk = SDKService.getSDK();
        if (!sdk) {
            return res.json({ success: false, message: 'SDK not available', providers: [] });
        }

        const { providers } = await SDKService.withTimeout<ProvidersResponse>(
            sdk.llm.chatProviders(),
            30000,
            'Chat providers fetch timed out'
        );

        res.json({ success: true, providers: providers || [] });
    } catch (error: any) {
        res.json({ success: false, providers: [], message: error.message });
    }
});

/**
 * GET /api/sdk/providers/embed
 * Returns available embedding providers and their models
 */
router.get('/providers/embed', apiRateLimit, async (req: Request, res: Response) => {
    try {
        const sdk = SDKService.getSDK();
        if (!sdk) {
            return res.json({ success: false, message: 'SDK not available', providers: [] });
        }

        const { providers } = await SDKService.withTimeout<ProvidersResponse>(
            sdk.llm.embedProviders(),
            30000,
            'Embed providers fetch timed out'
        );

        res.json({ success: true, providers: providers || [] });
    } catch (error: any) {
        res.json({ success: false, providers: [], message: error.message });
    }
});

export default router;
