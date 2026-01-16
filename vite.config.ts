import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { spawn } from 'child_process';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        {
            name: 'api-migrate',
            configureServer(server) {
                server.middlewares.use('/api/migrate', async (req, res, next) => {
                    if (req.method !== 'POST') return next();

                    try {
                        // Parse request body
                        const buffers = [];
                        for await (const chunk of req) {
                            buffers.push(chunk);
                        }

                        let body = {};
                        try {
                            body = JSON.parse(Buffer.concat(buffers).toString());
                        } catch {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Invalid JSON in request body' }));
                            return;
                        }

                        const { projectRef, dbPassword, accessToken } = body;

                        // Validation
                        if (!projectRef) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'projectRef is required' }));
                            return;
                        }

                        // Set up streaming response
                        res.writeHead(200, {
                            'Content-Type': 'text/plain',
                            'Transfer-Encoding': 'chunked',
                            'Cache-Control': 'no-cache',
                        });

                        const log = (msg) => res.write(`${msg}\n`);

                        log('🚀 Starting migration (Development Mode)...');
                        log('');

                        // Prepare environment
                        const env = {
                            ...process.env,
                            SUPABASE_PROJECT_ID: projectRef,
                        };

                        if (accessToken) {
                            env.SUPABASE_ACCESS_TOKEN = accessToken;
                            log('🔑 Using provided access token');
                        } else if (dbPassword) {
                            env.SUPABASE_DB_PASSWORD = dbPassword;
                            log('🔑 Using provided database password');
                        }

                        log('');
                        log('─'.repeat(60));
                        log('');

                        // Path to migration script
                        const scriptPath = path.join(process.cwd(), 'scripts', 'migrate.sh');

                        // Execute migration script
                        const migrationProcess = spawn('bash', [scriptPath], {
                            env,
                            cwd: process.cwd(),
                            stdio: ['ignore', 'pipe', 'pipe'],
                        });

                        let hasError = false;

                        // Stream stdout
                        migrationProcess.stdout.on('data', (data) => {
                            const lines = data.toString().split('\n');
                            lines.forEach((line) => {
                                if (line.trim()) log(line);
                            });
                        });

                        // Stream stderr
                        migrationProcess.stderr.on('data', (data) => {
                            const lines = data.toString().split('\n');
                            lines.forEach((line) => {
                                if (line.trim()) {
                                    if (line.toLowerCase().includes('error') || line.toLowerCase().includes('failed')) {
                                        log(`❌ ${line}`);
                                        hasError = true;
                                    } else {
                                        log(`⚠️  ${line}`);
                                    }
                                }
                            });
                        });

                        // Handle completion
                        migrationProcess.on('close', (code) => {
                            log('');
                            log('─'.repeat(60));
                            log('');

                            if (code === 0 && !hasError) {
                                log('✅ Migration completed successfully!');
                                log('');
                                log('🎉 Your database is now ready to use.');
                            } else {
                                log(`❌ Migration failed with exit code: ${code}`);
                                log('');
                                log('💡 Ensure Supabase CLI is installed: npm install');
                            }

                            res.end();
                        });

                        // Handle errors
                        migrationProcess.on('error', (error) => {
                            log('');
                            log(`❌ Failed to start migration: ${error.message}`);
                            res.end();
                        });

                        // Handle client disconnect
                        req.on('close', () => {
                            if (!migrationProcess.killed) {
                                migrationProcess.kill();
                            }
                        });
                    } catch (error) {
                        console.error('[Migration API] Error:', error);
                        if (!res.headersSent) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Internal server error' }));
                        }
                    }
                });
            },
        },
    ],
    server: {
        port: 3000,
        proxy: {
            '/api': 'http://localhost:3001'
        }
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
