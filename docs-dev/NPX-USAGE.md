# NPX Usage Guide

Email Automator is fully compatible with npx, allowing easy installation and execution without global installation.

## Quick Start with npx

### 1. Setup (First Time)

```bash
# Run interactive setup
npx @realtimex/email-automator-setup

# This will:
# - Create .env file with your configuration
# - Guide you through Supabase setup
# - Configure API ports
# - Set up LLM credentials
```

### 2. Deploy Edge Functions

```bash
# Deploy to Supabase
npx @realtimex/email-automator-deploy

# Or manually
supabase login
./scripts/deploy-functions.sh
```

### 3. Start Email Automator

```bash
# Start with default port (3004)
npx @realtimex/email-automator

# Start with custom port
npx @realtimex/email-automator --port 3005
```

## Available Commands

### Main Command

```bash
# Start the Email Automator API server
npx @realtimex/email-automator [options]

Options:
  --port <number>    Port to run on (default: 3004)
  --help            Show help

Examples:
  npx @realtimex/email-automator
  npx @realtimex/email-automator --port 3005
```

### Setup Command

```bash
# Interactive setup wizard
npx @realtimex/email-automator-setup

# Creates .env file with:
# - Supabase configuration
# - API port settings
# - LLM credentials
# - OAuth settings (optional)
```

### Deploy Command

```bash
# Deploy Edge Functions to Supabase
npx @realtimex/email-automator-deploy

# Automatically:
# - Checks Supabase CLI installation
# - Deploys all Edge Functions
# - Reminds you to set environment secrets
```

## Installation Methods

### Global Installation

```bash
# Install globally
npm install -g @realtimex/email-automator

# Run commands without npx
email-automator --port 3004
email-automator-setup
email-automator-deploy
```

### Local Installation

```bash
# Clone and install locally
git clone https://github.com/therealtimex/email-automator.git
cd email-automator
npm install

# Run locally
npm run dev:api
npm run dev
```

### Direct npx (No Installation)

```bash
# Run without installation (downloads temporarily)
npx @realtimex/email-automator

# Setup without installation
npx @realtimex/email-automator-setup
```

## Workflow Examples

### First-Time Setup

```bash
# 1. Setup configuration
npx @realtimex/email-automator-setup

# 2. Deploy Edge Functions
npx @realtimex/email-automator-deploy

# 3. Start the service
npx @realtimex/email-automator
```

### Daily Usage

```bash
# Just start it
npx @realtimex/email-automator

# Or with custom port
npx @realtimex/email-automator --port 3005
```

### Update and Redeploy

```bash
# Pull latest changes
git pull

# Redeploy Edge Functions
npx @realtimex/email-automator-deploy

# Restart service
npx @realtimex/email-automator
```

## Integration with RealTimeX Desktop

RealTimeX Desktop can invoke Email Automator via npx:

```javascript
// In RealTimeX Desktop
const { spawn } = require('child_process');

// Start Email Automator
const automator = spawn('npx', [
  '@realtimex/email-automator',
  '--port',
  '3004'
]);

// Monitor health
fetch('http://localhost:3004/api/health')
  .then(res => res.json())
  .then(data => console.log('Email Automator:', data.status));
```

## Environment Variables

Even when using npx, Email Automator reads from `.env`:

```bash
# .env file (auto-created by setup)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-key
PORT=3004
LLM_API_KEY=your-llm-key
```

## Troubleshooting

### Command Not Found

```bash
# Ensure npm is installed
node --version
npm --version

# Try with explicit version
npx @realtimex/email-automator@latest
```

### Port Already in Use

```bash
# Use different port
npx @realtimex/email-automator --port 3005

# Or kill existing process
lsof -ti:3004 | xargs kill -9
```

### Setup Fails

```bash
# Run setup again (will ask to overwrite)
npx @realtimex/email-automator-setup

# Or manually create .env
cp .env.example .env
# Edit .env with your values
```

### Deployment Fails

```bash
# Check Supabase CLI
supabase --version

# Install if missing
npm install -g supabase

# Login to Supabase
supabase login

# Try deployment again
npx @realtimex/email-automator-deploy
```

## Publishing to npm

For maintainers:

```bash
# Build the project
npm run build

# Test locally
npm link
email-automator --port 3004

# Publish to npm
npm publish --access public

# Users can now install
npx @realtimex/email-automator
```

## Benefits of npx

1. **No Installation**: Run directly without global install
2. **Always Latest**: npx uses latest version by default
3. **Clean**: No global package pollution
4. **Easy Updates**: Automatically uses new versions
5. **Cross-Platform**: Works on Windows, Mac, Linux
