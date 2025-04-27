# Email Functionality for Assignments - Setup Guide

This guide will walk you through setting up email sending functionality for assignments in the Verse Learning application using Firebase Cloud Functions.

## Prerequisites

1. Firebase project with Firestore and Authentication enabled
2. Node.js and npm installed
3. Firebase CLI installed (`npm install -g firebase-tools`)

## Step 1: Deploy the Firebase Cloud Functions

The functions have been created in the `functions/src/index.ts` file. To deploy them:

```bash
# Navigate to the functions directory
cd functions

# Install dependencies
npm install

# Build the functions
npm run build

# Deploy to Firebase
firebase deploy --only functions
```

## Step 2: Set Environment Variables in Firebase

The email functionality requires environment variables for the email service configuration. Set these using the Firebase CLI:

```bash
# Set environment variables for email service
firebase functions:config:set email.user="your-email@gmail.com" email.password="your-app-password"

# Set the app URL for links in emails
firebase functions:config:set app.url="https://your-app-domain.com"
```

### Notes for Gmail:

If using Gmail, you'll need to:
1. Enable 2-Step Verification in your Google account
2. Generate an "App Password" specifically for this application
3. Use that App Password in the configuration above, not your actual Google account password

## Step 3: Testing

After deployment, test the email functionality by:

1. Log in to the application as a teacher
2. Create a new assignment for a student
3. Verify that the email is sent to the student

## Troubleshooting

If emails are not being sent:

1. Check Firebase Functions logs in the Firebase Console
2. Verify that the environment variables are set correctly
3. If using Gmail, make sure the App Password is correct and 2-Step Verification is enabled
4. Check if there are any errors in the Firebase Functions logs

## Production Considerations

For production use, consider:

1. Using a dedicated email service like SendGrid or Mailgun instead of Gmail
2. Setting up proper SPF and DKIM records for your domain to improve email deliverability
3. Implementing email templates with proper branding
4. Adding rate limiting to prevent abuse

## Advanced Features

The current implementation includes:

1. Automatic email notifications when assignments are created
2. Daily reminder emails for approaching deadlines

Additional features you might want to implement:

1. Email notifications when a student completes an assignment
2. Custom email templates for different types of notifications
3. Ability for teachers to customize email messages
4. Email preferences for students and teachers 