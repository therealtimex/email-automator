#!/bin/bash

# ==============================================================================
# REALTIMEX-EMAIL-AUTOMATOR MIGRATION & UPDATE UTILITY
# ==============================================================================
#
# DESCRIPTION:
#   This script automates the backend update process for RealtimeX Email Automator.
#   It performs the following actions without requiring the user to clone git:
#   1. Uses the bundled Supabase config/migrations included with this package.
#   2. Links your local environment to your remote Supabase project.
#   3. Applies the latest Database Schema changes (Tables, Columns, etc).
#   4. Pushes the latest Project Configuration (Auth, Storage, etc).
#   5. Deploys the latest Edge Functions (API Logic) unless skipped.
#
# PREREQUISITES:
#   1. Supabase CLI available (bundled or global).
#   2. You must be logged in (run: 'supabase login') or provide credentials.
#   3. You need your Supabase Project Reference ID (e.g., 'abcdefghijklm').
#   4. You need your Database Password or Access Token (if prompted).
#
# HOW TO USE:
#   1. Run the script from the installed package folder.
#   2. Make the script executable (if needed):
#      chmod +x migrate.sh
#   3. Run the script:
#      ./migrate.sh
#
# ==============================================================================

# Exit immediately if any command fails
set -e

echo "🚀 Starting RealtimeX Email Automator Migration Tool..."

# ------------------------------------------------------------------------------
# 1. PRE-FLIGHT CHECKS
# ------------------------------------------------------------------------------

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
    echo "✅ Found global Supabase CLI."
    SUPABASE_CMD="supabase"
elif command -v npx &> /dev/null; then
    # Last resort: npx (will not download)
    echo "ℹ️  Bundled CLI not found. Falling back to npx."
    SUPABASE_CMD="npx --no-install supabase"
else
    echo "❌ Error: Neither 'npx' nor 'supabase' CLI is available."
    echo "   Please ensure Node.js is installed (for npx)."
    echo "   Or install Supabase CLI globally: brew install supabase/tap/supabase"
    exit 1
fi

if [ ! -d "$ROOT_DIR/supabase" ]; then
    echo "❌ Error: supabase folder not found at $ROOT_DIR/supabase"
    echo "   Please reinstall the package or run from a valid install."
    exit 1
fi

# ------------------------------------------------------------------------------
# 2. GATHER CREDENTIALS
# ------------------------------------------------------------------------------

# If the Project ID wasn't set as an env var, ask the user for it now.
if [ -z "$SUPABASE_PROJECT_ID" ]; then
    echo "---------------------------------------------------------"
    echo "👉 Enter your Supabase Project Reference ID:"
    echo "   (Found in Supabase Dashboard > Project Settings > General)"
    read -p "   Project ID: " SUPABASE_PROJECT_ID
fi

if [ -z "$SUPABASE_PROJECT_ID" ]; then
    echo "❌ Error: Project ID is required to proceed."
    exit 1
fi

# ------------------------------------------------------------------------------
# 3. EXECUTE MIGRATION
# ------------------------------------------------------------------------------

# Move into the package root to run Supabase commands
cd "$ROOT_DIR"

echo "---------------------------------------------------------"
echo "🔗 Linking to Supabase Project: $SUPABASE_PROJECT_ID"
echo "🔑 NOTE: If asked, please enter your DATABASE PASSWORD."
# This connects the CLI to the remote project. 
# It will pause and ask for the password if not found in env vars.
$SUPABASE_CMD link --project-ref "$SUPABASE_PROJECT_ID"

echo "---------------------------------------------------------"
echo "📂 Pushing Database Schema Changes..."
# This compares local SQL migrations with the remote DB and applies differences.
$SUPABASE_CMD db push

echo "---------------------------------------------------------"
echo "⚙️  Pushing Project Configuration..."
# Pushes Auth, Storage, and other project settings from config.toml
$SUPABASE_CMD config push

echo "---------------------------------------------------------"
echo "🔐 Setting up Edge Function secrets..."
# Generate TOKEN_ENCRYPTION_KEY if not already set
# This key is used to encrypt OAuth tokens before storing in the database
if $SUPABASE_CMD secrets list 2>/dev/null | grep -q "TOKEN_ENCRYPTION_KEY"; then
    echo "   TOKEN_ENCRYPTION_KEY already exists, skipping..."
else
    echo "   Generating TOKEN_ENCRYPTION_KEY..."
    ENCRYPTION_KEY=$(openssl rand -base64 24)
    $SUPABASE_CMD secrets set TOKEN_ENCRYPTION_KEY="$ENCRYPTION_KEY"
    echo "   ✅ TOKEN_ENCRYPTION_KEY has been set"
fi

echo "---------------------------------------------------------"
if [ "$SKIP_FUNCTIONS" = "1" ]; then
    echo "⏭️  Skipping Edge Functions deployment (SKIP_FUNCTIONS=1)."
else
    echo "⚡ Deploying Edge Functions..."
    # Deploys API logic explicitly for each function to ensure they are all deployed
    # We skip _shared and hidden folders
    if [ -d "supabase/functions" ]; then
        for func in supabase/functions/*; do
            if [ -d "$func" ]; then
                func_name=$(basename "$func")
                # Skip _shared and hidden folders
                if [[ "$func_name" != "_shared" && "$func_name" != .* ]]; then
                    echo "   Deploying $func_name..."
                    if ! $SUPABASE_CMD functions deploy "$func_name" --no-verify-jwt; then
                        echo "❌ Error: Failed to deploy function '$func_name'."
                        exit 1
                    fi
                fi
            fi
        done
    else
        echo "⚠️ Warning: supabase/functions directory not found. Skipping function deployment."
    fi
fi


# ------------------------------------------------------------------------------
# 4. COMPLETION
# ------------------------------------------------------------------------------

echo "---------------------------------------------------------"
echo "✅ SUCCESS: Backend updated successfully!"
echo "   You can now run the application!"
echo "---------------------------------------------------------"
