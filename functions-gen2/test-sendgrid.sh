#!/bin/bash

# Check if the API key is provided
if [ -z "$1" ]; then
  echo "Error: SendGrid API key is required as the first argument"
  echo "Usage: ./test-sendgrid.sh YOUR_SENDGRID_API_KEY your_sender_email@example.com [optional_test_recipient@example.com]"
  exit 1
fi

# Check if sender email is provided
if [ -z "$2" ]; then
  echo "Error: Sender email is required as the second argument"
  echo "Usage: ./test-sendgrid.sh YOUR_SENDGRID_API_KEY your_sender_email@example.com [optional_test_recipient@example.com]"
  exit 1
fi

SENDGRID_API_KEY="$1"
SENDER_EMAIL="$2"
TEST_EMAIL="${3:-$SENDER_EMAIL}"  # If not provided, use sender email

echo "Starting SendGrid email test..."
echo "- Sender: $SENDER_EMAIL"
echo "- Test recipient: $TEST_EMAIL"

# Install ts-node if not already installed
if ! command -v ts-node &> /dev/null; then
  echo "Installing ts-node to run TypeScript files directly..."
  npm install -g ts-node typescript
fi

# Run the test script with environment variables
SENDGRID_API_KEY="$SENDGRID_API_KEY" SENDER_EMAIL="$SENDER_EMAIL" TEST_EMAIL="$TEST_EMAIL" npx ts-node src/testSendEmail.ts 