# Deploying Firebase Cloud Functions

This guide provides instructions for deploying the email notification functions for assignments.

## Prerequisites

1. Make sure you have Firebase CLI installed:
   ```
   npm install -g firebase-tools
   ```

2. Log in to Firebase:
   ```
   firebase login
   ```

## Set up email credentials

These functions use Gmail to send emails. You need to set up credentials for your email account:

1. Create a Google App Password (if using Gmail):
   - Go to your Google Account > Security
   - Enable 2-Step Verification if not already enabled
   - Go to App passwords and create a new app password
   - Select "Other" as the app and give it a name like "Verse Learning"
   - Copy the generated password

2. Set the email credentials as Firebase environment variables:
   ```
   firebase functions:secrets:set EMAIL_USER
   ```
   (Enter your Gmail address when prompted)

   ```
   firebase functions:secrets:set EMAIL_PASSWORD
   ```
   (Enter the app password you generated)

## Deploy the functions

Deploy all functions:
```
cd functions
npm run build
firebase deploy --only functions
```

Or deploy specific functions:
```
firebase deploy --only functions:sendAssignmentEmail,functions:sendReminderEmails
```

## Testing the email functions

### Test sending an assignment email manually

You can use the `testAssignmentEmail` HTTP function to test sending an email for a specific assignment:

```
curl https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/testAssignmentEmail?assignmentId=YOUR_ASSIGNMENT_ID
```

Replace:
- `YOUR_REGION` with your Firebase Functions region (e.g., `us-central1`)
- `YOUR_PROJECT_ID` with your Firebase project ID
- `YOUR_ASSIGNMENT_ID` with the ID of an existing assignment

### Test email configuration

Use the `testEmail` function to check if the email configuration is working:

```
curl https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/testEmail?email=YOUR_EMAIL
```

## Troubleshooting

If you encounter issues with email sending:

1. Check the Firebase Functions logs:
   ```
   firebase functions:log
   ```

2. Verify your email credentials are set correctly:
   ```
   firebase functions:secrets:get EMAIL_USER
   firebase functions:secrets:get EMAIL_PASSWORD
   ```

3. Make sure your Gmail account allows less secure apps or that you're using an App Password.

4. If using Gmail, check if you're hitting sending limits (Google may limit the number of emails sent per day).

## Function Descriptions

- `sendAssignmentEmail`: Triggered whenever a new assignment is created in Firestore. It automatically sends an email to the student with assignment details and a link.

- `sendReminderEmails`: Scheduled to run at 8:00 AM ET every day, this function checks for assignments due in the next 24 hours and sends reminder emails to students.

- `testEmail`: HTTP function to test the email configuration.

- `testAssignmentEmail`: HTTP function to manually trigger sending an assignment email. 