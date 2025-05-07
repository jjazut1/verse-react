# Manual Fix: Update emailSent Field in Firebase Console

Since we're still working on getting the email functionality properly configured, let's manually update the `emailSent` field to prevent repeated email sending attempts.

## Update Using Firebase Console

1. Go to the Firebase Console: https://console.firebase.google.com/
2. Select your project "verse-11f2d"
3. In the left sidebar, click on "Firestore Database"
4. Navigate to the "assignments" collection
5. Find the document with ID "xOvbHXZL3ByV888prIRB"
6. Click on it to open the document editor
7. Find the "emailSent" field, which is currently set to "false"
8. Click the edit icon (pencil) next to it
9. Change the value to "true"
10. Click "Update" to save the changes

## Update Using Web App

If you're viewing the document in your web app already, you can click the edit icon (pencil) that appears next to the "emailSent" field in the screenshot and change it to "true".

## Next Steps

After manually marking this assignment as having its email sent, you should:

1. Continue setting up the proper Gmail App Password by following the instructions in `APP_PASSWORD_INSTRUCTIONS.md`
2. Run the `./update-email-credentials.sh` script to update your email credentials
3. Deploy the functions again with `./deploy-email-functions.sh`
4. Create a new test assignment to verify if emails are now working

## Why This Manual Fix Is Needed

The Firebase Cloud Function that sends emails is being triggered when new assignments are created, but it's failing due to invalid Gmail credentials. 

By manually marking this assignment as `emailSent: true`, you're telling the system that this assignment has already been handled, so it won't keep trying to send an email for it.

This is a temporary workaround until you get the proper App Password set up for your Gmail account. 