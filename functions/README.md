# Verse Learning Firebase Functions

This directory contains Firebase Cloud Functions for the Verse Learning application.

## Functions Overview

### 1. `sendAssignmentEmail`

This function automatically sends an email notification to students when they are assigned a new game.

- **Trigger**: When a new document is created in the `assignments` collection
- **Functionality**: 
  - Fetches the teacher's information from Firestore
  - Builds an HTML email with assignment details
  - Sends the email via the configured email service
  - Updates the assignment document with `emailSent: true` and `emailSentAt` timestamp

### 2. `sendReminderEmails`

This function sends reminder emails to students for assignments that are due within the next 24 hours.

- **Trigger**: Runs on a schedule every 24 hours
- **Functionality**:
  - Queries Firestore for assignments due in the next 24 hours
  - Sends reminder emails to students with details about their pending assignments

## Deployment

### Prerequisites

1. Firebase CLI installed (`npm install -g firebase-tools`)
2. Firebase project configured (`firebase login` and `firebase use --add`)

### Environment Variables

Set the required environment variables:

```bash
firebase functions:secrets:set EMAIL_USER="your-email@gmail.com"
firebase functions:secrets:set EMAIL_PASSWORD="your-app-password"
firebase functions:config:set app.url="https://your-app-url.com"
```

For Gmail, use an app password instead of your regular password.

### Deploy Functions

```bash
npm run deploy
```

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the functions:
   ```bash
   npm run build
   ```

3. Run the Firebase emulator:
   ```bash
   npm run serve
   ```

## Troubleshooting

- If emails are not being sent, check the Firebase Functions logs:
  ```bash
  firebase functions:log
  ```

- Ensure your email provider allows sending emails from your application
- For Gmail, use App Passwords instead of regular passwords

# Firebase Cloud Functions for Email Notifications

This project uses Firebase Cloud Functions to send email notifications when assignments are created and to send reminders before deadlines.

## Setting up Gmail for Cloud Functions

To use Gmail with Firebase Functions, you need to create an App Password:

1. Go to your Google Account at https://myaccount.google.com/
2. Navigate to Security > 2-Step Verification (enable it if not already enabled)
3. At the bottom of the 2-Step Verification page, click on "App passwords"
4. Click "Select app" and choose "Other (Custom name)"
5. Enter "Verse Learning" or any other recognizable name
6. Click "Create"
7. Google will display a 16-character app password - copy this password

## Setting Environment Variables

Set the environment variables for Firebase Functions:

```
echo "your-gmail@gmail.com" | firebase functions:secrets:set EMAIL_USER
echo "your-16-character-app-password" | firebase functions:secrets:set EMAIL_PASSWORD
```

Replace:
- `your-gmail@gmail.com` with the Gmail address you want to use to send emails
- `your-16-character-app-password` with the app password you generated

## Deploying the Functions

Once you've set up the email credentials, deploy the functions:

```
cd functions
./deploy-email-functions.sh
```

## Testing the Email Functionality

The easiest way to test the email functionality is to create a new assignment in the app. When an assignment is created, the `sendAssignmentEmail` function will be triggered, and an email will be sent to the student.

## Functions Included

1. `sendAssignmentEmail` - Triggered when a new assignment is created in Firestore
2. `sendReminderEmails` - Scheduled to run daily to send reminders for approaching deadlines
3. `testEmail` - HTTP endpoint to test email configuration
4. `testAssignmentEmail` - HTTP endpoint to test assignment emails

## Troubleshooting

If emails are not being sent, check the Firebase Functions logs:

```
firebase functions:log
```

Common issues:
- Invalid email credentials (wrong password or not an App Password)
- Gmail security restrictions (use App Passwords instead of regular password)
- Rate limits on Gmail sending 