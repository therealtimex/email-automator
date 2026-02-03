import { Router } from 'express';
import healthRoutes from './health.js';
import authRoutes from './auth.js';
import syncRoutes from './sync.js';
import actionsRoutes from './actions.js';
import rulesRoutes from './rules.js';
import settingsRoutes from './settings.js';
import emailsRoutes from './emails.js';
import migrateRoutes from './migrate.js';
import sdkRoutes from './sdk.js';
import ttsRoutes from './tts.js';
import agentRoutes from './agent.js';
import draftsRoutes from './drafts.js';


const router = Router();


router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/sync', syncRoutes);
router.use('/actions', actionsRoutes);
router.use('/rules', rulesRoutes);
router.use('/settings', settingsRoutes);
router.use('/emails', emailsRoutes);
router.use('/migrate', migrateRoutes);
router.use('/sdk', sdkRoutes);
router.use('/tts', ttsRoutes);
router.use('/agent', agentRoutes);
router.use('/drafts', draftsRoutes);


export default router;
