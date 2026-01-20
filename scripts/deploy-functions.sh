#!/bin/bash

# ==============================================================================
# EMAIL AUTOMATOR EDGE FUNCTIONS DEPLOYMENT
# ==============================================================================
#
# DESCRIPTION:
#   This script deploys all Edge Functions to your Supabase project.
#   It can be run standalone or called by the API server.
#
# PREREQUISITES:
#   1. Supabase CLI installed (global or local via npm)
#   2. You must be logged in (run: 'supabase login')
#   3. You need your Supabase Project Reference ID
#   4. You need your Database Password or Access Token
#
# USAGE:
#   Standalone:
#     ./deploy-functions.sh
#   
#   Via environment variables (used by API):
#     SUPABASE_PROJECT_ID=xxx SUPABASE_ACCESS_TOKEN=yyy ./deploy-functions.sh
#
# ==============================================================================

set -e

echo "🚀 Deploying Email Automator Edge Functions..."
echo ""

# Prefer bundled Supabase CLI from node_modules to keep version locked
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
ROOT_DIR=$(cd "$SCRIPT_DIR/.." && pwd)

find_supabase_bin() {
    local dir="$ROOT_DIR"
    while [ "$dir" != "/" ]; do
        local candidate="$dir/node_modules/.bin/supabase"
        if [ -x "$candidate" ]; then
            echo "$candidate"
            return 0
        fi
        dir=$(dirname "$dir")
    done
    return 1
}

SUPABASE_BIN=$(find_supabase_bin || true)

if [ -n "$SUPABASE_BIN" ]; then
    SUPABASE_CMD="$SUPABASE_BIN"
    echo "✅ Using bundled Supabase CLI: $SUPABASE_BIN"
elif command -v supabase &> /dev/null; then
    # Fallback to global if bundled CLI is not available
    echo "✅ Found global Supabase CLI"
    SUPABASE_CMD="supabase"
elif command -v npx &> /dev/null; then
    # Last resort: npx (will not download)
    echo "ℹ️  Bundled CLI not found. Falling back to npx."
    SUPABASE_CMD="npx --no-install supabase"
else
    echo "❌ Error: Neither 'npx' nor 'supabase' CLI is available"
    echo "   Please ensure Node.js is installed (for npx)"
    echo "   Or install Supabase CLI globally: npm install -g supabase"
    exit 1
fi

cd "$ROOT_DIR"

echo ""

# Get project ID from environment or prompt
if [ -z "$SUPABASE_PROJECT_ID" ]; then
    echo "─────────────────────────────────────────────────────────"
    echo "👉 Enter your Supabase Project Reference ID:"
    echo "   (Found in Supabase Dashboard > Project Settings > General)"
    read -p "   Project ID: " SUPABASE_PROJECT_ID
fi

if [ -z "$SUPABASE_PROJECT_ID" ]; then
    echo "❌ Error: Project ID is required to proceed."
    exit 1
fi

# Link to project if not already linked
echo "─────────────────────────────────────────────────────────"
echo "🔗 Linking to Supabase Project: $SUPABASE_PROJECT_ID"

# If we have an access token, use it for linking
if [ -n "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "🔑 Using access token for authentication"
    export SUPABASE_ACCESS_TOKEN
    $SUPABASE_CMD link --project-ref "$SUPABASE_PROJECT_ID"
elif [ -n "$SUPABASE_DB_PASSWORD" ]; then
    echo "🔑 Using database password for authentication"
    export SUPABASE_DB_PASSWORD
    $SUPABASE_CMD link --project-ref "$SUPABASE_PROJECT_ID"
else
    echo "🔑 NOTE: If asked, please enter your DATABASE PASSWORD."
    $SUPABASE_CMD link --project-ref "$SUPABASE_PROJECT_ID"
fi

echo ""
echo "─────────────────────────────────────────────────────────"
echo "📦 Deploying Edge Functions..."
echo ""

# Deploy each function
FUNCTIONS=(
    "auth-gmail"
    "auth-microsoft"
    "api-v1-accounts"
    "api-v1-emails"
    "api-v1-rules"
    "api-v1-settings"
)

DEPLOYED=0
FAILED=0

for func in "${FUNCTIONS[@]}"; do
    echo "   📦 Deploying $func..."
    if $SUPABASE_CMD functions deploy "$func" --no-verify-jwt; then
        ((DEPLOYED++))
    else
        echo "   ❌ Failed to deploy $func"
        ((FAILED++))
    fi
done

echo ""
echo "─────────────────────────────────────────────────────────"

if [ $FAILED -eq 0 ]; then
    echo "✅ All Edge Functions deployed successfully!"
    echo "   Deployed: $DEPLOYED functions"
else
    echo "⚠️  Deployment completed with errors"
    echo "   Deployed: $DEPLOYED functions"
    echo "   Failed: $FAILED functions"
    exit 1
fi

echo ""
echo "⚠️  Don't forget to set environment variables in Supabase Dashboard:"
echo "   Settings > Edge Functions > Add secret"
echo ""
echo "Required secrets:"
echo "  - TOKEN_ENCRYPTION_KEY"
echo "  - GMAIL_CLIENT_ID"
echo "  - GMAIL_CLIENT_SECRET"
echo "  - MS_GRAPH_CLIENT_ID"
echo "  - MS_GRAPH_CLIENT_SECRET"
echo ""
