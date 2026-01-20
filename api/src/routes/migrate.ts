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
        const { projectRef, dbPassword, accessToken } = req.body;

        logger.info('Starting migration', { projectRef });

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Transfer-Encoding', 'chunked');

        const sendLog = (message: string) => {
            res.write(message + '\n');
        };

        try {
            sendLog('🔧 Starting migration...');
            
            const scriptPath = join(config.scriptsDir, 'migrate.sh');

            const env = {
                ...process.env,
                SUPABASE_PROJECT_ID: projectRef,
                SUPABASE_DB_PASSWORD: dbPassword || '',
                SUPABASE_ACCESS_TOKEN: accessToken || '',
                SKIP_FUNCTIONS: '1',
            };

            const child = spawn('bash', [scriptPath], { 
                env, 
                cwd: config.rootDir,
            });

            child.stdout.on('data', (data) => {
                sendLog(data.toString().trim());
            });

            child.stderr.on('data', (data) => {
                sendLog(`⚠️  ${data.toString().trim()}`);
            });

            child.on('close', (code) => {
                if (code === 0) {
                    sendLog('✅ Migration successful!');
                    sendLog('RESULT: success');
                    logger.info('Migration completed successfully', { projectRef });
                } else {
                    sendLog(`❌ Migration failed with code ${code}`);
                    sendLog('RESULT: failure');
                    logger.error('Migration failed', new Error(`Exit code: ${code}`), { projectRef });
                }
                res.end();
            });

            child.on('error', (error) => {
                sendLog(`❌ Failed to run migration: ${error.message}`);
                sendLog('RESULT: failure');
                logger.error('Migration spawn error', error);
                res.end();
            });
        } catch (error: any) {
            sendLog(`❌ Server error: ${error.message}`);
            sendLog('RESULT: failure');
            logger.error('Migration error', error);
            res.end();
        }
    })
);

export default router;
