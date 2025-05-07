#!/bin/bash

# Build the functions
echo "Building functions..."
npm run build

# Deploy just the test functions with public access
echo "Deploying test functions with public access..."
firebase deploy --only functions:testEmail,functions:testAssignmentEmail

echo "Deployment complete! See DEPLOYMENT.md for instructions on testing the functions." 