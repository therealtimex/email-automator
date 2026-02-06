import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { createLogger } from '../utils/logger.js';

const router = Router();
const logger = createLogger('LearningRoutes');

/**
 * POST /api/learning/feedback
 * Submit user feedback and immediately update metrics
 */
router.post('/feedback', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const supabase = req.supabase;
    const user = req.user;

    if (!supabase) {
        return res.status(503).json({ error: 'Supabase client not configured' });
    }

    if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { email_id, feedback_type, original_state, corrected_state, reasoning } = req.body;

    if (!email_id || !feedback_type) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get account_id from email
    const { data: email, error: emailError } = await supabase
        .from('emails')
        .select('account_id')
        .eq('id', email_id)
        .single();

    if (emailError) {
        logger.warn('Failed to get email account_id', { email_id, error: emailError });
    }

    // 1. Insert feedback record
    const { error: feedbackError } = await supabase
        .from('user_feedback')
        .insert({
            user_id: user.id,
            email_id,
            account_id: email?.account_id || null,  // Populate account_id
            feedback_type,
            original_data: original_state,
            corrected_data: corrected_state,
            reasoning: reasoning || null
        });

    if (feedbackError) {
        logger.error('Failed to insert feedback', feedbackError);
        return res.status(500).json({ error: 'Failed to submit feedback' });
    }

    // 2. Immediately update metrics if positive feedback
    if (feedback_type === 'analysis' && corrected_state?.is_correct === true) {
        const { data: metrics, error: fetchError } = await supabase
            .from('learning_metrics')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        if (fetchError && fetchError.code !== 'PGRST116') {
            logger.error('Failed to fetch metrics', fetchError);
        } else {
            if (metrics) {
                // Update existing
                await supabase
                    .from('learning_metrics')
                    .update({
                        total_classifications: (metrics.total_classifications || 0) + 1,
                        correct_classifications: (metrics.correct_classifications || 0) + 1,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', user.id);
            } else {
                // Create new
                await supabase
                    .from('learning_metrics')
                    .insert({
                        user_id: user.id,
                        total_classifications: 1,
                        correct_classifications: 1
                    });
            }

            logger.info('Updated metrics for positive feedback', { user_id: user.id });
        }
    }

    res.json({ success: true });
}));

export default router;
