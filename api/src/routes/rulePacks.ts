/**
 * Rule Pack Routes - Zero-Configuration UX
 *
 * Endpoints for managing rule pack installations and user role selection
 */

import { Router, Request, Response } from 'express';
import { createLogger } from '../utils/logger.js';
import { RulePackService } from '../services/RulePackService.js';
import { getAllPacks, getPackById, getPacksForRole } from '../services/rulePacks/index.js';
import type { UserRole } from '../services/rulePacks/types.js';

const router = Router();
const logger = createLogger('RulePackRoutes');

/**
 * GET /api/rule-packs
 * List all available rule packs
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const packs = getAllPacks();

    res.json({
      success: true,
      packs: packs.map(pack => ({
        id: pack.id,
        name: pack.name,
        description: pack.description,
        icon: pack.icon,
        ruleCount: pack.rules.length,
        targetRoles: pack.target_roles
      }))
    });
  } catch (error: any) {
    logger.error('Failed to list packs', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/rule-packs/:packId
 * Get details of a specific pack
 */
router.get('/:packId', async (req: Request, res: Response) => {
  try {
    const packId = req.params.packId as string;
    const pack = getPackById(packId);

    if (!pack) {
      return res.status(404).json({ success: false, error: 'Pack not found' });
    }

    res.json({ success: true, pack });
  } catch (error: any) {
    logger.error('Failed to get pack', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/rule-packs/install
 * Install a rule pack for the authenticated user
 * Body: { packId: string }
 */
router.post('/install', async (req: Request, res: Response) => {
  try {
    const { packId } = req.body;
    const supabase = (req as any).supabase;
    const userId = (req as any).userId;

    if (!packId) {
      return res.status(400).json({ success: false, error: 'packId is required' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const service = new RulePackService(supabase);
    const result = await service.installPack(userId, packId);

    res.json(result);
  } catch (error: any) {
    logger.error('Failed to install pack', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/rule-packs/uninstall
 * Uninstall a rule pack
 * Body: { packId: string }
 */
router.post('/uninstall', async (req: Request, res: Response) => {
  try {
    const { packId } = req.body;
    const supabase = (req as any).supabase;
    const userId = (req as any).userId;

    if (!packId) {
      return res.status(400).json({ success: false, error: 'packId is required' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const service = new RulePackService(supabase);
    const result = await service.uninstallPack(userId, packId);

    res.json(result);
  } catch (error: any) {
    logger.error('Failed to uninstall pack', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/rule-packs/installed
 * Get user's installed packs
 */
router.get('/installed', async (req: Request, res: Response) => {
  try {
    const supabase = (req as any).supabase;
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const service = new RulePackService(supabase);
    const installations = await service.getInstalledPacks(userId);

    res.json({ success: true, installations });
  } catch (error: any) {
    logger.error('Failed to get installed packs', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/rule-packs/set-role
 * Set user role and install appropriate packs
 * Body: { role: UserRole }
 */
router.post('/set-role', async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    const supabase = (req as any).supabase;
    const userId = (req as any).userId;

    if (!role) {
      return res.status(400).json({ success: false, error: 'role is required' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const validRoles: UserRole[] = ['executive', 'developer', 'sales', 'operations', 'marketing', 'other'];
    if (!validRoles.includes(role as UserRole)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    const service = new RulePackService(supabase);
    const result = await service.updateUserRole(userId, role as UserRole, 'onboarding');

    logger.info(`User ${userId} set role to ${role}, installed ${result.packsInstalled.length} packs`);

    res.json(result);
  } catch (error: any) {
    logger.error('Failed to set user role', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/rule-packs/for-role/:role
 * Get recommended packs for a specific role
 */
router.get('/for-role/:role', async (req: Request, res: Response) => {
  try {
    const { role } = req.params;
    const packs = getPacksForRole(role as UserRole);

    res.json({
      success: true,
      role,
      packs: packs.map(pack => ({
        id: pack.id,
        name: pack.name,
        description: pack.description,
        icon: pack.icon,
        ruleCount: pack.rules.length
      }))
    });
  } catch (error: any) {
    logger.error('Failed to get packs for role', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
