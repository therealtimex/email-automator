#!/usr/bin/env node

/**
 * Email Automator Setup CLI
 * Interactive setup for Email Automator
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function setup() {
  console.log('');
  console.log('🎯 Email Automator Setup');
  console.log('========================');
  console.log('');

  const envPath = join(__dirname, '..', '.env');
  const envExamplePath = join(__dirname, '..', '.env.example');

  // Check if .env already exists
  if (existsSync(envPath)) {
    const overwrite = await question('⚠️  .env file already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }

  console.log('');
  console.log('📝 Let\'s configure your Email Automator...');
  console.log('');

  // Supabase Configuration
  console.log('1️⃣  Supabase Configuration');
  console.log('   (Get these from: https://supabase.com/dashboard/project/_/settings/api)');
  console.log('');
  const supabaseUrl = await question('   Supabase URL: ');
  const supabaseAnonKey = await question('   Supabase Anon Key: ');

  // API Configuration
  console.log('');
  console.log('2️⃣  API Configuration');
  const port = await question('   API Port [3004]: ') || '3004';

  // LLM Configuration
  console.log('');
  console.log('3️⃣  LLM Configuration');
  const llmApiKey = await question('   OpenAI API Key: ');
  const llmModel = await question('   Model [gpt-4o-mini]: ') || 'gpt-4o-mini';

  // OAuth Configuration (optional)
  console.log('');
  console.log('4️⃣  OAuth Configuration (Optional - skip for now if not ready)');
  const gmailClientId = await question('   Gmail Client ID [skip]: ') || 'your_gmail_client_id';
  const gmailClientSecret = await question('   Gmail Client Secret [skip]: ') || 'your_gmail_client_secret';

  // Generate encryption key
  const encryptionKey = Array.from({ length: 32 }, () =>
    Math.random().toString(36).substring(2, 3)
  ).join('');

  // Create .env content
  const envContent = `# Supabase Configuration
VITE_SUPABASE_URL=${supabaseUrl}
VITE_SUPABASE_ANON_KEY=${supabaseAnonKey}

# API Configuration
VITE_API_URL=http://localhost:${port}
PORT=${port}

# OpenAI / LLM Configuration
LLM_API_KEY=${llmApiKey}
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=${llmModel}

# Security
JWT_SECRET="dev-secret-change-in-production"
TOKEN_ENCRYPTION_KEY="${encryptionKey}"

# Development
DISABLE_AUTH=true

# Gmail OAuth (optional)
GMAIL_CLIENT_ID=${gmailClientId}
GMAIL_CLIENT_SECRET=${gmailClientSecret}

# Microsoft Graph (optional)
MS_GRAPH_CLIENT_ID=your_ms_graph_client_id
MS_GRAPH_TENANT_ID=common
MS_GRAPH_CLIENT_SECRET=your_ms_graph_client_secret

# Processing
EMAIL_BATCH_SIZE=20
SYNC_INTERVAL_MS=300000
`;

  // Write .env file
  writeFileSync(envPath, envContent);

  console.log('');
  console.log('✅ Configuration saved to .env');
  console.log('');
  console.log('📚 Next Steps:');
  console.log('');
  console.log('   1. Deploy Edge Functions:');
  console.log('      $ supabase login');
  console.log('      $ ./scripts/deploy-functions.sh');
  console.log('');
  console.log('   2. Configure Edge Function secrets in Supabase Dashboard:');
  console.log('      Settings → Edge Functions → Add secrets');
  console.log('');
  console.log('   3. Start Email Automator:');
  console.log('      $ npx email-automator');
  console.log('      or');
  console.log('      $ npm run dev:api');
  console.log('');
  console.log('📖 Documentation: https://github.com/therealtimex/email-automator');
  console.log('');

  rl.close();
}

setup().catch((error) => {
  console.error('❌ Setup failed:', error.message);
  rl.close();
  process.exit(1);
});
