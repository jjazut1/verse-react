# Deploying Firebase Functions for Email Functionality

This guide walks through the steps to deploy the Firebase Cloud Functions for the email notification system.

## Prerequisites

1. Firebase CLI installed globally:
   ```bash
   npm install -g firebase-tools
   ```

2. Firebase project configured:
   ```bash
   firebase login
   firebase use --add
   ```

## Setting Up Environment Variables

For the email functions to work properly, you need to set up the following environment variables:

1. For Firebase Parameters (new approach):
   ```bash
   # Set email credentials (replace with actual values)
   firebase functions:secrets:set EMAIL_USER="your-email@gmail.com"
   firebase functions:secrets:set EMAIL_PASSWORD="your-app-password"
   
   # Set the application URL
   firebase functions:params:set app.url "https://yourapp.vercel.app" --project your-project-id
   ```

2. For Gmail users:
   - You'll need to use an "App Password" instead of your regular password
   - Go to your Google Account → Security → 2-Step Verification → App Passwords
   - Create a new app password for "Firebase Functions"

## Deployment Process

1. Navigate to the functions directory:
   ```bash
   cd functions
   ```

2. Build the functions:
   ```bash
   npm run build
   ```

3. Deploy the functions:
   ```bash
   npm run deploy
   ```

4. Verify deployment:
   ```bash
   firebase functions:list
   ```

## Testing the Deployed Functions

1. Create a new assignment through your application UI
2. Check the student's email to verify they received the notification
3. Check Firestore to confirm that the `emailSent` field was updated

## Monitoring and Troubleshooting

1. View function logs:
   ```bash
   firebase functions:log
   ```

2. Common issues:
   - Email credentials incorrect → Check your environment variables
   - Gmail security settings → Ensure "less secure apps" is enabled or use App Passwords
   - Function timeout → Check for long-running operations in your code

## Updating Deployed Functions

After making changes to your functions:

1. Build the functions:
   ```bash
   npm run build
   ```

2. Deploy only the updated functions:
   ```bash
   firebase deploy --only functions:sendAssignmentEmail,functions:sendReminderEmails
   ```

## Production Recommendations

1. Consider using a dedicated email service like SendGrid, Mailgun, or AWS SES for production
2. Implement retry logic for failed emails
3. Add monitoring and alerting for function failures
4. Implement rate limiting to prevent abuse
5. Consider using a queue for high-volume email sending 