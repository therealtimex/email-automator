import { Router } from 'express';
import { asyncHandler, NotFoundError } from '../middleware/errorHandler.js';
import { authMiddleware } from '../middleware/auth.js';
import { apiRateLimit } from '../middleware/rateLimit.js';
import { validateBody, validateParams, schemas } from '../middleware/validation.js';
import { z } from 'zod';
import { createLogger } from '../utils/logger.js';

const router = Router();
const logger = createLogger('RulesRoutes');

// List all rules
router.get('/',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { data, error } = await req.supabase!
            .from('rules')
            .select('*')
            .eq('user_id', req.user!.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ rules: data || [] });
    })
);

// Create rule
router.post('/',
    apiRateLimit,
    authMiddleware,
    validateBody(schemas.createRule),
    asyncHandler(async (req, res) => {
        const { name, condition, action, actions, is_enabled, instructions, attachments } = req.body;

        // Use actions array if provided, otherwise use single action for backward compatibility
        const ruleActions = actions && actions.length > 0 ? actions : (action ? [action] : []);
        const primaryAction = ruleActions[0] || 'archive'; // For legacy column

        const { data, error } = await req.supabase!
            .from('rules')
            .insert({
                user_id: req.user!.id,
                name,
                condition,
                action: primaryAction, // Legacy column
                actions: ruleActions,  // New multi-action column
                is_enabled,
                instructions,
                attachments,
            })
            .select()
            .single();

        if (error) throw error;

        logger.info('Rule created', { ruleId: data.id, actions: ruleActions, userId: req.user!.id });

        res.status(201).json({ rule: data });
    })
);

// Update rule
router.patch('/:ruleId',
    apiRateLimit,
    authMiddleware,
    validateParams(z.object({ ruleId: schemas.uuid })),
    validateBody(schemas.updateRule),
    asyncHandler(async (req, res) => {
        const { ruleId } = req.params;
        const updates = req.body;

        const { data, error } = await req.supabase!
            .from('rules')
            .update(updates)
            .eq('id', ruleId)
            .eq('user_id', req.user!.id)
            .select()
            .single();

        if (error) throw error;
        if (!data) throw new NotFoundError('Rule');

        logger.info('Rule updated', { ruleId, userId: req.user!.id });

        res.json({ rule: data });
    })
);

// Delete rule
router.delete('/:ruleId',
    authMiddleware,
    validateParams(z.object({ ruleId: schemas.uuid })),
    asyncHandler(async (req, res) => {
        const { ruleId } = req.params;

        const { error } = await req.supabase!
            .from('rules')
            .delete()
            .eq('id', ruleId)
            .eq('user_id', req.user!.id);

        if (error) throw error;

        logger.info('Rule deleted', { ruleId, userId: req.user!.id });

        res.json({ success: true });
    })
);

// Toggle rule enabled/disabled
router.post('/:ruleId/toggle',
    authMiddleware,
    validateParams(z.object({ ruleId: schemas.uuid })),
    asyncHandler(async (req, res) => {
        const { ruleId } = req.params;
        const userId = req.user!.id;

        // Get current state
        const { data: rule, error: fetchError } = await req.supabase!
            .from('rules')
            .select('name, is_enabled')
            .eq('id', ruleId)
            .eq('user_id', userId)
            .single();

        if (fetchError || !rule) {
            logger.error('Toggle failed: Rule not found', { ruleId, userId });
            throw new NotFoundError('Rule');
        }

        const nextState = !rule.is_enabled;
        logger.info('Toggling rule', { ruleName: rule.name, from: rule.is_enabled, to: nextState });

        // Toggle
        const { data, error } = await req.supabase!
            .from('rules')
            .update({ is_enabled: nextState })
            .eq('id', ruleId)
            .select()
            .single();

        if (error) {
            logger.error('Database error during toggle', error);
            throw error;
        }

        logger.info('Toggle successful', { ruleId, is_enabled: data.is_enabled });

        res.json({ rule: data });
    })
);

export default router;
