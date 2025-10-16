#!/bin/bash

# Vercel Environment Variables Setup Script
# This script helps you configure all required environment variables for Vercel deployment

echo "======================================"
echo "IFA Labs Dashboard - Vercel Setup"
echo "======================================"
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed."
    echo "Install it with: npm install -g vercel"
    exit 1
fi

echo "This script will help you set up environment variables for Vercel."
echo ""

# Get backend URL
echo "Enter your backend URL (e.g., http://146.190.186.116:8000):"
read -r BACKEND_URL

if [ -z "$BACKEND_URL" ]; then
    echo "❌ Backend URL is required!"
    exit 1
fi

echo ""
echo "Setting environment variables..."
echo ""

# Function to set env var
set_env() {
    local name=$1
    local value=$2
    echo "Setting $name..."
    echo "$value" | vercel env add "$name" production preview development
}

# Set the main backend URL
set_env "PROXY_UPSTREAM_URL" "$BACKEND_URL"

# Authentication paths
set_env "NEXT_PUBLIC_AUTH_LOGIN_PATH" "/api/dashboard/login"
set_env "NEXT_PUBLIC_AUTH_REGISTER_PATH" "/api/dashboard/signup"
set_env "NEXT_PUBLIC_AUTH_LOGOUT_PATH" "/api/dashboard/logout"
set_env "NEXT_PUBLIC_AUTH_VERIFY_PATH" "/api/dashboard/{id}/profile"

# Dashboard paths
set_env "NEXT_PUBLIC_COMPANY_PROFILE_PATH" "/api/dashboard/{id}/profile"
set_env "NEXT_PUBLIC_PROFILE_KEYS_PATH" "/api/dashboard/{id}/api-keys"
set_env "NEXT_PUBLIC_PROFILE_KEYS_CREATE_PATH" "/api/dashboard/{id}/api-keys"
set_env "NEXT_PUBLIC_PROFILE_USAGE_PATH" "/api/dashboard/{id}/usage"

# Oracle Engine endpoints
set_env "NEXT_PUBLIC_PRICES_LAST_PATH" "/api/prices/last"
set_env "NEXT_PUBLIC_PRICES_STREAM_PATH" "/api/prices/stream"
set_env "NEXT_PUBLIC_ASSETS_PATH" "/api/assets"
set_env "NEXT_PUBLIC_SUBSCRIPTION_PLANS_PATH" "/api/subscription/plans"

echo ""
echo "✅ Environment variables have been set!"
echo ""
echo "Next steps:"
echo "1. Deploy your app: vercel --prod"
echo "2. Test the signup/login functionality"
echo ""
echo "If you encounter issues, check:"
echo "- Backend server is running at $BACKEND_URL"
echo "- Firewall allows connections to the backend port"
echo "- Review the logs in Vercel Dashboard"
echo ""

