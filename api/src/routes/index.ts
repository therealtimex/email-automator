import { Router } from 'express';
import healthRoutes from './health.js';
import authRoutes from './auth.js';
import syncRoutes from './sync.js';
import actionsRoutes from './actions.js';
import rulesRoutes from './rules.js';
import settingsRoutes from './settings.js';
import emailsRoutes from './emails.js';
import migrateRoutes from './migrate.js';
import deployRoutes from './deploy.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/sync', syncRoutes);
router.use('/actions', actionsRoutes);
router.use('/rules', rulesRoutes);
router.use('/settings', settingsRoutes);
router.use('/emails', emailsRoutes);
router.use('/migrate', migrateRoutes);
router.use('/deploy', deployRoutes);

export default router;
