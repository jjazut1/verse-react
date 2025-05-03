#!/bin/bash

echo "===== Marking Assignments as Email Sent ====="
echo "This script will update all assignments to set emailSent=true"
echo "to prevent further email sending attempts."
echo

# Confirm action
read -p "This will mark ALL assignments as having emails sent. Continue? (y/n): " confirm
if [ "$confirm" != "y" ]; then
  echo "Operation cancelled."
  exit 0
fi

# Run the script in the Firestore emulator
echo "Running in Firestore emulator..."
firebase emulators:exec --only firestore 'node mark-assignments-sent.js'

echo
echo "===== Operation Complete ====="
echo "Note: If you'd prefer to manually update assignments in the Firebase Console:"
echo "1. Go to https://console.firebase.google.com/project/verse-11f2d/firestore/data/assignments"
echo "2. Click on each assignment document"
echo "3. Add a new field 'emailSent' with value 'true' for each assignment"
echo 