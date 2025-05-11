#!/bin/bash

# Check if the API key is provided
if [ -z "$1" ]; then
  echo "Error: SendGrid API key is required as the first argument"
  echo "Usage: ./validate-key.sh YOUR_SENDGRID_API_KEY"
  exit 1
fi

SENDGRID_API_KEY="$1"

echo "Running API key validator..."

# Run the validation script
SENDGRID_API_KEY="$SENDGRID_API_KEY" npx ts-node src/validateApiKey.ts 