#!/usr/bin/env node

/**
 * Email Automator CLI
 * Main command to run the Email Automator API server
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);

// Default port
let port = '3004';
const portIndex = args.indexOf('--port');
if (portIndex !== -1 && args[portIndex + 1]) {
  port = args[portIndex + 1];
}

const noUi = args.includes('--no-ui');

console.log('🚀 Starting Email Automator...');
console.log(`📡 Port: ${port}`);
if (noUi) console.log('🖥️  Mode: No-UI');
console.log('');

// Path to server
const serverPath = join(__dirname, '..', 'api', 'server.ts');

// Resolve tsx binary path
// In npx/installed mode, it will be in ../node_modules/.bin/tsx
// In dev mode, it will be in ../node_modules/.bin/tsx
const tsxPath = join(__dirname, '..', 'node_modules', '.bin', 'tsx');

// Start server with resolved tsx
const server = spawn(tsxPath, [serverPath, ...args], {
  stdio: 'inherit',
  env: { ...process.env, PORT: port },
});

server.on('error', (error) => {
  console.error('❌ Failed to start Email Automator:', error.message);
  process.exit(1);
});

server.on('close', (code) => {
  if (code !== 0) {
    console.log(`\n⚠️  Email Automator stopped with code ${code}`);
  }
  process.exit(code || 0);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Shutting down Email Automator...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  server.kill('SIGTERM');
});
