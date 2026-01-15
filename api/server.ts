import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { supabase } from '../src/lib/supabase';
import { EmailProcessor } from '../src/core/processor';
import { EmailActions } from '../src/core/actions';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// Parse command line arguments for --port
const args = process.argv.slice(2);
let port = process.env.PORT || 3001;
const portIndex = args.indexOf("--port");
if (portIndex !== -1 && args[portIndex + 1]) {
    const customPort = parseInt(args[portIndex + 1], 10);
    if (!isNaN(customPort) && customPort > 0 && customPort < 65536) {
        port = customPort;
    }
}

const app = express();

app.use(cors());
app.use(express.json());

const processor = new EmailProcessor();
const actions = new EmailActions();

// Import auth handlers
import { GmailHandler } from '../src/core/auth';
import { MicrosoftGraphHandler } from '../src/core/auth';

const gmailHandler = new GmailHandler();
const m365Handler = new MicrosoftGraphHandler();

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Gmail Auth Endpoints
app.get('/api/auth/gmail/url', async (req, res) => {
    try {
        const url = await gmailHandler.getAuthUrl();
        res.json({ url });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/gmail/callback', async (req, res) => {
    const { code } = req.body;
    try {
        await gmailHandler.handleCallback(code);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// M365 Auth Endpoints
app.post('/api/auth/m365/device-flow', async (req, res) => {
    try {
        const flow = await m365Handler.initiateDeviceFlow();
        res.json(flow);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/m365/complete', async (req, res) => {
    const { device_code } = req.body;
    try {
        await m365Handler.completeDeviceFlow(device_code);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Sync triggers
app.post('/api/sync', async (req, res) => {
    const { accountId } = req.body;
    if (!accountId) return res.status(400).json({ error: 'accountId is required' });

    try {
        // Run sync in background
        processor.syncAccount(accountId).catch(err => console.error('Sync error:', err));
        res.json({ message: 'Sync started' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Perform action
app.post('/api/actions/execute', async (req, res) => {
    const { emailId, action, draftContent } = req.body;
    if (!emailId || !action) return res.status(400).json({ error: 'emailId and action are required' });

    try {
        await actions.executeAction(emailId, action, draftContent);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Database migration endpoint
app.post('/api/migrate', async (req, res) => {
    const { projectRef, dbPassword, accessToken } = req.body;

    if (!projectRef) {
        return res.status(400).json({ error: 'projectRef is required' });
    }

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    const sendLog = (message: string) => {
        res.write(message + '\n');
    };

    try {
        sendLog('🔧 Starting migration...');
        const scriptPath = join(__dirname, '..', 'scripts', 'migrate.sh');

        const env = {
            ...process.env,
            SUPABASE_PROJECT_ID: projectRef,
            SUPABASE_DB_PASSWORD: dbPassword || '',
            SUPABASE_ACCESS_TOKEN: accessToken || ''
        };

        const child = spawn('bash', [scriptPath], { env, cwd: join(__dirname, '..') });

        child.stdout.on('data', (data) => sendLog(data.toString().trim()));
        child.stderr.on('data', (data) => sendLog(`⚠️  ${data.toString().trim()}`));

        child.on('close', (code) => {
            if (code === 0) {
                sendLog('✅ Migration successful!');
            } else {
                sendLog(`❌ Migration failed with code ${code}`);
            }
            res.end();
        });
    } catch (error: any) {
        sendLog(`❌ Server error: ${error.message}`);
        res.end();
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
