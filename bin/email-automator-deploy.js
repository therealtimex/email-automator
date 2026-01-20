#!/usr/bin/env node

/**
 * Email Automator Deploy CLI
 * Deploy Edge Functions to Supabase
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Email Automator - Edge Functions Deployment');
console.log('===============================================');
console.log('');

// Run deployment script (handles CLI detection internally)
const deployScript = join(__dirname, '..', 'scripts', 'deploy-functions.sh');

if (!existsSync(deployScript)) {
  console.error('❌ Deployment script not found:', deployScript);
  process.exit(1);
}

console.log('📦 Deploying Edge Functions...');
console.log('');

const deploy = spawn('bash', [deployScript], {
  stdio: 'inherit',
  cwd: join(__dirname, '..'),
});

deploy.on('error', (error) => {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
});

deploy.on('close', (code) => {
  if (code !== 0) {
    console.error('\n❌ Deployment failed with code', code);
    process.exit(code);
  }

  console.log('');
  console.log('✅ Deployment complete!');
  console.log('');
  console.log('🔐 Don\'t forget to configure secrets in Supabase Dashboard:');
  console.log('   Settings → Edge Functions → Add secrets');
  console.log('');
  process.exit(0);
});
