#!/bin/bash

# ==============================================================================
# REALTIMEX-EMAIL-AUTOMATOR MIGRATION & UPDATE UTILITY
# ==============================================================================
# Refactored for Quick Connect Support (Non-interactive)
set -e

echo "🚀 Starting RealTimeX Email Automator Migration..."

# 1. SETUP COMMANDS & PATHS
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
ROOT_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
cd "$ROOT_DIR"

SUPABASE_CMD="supabase"
if [ -x "./node_modules/.bin/supabase" ]; then
    SUPABASE_CMD="./node_modules/.bin/supabase"
elif ! command -v supabase &> /dev/null; then
    SUPABASE_CMD="npx supabase@latest"
fi

# 2. GATHER CREDENTIALS
if [ -z "$SUPABASE_PROJECT_ID" ]; then
    read -p "👉 Enter Supabase Project ID: " SUPABASE_PROJECT_ID
fi

if [ -z "$SUPABASE_PROJECT_ID" ]; then
    echo "❌ Error: Project ID required"
    exit 1
fi

# Support Access Token for non-interactive login if provided
if [ -n "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "🔑 Using provided Access Token for authentication..."
    export SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN
fi

# 3. EXECUTE MIGRATION
echo "🔗 Linking to project: $SUPABASE_PROJECT_ID"
# Try to link. If db password is provided, use it.
if [ -n "$SUPABASE_DB_PASSWORD" ]; then
    $SUPABASE_CMD link --project-ref "$SUPABASE_PROJECT_ID" --password "$SUPABASE_DB_PASSWORD" --yes
else
    # Link will use access token if available, otherwise might prompt
    $SUPABASE_CMD link --project-ref "$SUPABASE_PROJECT_ID" --yes
fi

echo "📂 Pushing Database Schema Changes..."
$SUPABASE_CMD db push --include-all --yes

echo "⚙️  Pushing Project Configuration..."
$SUPABASE_CMD config push --yes

# 4. SECRETS & FUNCTIONS
if [ "$SKIP_FUNCTIONS" != "1" ]; then
    echo "🔐 Setting up Edge Function secrets..."
    # Check if encryption key is already set, otherwise generate one
    if ! $SUPABASE_CMD secrets list --yes 2>/dev/null | grep -q "TOKEN_ENCRYPTION_KEY"; then
        echo "   Generating TOKEN_ENCRYPTION_KEY..."
        ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -d /=+ | cut -c1-32)
        $SUPABASE_CMD secrets set TOKEN_ENCRYPTION_KEY="$ENCRYPTION_KEY" --yes
    fi

    echo "⚡ Deploying Edge Functions..."
    if [ -d "supabase/functions" ]; then
        for dir in supabase/functions/*/ ; do
            # Use basename of dir for name, and check if it has index.ts
            func_name=$(basename "$dir")
            
            # Skip hidden, shared, or non-directory items
            if [ ! -d "$dir" ] || [[ "$func_name" =~ ^[._] ]] || [ "$func_name" == "shared" ]; then
                continue
            fi

            if [ -f "$dir/index.ts" ]; then
                echo "   Deploying $func_name (Cloud Build)..."
                $SUPABASE_CMD functions deploy "$func_name" --no-verify-jwt --use-api --yes
            else
                echo "   ⚠️  Skipping $func_name: index.ts not found"
            fi
        done
    fi
else
    echo "⏭️  Skipping Edge Functions deployment (SKIP_FUNCTIONS=1)"
fi

echo "✅ SUCCESS: Backend fully updated!"
