import { Router } from 'express';
import { spawn } from 'child_process';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validateBody, schemas } from '../middleware/validation.js';
import { config } from '../config/index.js';
import { createLogger } from '../utils/logger.js';
import { join } from 'path';

const router = Router();
const logger = createLogger('DeployRoutes');

// Deploy Edge Functions
router.post('/',
    validateBody(schemas.migrate), // Reuse migrate schema (same credentials needed)
    asyncHandler(async (req, res) => {
        const { projectRef, dbPassword, accessToken } = req.body;

        logger.info('Starting Edge Functions deployment', { projectRef });

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Transfer-Encoding', 'chunked');

        const sendLog = (message: string) => {
            res.write(message + '\n');
        };

        try {
            sendLog('🚀 Starting Edge Functions deployment...');
            sendLog('');

            const scriptPath = join(config.scriptsDir, 'deploy-functions.sh');

            const env = {
                ...process.env,
                SUPABASE_PROJECT_ID: projectRef,
                SUPABASE_DB_PASSWORD: dbPassword || '',
                SUPABASE_ACCESS_TOKEN: accessToken || '',
            };

            if (accessToken) {
                sendLog('✓ Using Supabase access token for authentication');
            } else {
                sendLog('✓ Using database password for authentication');
            }
            sendLog('');

            const child = spawn('bash', [scriptPath], {
                env,
                cwd: config.rootDir,
            });

            let hasError = false;

            child.stdout.on('data', (data) => {
                const lines = data.toString().split('\n');
                lines.forEach((line: string) => {
                    if (line.trim()) {
                        sendLog(line);
                    }
                });
            });

            child.stderr.on('data', (data) => {
                const lines = data.toString().split('\n');
                lines.forEach((line: string) => {
                    if (line.trim()) {
                        // Check for error patterns
                        if (
                            line.includes('error') ||
                            line.includes('Error') ||
                            line.includes('ERROR') ||
                            line.includes('failed')
                        ) {
                            sendLog(`❌ ${line}`);
                            hasError = true;
                        } else {
                            sendLog(`⚠️  ${line}`);
                        }
                    }
                });
            });

            child.on('close', (code) => {
                sendLog('');
                sendLog('─'.repeat(60));

                if (code === 0 && !hasError) {
                    sendLog('');
                    sendLog('✅ Edge Functions deployed successfully!');
                    sendLog('RESULT: success');
                    sendLog('');
                    sendLog('🎉 Your API endpoints are now live.');
                    logger.info('Deployment completed successfully', { projectRef });
                } else {
                    sendLog('');
                    sendLog(`❌ Deployment failed with exit code: ${code}`);
                    sendLog('RESULT: failure');
                    sendLog('');
                    sendLog('💡 Troubleshooting tips:');
                    sendLog('   1. Verify your Supabase credentials are correct');
                    sendLog('   2. Ensure you are logged in: supabase login');
                    sendLog('   3. Check if Supabase CLI is installed (npm install -g supabase)');
                    sendLog('   4. Review the error messages above for specific issues');
                    logger.error('Deployment failed', new Error(`Exit code: ${code}`), { projectRef });
                }

                res.end();
            });

            child.on('error', (error) => {
                sendLog('');
                sendLog(`❌ Failed to run deployment: ${error.message}`);
                sendLog('RESULT: failure');
                sendLog('');
                sendLog('💡 This usually means:');
                sendLog('   - Bash is not available on your system');
                sendLog('   - The deployment script is not executable');
                sendLog('   - There are permission issues');
                logger.error('Deployment spawn error', error);
                res.end();
            });

            // Handle client disconnect
            req.on('close', () => {
                if (!child.killed) {
                    child.kill();
                    logger.info('Deployment process terminated - client disconnected');
                }
            });
        } catch (error: any) {
            sendLog('');
            sendLog(`❌ Server error: ${error.message}`);
            sendLog('RESULT: failure');
            logger.error('Deployment error', error);
            res.end();
        }
    })
);

export default router;
