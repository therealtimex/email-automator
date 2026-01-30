#!/usr/bin/env node

/**
 * Email Automator CLI
 * Main command to run the Email Automator server
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);

// Default port 3004
let port = '3004';
const portIndex = args.indexOf('--port');
if (portIndex !== -1 && args[portIndex + 1]) {
  port = args[portIndex + 1];
}

const noUi = args.includes('--no-ui');

console.log('🚀 Email Automator starting...');
console.log(`📡 Port: ${port}`);
if (noUi) console.log('🖥️  Mode: No-UI');
console.log('');

// Robust resolution for server path
const distServerPath = join(__dirname, '..', 'dist', 'api', 'server.js');
const sourceServerPath = join(__dirname, '..', 'api', 'server.ts');
const distPath = join(__dirname, '..', 'dist');

let execPath = process.execPath;
let execArgs = [];

if (existsSync(distServerPath)) {
  // Use compiled JS if available
  execArgs = [distServerPath, ...args];
  console.log('📦 Using compiled production server...');
} else if (existsSync(sourceServerPath)) {
  // Fallback to tsx for development/source run
  execPath = 'npx';
  execArgs = ['tsx', sourceServerPath, ...args];
  console.log('🧪 Compiled server not found. Falling back to source (tsx)...');
} else {
  console.error('❌ Error: Could not find server entry point.');
  console.error(`   Looked in: \n   - ${distServerPath}\n   - ${sourceServerPath}`);
  process.exit(1);
}

// Start server with standard node
const server = spawn(execPath, execArgs, {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: port,
    ELECTRON_STATIC_PATH: distPath // For serving production UI if it exists
  },
});

server.on('error', (error) => {
  console.error('❌ Failed to start Email Automator:', error.message);
  process.exit(1);
});

server.on('close', (code) => {
  if (code !== 0 && code !== null) {
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
