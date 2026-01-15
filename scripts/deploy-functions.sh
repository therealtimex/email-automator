#!/bin/bash

# Deploy Supabase Edge Functions
# This script deploys all Edge Functions to your Supabase project

set -e

echo "🚀 Deploying Email Automator Edge Functions..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

# Check if user is logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged into Supabase CLI"
    echo "Run: supabase login"
    exit 1
fi

echo "✅ Supabase CLI detected"
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

for func in "${FUNCTIONS[@]}"; do
    echo "📦 Deploying $func..."
    supabase functions deploy "$func" --no-verify-jwt
done

echo ""
echo "✅ All Edge Functions deployed successfully!"
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
