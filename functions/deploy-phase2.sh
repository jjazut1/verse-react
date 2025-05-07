#!/bin/bash

# Password-less Authentication Phase 2 Deployment Script
# This script deploys all components needed for Phase 2 (Limited Beta)

set -e  # Exit immediately if a command exits with a non-zero status

# Display header
echo "======================================================"
echo "  PASSWORDLESS AUTHENTICATION PHASE 2 DEPLOYMENT"
echo "======================================================"
echo ""

# Step 1: Build and deploy Firebase Functions
echo "🔄 Building and deploying Firebase Functions..."
npm run build
firebase deploy --only functions:sendEmailLinkWithAssignment,functions:getAssignmentByIdForAuth

# Step 2: Set up monitoring and alerting
echo "🔄 Setting up monitoring and alerts..."
node setup-monitoring.js

# Step 3: Create test assignments for beta testers
echo "🔄 Creating beta test assignments..."
node src/test-email-link-auth.js

# Step 3.1: Create specific test assignments for jjazut1@gmail.com
echo "🔄 Creating specific beta test assignments for jjazut1@gmail.com..."
node src/create-jjazut-assignments.js

# Step 4: Deploy frontend components
echo "🔄 Deploying frontend components..."
cd ..
npm run build
firebase deploy --only hosting

# Step 5: Setup analytics dashboard
echo "🔄 Setting up analytics dashboard..."
cd functions
node src/create-dashboard.js

# Done
echo ""
echo "======================================================"
echo "  DEPLOYMENT COMPLETE"
echo "======================================================"
echo ""
echo "Phase 2 (Limited Beta) is now live!"
echo "Monitor progress in Firebase Console:"
echo "- Analytics: https://console.firebase.google.com/project/verse-11f2d/analytics/app/events"
echo "- Functions: https://console.firebase.google.com/project/verse-11f2d/functions/logs"
echo "- Firestore: https://console.firebase.google.com/project/verse-11f2d/firestore/data"
echo ""
echo "Next steps:"
echo "1. Check that beta testers received assignment emails"
echo "2. Monitor analytics for successful authentications"
echo "3. Review feedback in the 'emailAuthFeedback' collection"
echo ""
echo "For issues, check logs or run: firebase functions:log"
echo "======================================================" 