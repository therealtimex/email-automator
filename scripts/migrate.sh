#!/bin/bash

# ==============================================================================
# REALTIMEX-EMAIL-AUTOMATOR MIGRATION & UPDATE UTILITY
# ==============================================================================
# Supports both interactive and non-interactive (CI/CD) execution
#
# Required Environment Variables:
#   SUPABASE_PROJECT_ID      - Your Supabase project reference ID
#   SUPABASE_ANON_KEY        - Your Supabase anon/public API key (for knowledge ingestion)
#   SUPABASE_ACCESS_TOKEN    - Supabase access token (for non-interactive auth)
#
# Optional Environment Variables:
#   SKIP_FUNCTIONS=1         - Skip Edge Functions deployment
#   SKIP_KNOWLEDGE_INGEST=1  - Skip RAG knowledge base ingestion
#
# Examples:
#   Interactive: ./scripts/migrate.sh
#   Non-interactive: SUPABASE_PROJECT_ID=xxx SUPABASE_ANON_KEY=yyy ./scripts/migrate.sh
#   Skip ingestion: SKIP_KNOWLEDGE_INGEST=1 ./scripts/migrate.sh
# ==============================================================================
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
# Link using access token (required for automated flow)
$SUPABASE_CMD link --project-ref "$SUPABASE_PROJECT_ID" --yes

echo "📂 Pushing Database Schema Changes..."
$SUPABASE_CMD db push --include-all --yes

echo "⚙️  Pushing Project Configuration..."
$SUPABASE_CMD config push --yes

# 4. KNOWLEDGE BASE INGESTION (RAG)
if [ "$SKIP_KNOWLEDGE_INGEST" != "1" ]; then
    echo "📚 Ingesting Knowledge Base for RAG..."

    # Construct API URL from project ID
    API_URL="https://${SUPABASE_PROJECT_ID}.supabase.co"

    # Try to get access token from environment or prompt
    ACCESS_TOKEN_FOR_API="${SUPABASE_ACCESS_TOKEN}"

    if [ -z "$ACCESS_TOKEN_FOR_API" ]; then
        echo ""
        echo "   Knowledge ingestion requires a Supabase Access Token to fetch the service role key."
        echo "   Get your access token at: https://supabase.com/dashboard/account/tokens"
        echo ""
        read -p "   Enter Access Token (or press Enter to skip ingestion): " ACCESS_TOKEN_FOR_API
    fi

    if [ -n "$ACCESS_TOKEN_FOR_API" ]; then
        echo "   Fetching project keys using access token..."

        # Fetch project API keys from Supabase Management API
        KEYS_RESPONSE=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN_FOR_API" \
            "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_ID}/api-keys" 2>/dev/null)

        # Extract service_role key from JSON response
        SERVICE_ROLE_KEY=$(echo "$KEYS_RESPONSE" | grep -o '"service_role","api_key":"[^"]*"' | cut -d'"' -f6 || echo "")

        if [ -n "$SERVICE_ROLE_KEY" ]; then
            echo "   ✓ Retrieved service role key"
            export SUPABASE_URL="$API_URL"
            export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"

            if npm run ingest:knowledge; then
                echo "   ✓ Knowledge base ingested successfully"
            else
                echo "   ⚠️  Knowledge ingestion failed (non-fatal)"
                echo "   You can run manually later with:"
                echo "   SUPABASE_URL=$API_URL SUPABASE_SERVICE_ROLE_KEY=<your-key> npm run ingest:knowledge"
            fi
        else
            echo "   ⚠️  Could not fetch service role key from API"
            echo "   API returned: $KEYS_RESPONSE"
            echo "   Skipping knowledge ingestion"
            echo ""
            echo "   To run manually, get your service role key from:"
            echo "   https://supabase.com/dashboard/project/${SUPABASE_PROJECT_ID}/settings/api"
            echo "   Then run: SUPABASE_URL=$API_URL SUPABASE_SERVICE_ROLE_KEY=<key> npm run ingest:knowledge"
        fi
    else
        echo "   ⏭️  Skipping knowledge ingestion (no access token provided)"
        echo ""
        echo "   To run manually later:"
        echo "   1. Get access token: https://supabase.com/dashboard/account/tokens"
        echo "   2. Run: SUPABASE_ACCESS_TOKEN=<token> npm run ingest:knowledge"
        echo "   Or provide service role key directly:"
        echo "   SUPABASE_URL=$API_URL SUPABASE_SERVICE_ROLE_KEY=<key> npm run ingest:knowledge"
    fi
else
    echo "⏭️  Skipping Knowledge Base ingestion (SKIP_KNOWLEDGE_INGEST=1)"
    echo "   Run manually later: npm run ingest:knowledge"
fi

# 5. SECRETS & FUNCTIONS
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

# 6. COMPLETION
echo ""
echo "✅ SUCCESS: Backend fully updated!"
echo ""
echo "📝 Next steps:"
echo "   - Frontend: npm run build && npm run serve"
echo "   - Test RAG: Ask the AI assistant a question"
echo "   - Manual knowledge update: npm run ingest:knowledge"
echo ""
