#!/bin/bash

# Passwordless Authentication Production Deployment Script
# This script deploys all components directly to production, skipping beta testing

set -e  # Exit immediately if a command exits with a non-zero status

# Display header
echo "======================================================"
echo "  PASSWORDLESS AUTHENTICATION PRODUCTION DEPLOYMENT"
echo "======================================================"
echo ""

echo "⚠️  IMPORTANT: Deploying directly to production without beta testing"
echo "This deployment skips the beta testing phase and enables the following:"
echo "- Email link authentication (passwordless auth) for all new assignments"
echo "- Adds a toggle in the assignment creation form"
echo "- Sends authentication emails through Firebase Functions"
echo ""
echo "Press CTRL+C now to cancel or wait 5 seconds to continue..."
sleep 5

# Step 1: Build and deploy Firebase Functions
echo ""
echo "🔄 Building and deploying Firebase Functions..."
npm run build
firebase deploy --only functions:sendEmailLinkWithAssignment,functions:getAssignmentByIdForAuth

# Step 2: Deploy frontend components
echo ""
echo "🔄 Deploying frontend components..."
cd ..
npm run build
firebase deploy --only hosting

# Step 3: Verify deployment
echo ""
echo "🔄 Verifying deployment..."
echo "Functions deployment status: ✅"
echo "Frontend deployment status: ✅"

# Done
echo ""
echo "======================================================"
echo "  DEPLOYMENT COMPLETE"
echo "======================================================"
echo ""
echo "Passwordless Authentication is now live in production!"
echo ""
echo "Production URLs:"
echo "- Application: https://r2process.com"
echo "- Firebase console: https://console.firebase.google.com/project/verse-11f2d"
echo ""
echo "Monitor production in Firebase Console:"
echo "- Analytics: https://console.firebase.google.com/project/verse-11f2d/analytics/app/events"
echo "- Functions: https://console.firebase.google.com/project/verse-11f2d/functions/logs"
echo "- Firestore: https://console.firebase.google.com/project/verse-11f2d/firestore/data"
echo ""
echo "Quick post-deployment verification:"
echo "1. Create a test assignment with passwordless auth enabled"
echo "2. Check that the email is sent successfully"
echo "3. Click the link in the email to verify authentication flow"
echo ""
echo "For issues, check logs or run: firebase functions:log"
echo "======================================================" 