#!/bin/bash
# ============================================
# Deploy Mozello Product Fetch Function
# ============================================
# This script deploys the fetch-mozello-products
# edge function to Supabase
# ============================================

echo ""
echo "============================================"
echo "  Mozello Product Fetch Function Deployment"
echo "============================================"
echo ""

# Check if Supabase CLI is installed
echo "Checking Supabase CLI installation..."
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed!"
    echo ""
    echo "Please install it first:"
    echo "  npm install -g supabase"
    exit 1
fi
SUPABASE_VERSION=$(supabase --version)
echo "✅ Supabase CLI installed: $SUPABASE_VERSION"
echo ""

# Step 1: Login to Supabase
echo "Step 1: Login to Supabase"
echo "If not logged in, a browser window will open..."
supabase login
if [ $? -ne 0 ]; then
    echo "❌ Failed to login to Supabase!"
    exit 1
fi
echo "✅ Logged in successfully"
echo ""

# Step 2: Link project
echo "Step 2: Link Your Supabase Project"
echo "Get your project reference ID from:"
echo "  https://supabase.com/dashboard > Your Project > Settings > General"
echo "  (Look for 'Reference ID' - example: emqhyievrsyeinwrqqhw)"
echo ""
read -p "Enter your project reference ID: " PROJECT_REF

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Project reference ID is required!"
    exit 1
fi

supabase link --project-ref "$PROJECT_REF"
if [ $? -ne 0 ]; then
    echo "❌ Failed to link project!"
    exit 1
fi
echo "✅ Project linked successfully"
echo ""

# Step 3: Set Mozello API Key
echo "Step 3: Set Mozello API Key"
echo "Your Mozello API Key (from mozelloService.js or Mozello dashboard):"
echo ""
echo "⚠️  WARNING: Keep this key secret! It will be stored securely in Supabase."
echo ""
read -sp "Enter your Mozello API Key (e.g., MZL-XXXXXXX-...): " MOZELLO_API_KEY
echo ""

if [ -z "$MOZELLO_API_KEY" ]; then
    echo "❌ Mozello API Key is required!"
    exit 1
fi

supabase secrets set MOZELLO_API_KEY="$MOZELLO_API_KEY"
if [ $? -ne 0 ]; then
    echo "❌ Failed to set Mozello API key!"
    exit 1
fi
echo "✅ Mozello API Key set successfully"
echo ""

# Step 4: Deploy function
echo "Step 4: Deploy fetch-mozello-products function"
supabase functions deploy fetch-mozello-products
if [ $? -ne 0 ]; then
    echo "❌ Failed to deploy function!"
    exit 1
fi

echo ""
echo "==========================================="
echo "  ✅ Edge Function Deployed Successfully!"
echo "==========================================="
echo ""
echo "Next Steps:"
echo "1. The edge function is now deployed and secure"
echo "2. Your Mozello API key is safely stored in Supabase secrets"
echo "3. Test the invoice creation page to load products"
echo ""
echo "⚠️  IMPORTANT: Remove the API key from mozelloService.js if you haven't already!"
echo ""









