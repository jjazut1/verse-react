#!/bin/bash

# Build the functions
echo "Building functions..."
npm run build

# Deploy just the email-related functions
echo "Deploying email functions..."
firebase deploy --only functions:sendAssignmentEmail,functions:sendReminderEmails,functions:testEmail,functions:testAssignmentEmail

echo "Deployment complete! See DEPLOYMENT.md for instructions on testing the functions." 