#!/bin/bash

echo "===== Updating Firebase Service Account Permissions ====="
echo "This script will ensure the Firebase service account has proper permissions"
echo "to write to the Firestore database."
echo

# Get the project ID
PROJECT_ID="verse-11f2d"
SERVICE_ACCOUNT="127492531233-compute@developer.gserviceaccount.com"

# Add the Firebase Admin SDK service account role
echo "Adding Firebase Admin SDK role to service account..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/firebase.sdkAdminServiceAgent"

# Add the Firestore User role for direct database operations
echo "Adding Firestore User role to service account..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/datastore.user"

echo
echo "===== Permission Update Complete ====="
echo "Now redeploy the functions with: firebase deploy --only functions:sendAssignmentEmail"
echo 