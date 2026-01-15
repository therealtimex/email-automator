import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from '../src/lib/supabase';
import { EmailProcessor } from '../src/core/processor';
import { EmailActions } from '../src/core/actions';

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

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
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

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
