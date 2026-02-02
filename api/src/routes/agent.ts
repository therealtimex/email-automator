import { Request, Response, Router } from 'express';
import { agentService } from '../services/AgentService.js';

const router = Router();

/**
 * POST /api/agent/chat
 * Context-aware chat endpoint
 */
router.post('/chat', async (req: Request, res: Response) => {
    try {
        const userId = req.headers['x-user-id'] as string;
        // In a real app we would enforce auth here, but for now we rely on the gateway/client
        const { message, context, history } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, error: 'Message is required' });
        }

        const response = await agentService.chat(
            userId || 'anonymous',
            message,
            context || { page_id: 'global' },
            history || []
        );

        res.json({
            success: true,
            response
        });
    } catch (error: any) {
        console.error('[Agent API] Chat failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
