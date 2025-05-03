#!/bin/bash

# Welcome message
echo "===== SendGrid Credentials Update for Firebase Functions ====="
echo "This script will help you update your SendGrid credentials for Firebase Functions."
echo

# Prompt for Sender Email
read -p "Enter your verified sender email (must be verified in SendGrid): " sender_email
if [ -z "$sender_email" ]; then
  echo "Error: Sender email cannot be empty."
  exit 1
fi

# Update SENDER_EMAIL
echo "Setting SENDER_EMAIL to $sender_email..."
echo "$sender_email" | firebase functions:secrets:set SENDER_EMAIL
if [ $? -ne 0 ]; then
  echo "Error setting SENDER_EMAIL. Please check your Firebase CLI setup."
  exit 1
fi
echo "SENDER_EMAIL updated successfully."
echo

# Prompt for SendGrid API Key
read -p "Enter your SendGrid API Key: " api_key
if [ -z "$api_key" ]; then
  echo "Error: API Key cannot be empty."
  exit 1
fi

# Update SENDGRID_API_KEY
echo "Setting SENDGRID_API_KEY..."
echo "$api_key" | firebase functions:secrets:set SENDGRID_API_KEY
if [ $? -ne 0 ]; then
  echo "Error setting SENDGRID_API_KEY. Please check your Firebase CLI setup."
  exit 1
fi
echo "SENDGRID_API_KEY updated successfully."
echo

# Ask if user wants to redeploy
read -p "Do you want to redeploy the functions now? (y/n): " redeploy_choice
if [ "$redeploy_choice" = "y" ]; then
  echo "Redeploying functions..."
  ./deploy-email-functions.sh
  echo "Redeployment complete."
  echo
  echo "To test if emails are working, create a new assignment in the app."
  echo "You can check the logs with: firebase functions:log"
else
  echo
  echo "Credentials updated but functions not redeployed."
  echo "To deploy later, run: ./deploy-email-functions.sh"
fi

echo
echo "===== Operation Complete =====" 