#!/bin/bash

# Script to create beta test assignments for jjazut1@gmail.com

echo "======================================================"
echo "  CREATING JJAZUT1 BETA TEST ASSIGNMENTS"
echo "======================================================"
echo ""

echo "🔄 Running assignment creation script..."
node src/create-jjazut-assignments.js

echo ""
echo "======================================================"
echo "  ASSIGNMENTS CREATED"
echo "======================================================"
echo ""
echo "Check Firebase Console to confirm assignments were created:"
echo "- Firestore: https://console.firebase.google.com/project/verse-11f2d/firestore/data/assignments"
echo ""
echo "The Firebase function should automatically send emails to:"
echo "- jamesalspaugh@gmail.com"
echo "- student1.jjazut@example.com"
echo "- student2.jjazut@example.com"
echo ""
echo "======================================================" 