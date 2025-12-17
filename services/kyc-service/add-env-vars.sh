#!/bin/bash

# Script to add environment variables to Vercel KYC service
cd services/kyc-service

echo "🚀 Adding environment variables to Vercel KYC service..."

# Function to add environment variable
add_env_var() {
    local var_name=$1
    local var_value=$2
    echo "Adding $var_name..."
    echo "$var_value" | vercel env add "$var_name" production
}

# Add all environment variables
add_env_var "KYC_PROVIDER" "sumsub"
add_env_var "SUMSUB_APP_TOKEN" "sbx:9pRoenOndx0i6Bue9d2UtMmI.Y8z8mcBA9pp3AUvIP2mBg5GKoOgqvLDZ"
add_env_var "SUMSUB_SECRET_KEY" "WTjLF3yxFtcGPCNUsMJfZg6iagls3SOJ"
add_env_var "SUMSUB_WEBHOOK_SECRET" "eRw3leUt6KNb2Jr6OKDFfH6VqKr"
add_env_var "SUMSUB_BASE_URL" "https://api.sumsub.com"
add_env_var "SUMSUB_LEVEL_NAME" "Home solutions verify"
add_env_var "DATABASE_URL" "postgresql://user:password@host:5432/db"
add_env_var "ALLOWED_ORIGINS" "https://your-frontend-domain.com"

echo "✅ Environment variables added successfully!"
echo "🔄 Redeploying with new environment variables..."

# Redeploy
vercel --prod --yes

echo "🎉 Deployment complete!"
echo "🌐 Webhook URL: https://kyc-service-hzic4zqbn-danteindrexs-projects.vercel.app/kyc/webhook/applicant-reviewed"