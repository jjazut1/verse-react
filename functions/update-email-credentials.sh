#!/bin/bash

# Welcome message
echo "===== Gmail Credentials Update for Firebase Functions ====="
echo "This script will help you update your Gmail credentials for Firebase Functions."
echo

# Prompt for Gmail address
read -p "Enter your Gmail address: " gmail_address
if [ -z "$gmail_address" ]; then
  echo "Error: Gmail address cannot be empty."
  exit 1
fi

# Update EMAIL_USER
echo "Setting EMAIL_USER to $gmail_address..."
echo "$gmail_address" | firebase functions:secrets:set EMAIL_USER
if [ $? -ne 0 ]; then
  echo "Error setting EMAIL_USER. Please check your Firebase CLI setup."
  exit 1
fi
echo "EMAIL_USER updated successfully."
echo

# Prompt for App Password
read -p "Enter your 16-character App Password (without spaces): " app_password
if [ -z "$app_password" ]; then
  echo "Error: App Password cannot be empty."
  exit 1
fi

# Validate password length (should be 16 characters without spaces)
if [ ${#app_password} -ne 16 ]; then
  echo "Warning: App Password length is not 16 characters. Make sure you've entered it correctly without spaces."
  read -p "Continue anyway? (y/n): " continue_choice
  if [ "$continue_choice" != "y" ]; then
    echo "Operation cancelled."
    exit 1
  fi
fi

# Update EMAIL_PASSWORD
echo "Setting EMAIL_PASSWORD..."
echo "$app_password" | firebase functions:secrets:set EMAIL_PASSWORD
if [ $? -ne 0 ]; then
  echo "Error setting EMAIL_PASSWORD. Please check your Firebase CLI setup."
  exit 1
fi
echo "EMAIL_PASSWORD updated successfully."
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