import { Router } from 'express';
import { spawn } from 'child_process';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validateBody, schemas } from '../middleware/validation.js';
import { config } from '../config/index.js';
import { createLogger } from '../utils/logger.js';
import { join } from 'path';

const router = Router();
const logger = createLogger('MigrateRoutes');

// Run database migration
router.post('/',
    validateBody(schemas.migrate),
    asyncHandler(async (req, res) => {
        const { projectRef, accessToken } = req.body;

        logger.info('Starting migration', { projectRef });

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const sendEvent = (type: string, data: string) => {
            res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
        };

        try {
            sendEvent('info', '🔧 Starting migration...');

            const scriptPath = join(config.scriptsDir, 'migrate.sh');

            const env = {
                ...process.env,
                SUPABASE_PROJECT_ID: projectRef,
                SUPABASE_ACCESS_TOKEN: accessToken || '',
                SKIP_FUNCTIONS: '0',
            };

            const child = spawn('bash', [scriptPath], {
                env,
                cwd: config.rootDir,
            });

            child.stdout.on('data', (data) => {
                const lines = data.toString().split('\n').filter((l: string) => l.trim());
                for (const line of lines) {
                    sendEvent('stdout', line);
                }
            });

            child.stderr.on('data', (data) => {
                const lines = data.toString().split('\n').filter((l: string) => l.trim());
                for (const line of lines) {
                    sendEvent('stderr', line);
                }
            });

            child.on('close', (code) => {
                if (code === 0) {
                    sendEvent('info', '✅ Migration completed successfully!');
                    sendEvent('done', 'success');
                    logger.info('Migration completed successfully', { projectRef });
                } else {
                    sendEvent('error', `❌ Migration failed with code ${code}`);
                    sendEvent('done', 'failed');
                    logger.error('Migration failed', new Error(`Exit code: ${code}`), { projectRef });
                }
                res.end();
            });

            child.on('error', (error) => {
                sendEvent('error', `❌ Failed to run migration: ${error.message}`);
                sendEvent('done', 'failed');
                logger.error('Migration spawn error', error);
                res.end();
            });
        } catch (error: any) {
            sendEvent('error', `❌ Server error: ${error.message}`);
            sendEvent('done', 'failed');
            logger.error('Migration error', error);
            res.end();
        }
    })
);

export default router;
