#!/bin/bash

# RealTimeX Email Automator Migration Script
set -e

GITHUB_ORG="therealtimex"
REPO_NAME="email-automator"
BRANCH="main"

echo "🚀 Starting Email Automator Migration..."

SUPABASE_CMD="supabase"
if ! command -v supabase &> /dev/null; then
    SUPABASE_CMD="npx supabase"
fi

# Use provided Project ID
if [ -z "$SUPABASE_PROJECT_ID" ]; then
    echo "❌ Error: SUPABASE_PROJECT_ID is required."
    exit 1
fi

WORK_DIR=$(mktemp -d)
cleanup() {
    rm -rf "$WORK_DIR"
    echo "🧹 Cleaned up."
}
trap cleanup EXIT

echo "📥 Downloading migrations..."
curl -L -s "https://github.com/$GITHUB_ORG/$REPO_NAME/archive/refs/heads/$BRANCH.tar.gz" -o "$WORK_DIR/repo.tar.gz"
tar -xzf "$WORK_DIR/repo.tar.gz" -C "$WORK_DIR" --strip-components=1

cd "$WORK_DIR"

if [ -n "$SUPABASE_DB_PASSWORD" ]; then
    echo "� using DB Password authentication..."
    # Construct connection string
    # Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres
    DB_URL="postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${SUPABASE_PROJECT_ID}.supabase.co:5432/postgres"
    
    echo "📂 Pushing Schema via DB URL..."
    $SUPABASE_CMD db push --db-url "$DB_URL"
else
    echo "�🔗 Linking Project: $SUPABASE_PROJECT_ID"
    # This requires SUPABASE_ACCESS_TOKEN to be set
    $SUPABASE_CMD link --project-ref "$SUPABASE_PROJECT_ID"
    
    echo "📂 Pushing Schema..."
    $SUPABASE_CMD db push
fi

echo "✅ Migration Complete!"
