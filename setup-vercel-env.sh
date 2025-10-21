#!/bin/bash

# Script to automatically add environment variables from .env.local to Vercel
# Usage: chmod +x setup-vercel-env.sh && ./setup-vercel-env.sh

echo "Setting up Vercel environment variables from .env.local..."

# Read .env.local and add each variable to Vercel
while IFS='=' read -r key value; do
  # Skip empty lines and comments
  if [[ -z "$key" || "$key" =~ ^#.* ]]; then
    continue
  fi
  
  echo "Adding $key to Vercel..."
  echo "$value" | vercel env add "$key" production
  echo "$value" | vercel env add "$key" preview
  echo "$value" | vercel env add "$key" development
done < .env.local

echo "Environment variables setup complete!"
echo "Run 'vercel --prod' to redeploy with new environment variables."