#!/bin/bash

# Script to deploy the email link authentication functions for Verse Learning

echo "===== Deploying Email Link Authentication Functions ====="
echo "This script will deploy the following functions:"
echo "  - sendEmailLinkWithAssignment (onDocumentCreated)"
echo "  - getAssignmentByIdForAuth (callable)"
echo ""

# Build the functions
echo "Building functions..."
npm run build

# Deploy only the specific functions
echo "Deploying email link authentication functions..."
firebase deploy --only functions:sendEmailLinkWithAssignment,functions:getAssignmentByIdForAuth

echo ""
echo "===== Deployment Complete ====="
echo "Use the test script to verify the functions are working:"
echo "  node test-email-link-auth.js"
echo ""
echo "Make sure to update the SendGrid API key if needed:"
echo "  firebase functions:config:set sendgrid.key=SG.YOUR_API_KEY"
echo "" 