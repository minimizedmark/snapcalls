#!/bin/bash

# Import environment variables from .env.production to Vercel
# Run this with: bash import-env-to-vercel.sh

# Make sure you're logged in to Vercel CLI first with: vercel login

echo "Importing environment variables to Vercel..."

# Read .env.production and import each variable
while IFS='=' read -r key value; do
  # Skip empty lines and comments
  if [[ -z "$key" || "$key" == \#* ]]; then
    continue
  fi
  
  # Remove quotes from value
  value=$(echo "$value" | sed 's/^"//;s/"$//')
  
  # Import to Vercel (production, preview, and development)
  echo "Adding $key..."
  vercel env add "$key" production <<< "$value"
  vercel env add "$key" preview <<< "$value"
  
done < .env.production

echo "Done! All environment variables imported to Vercel."
echo "Don't forget to add STRIPE_WEBHOOK_SECRET after creating your webhook!"
