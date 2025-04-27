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