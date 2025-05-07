# Gmail App Password Setup for Firebase Functions

Follow these step-by-step instructions to properly create and set up a Gmail App Password for your Firebase Functions.

## Create a New Gmail App Password

1. Go to your Google Account: https://myaccount.google.com/
2. In the left navigation panel, click on **Security**
3. Under "Signing in to Google," verify that **2-Step Verification** is enabled
   - If not, click on it and follow the steps to enable it
4. After enabling 2-Step Verification, scroll down and click on **App passwords**
   - Note: This option only appears if 2-Step Verification is enabled
5. On the App passwords page:
   - For "Select app", choose **Other (Custom name)**
   - Enter a custom name like "Verse Firebase Functions"
   - Click **Create**
6. Google will generate a 16-character App Password (in the format: xxxx xxxx xxxx xxxx)
7. **IMPORTANT**: Copy this password immediately - it will only be shown once!

## Set the Firebase Secret

1. Remove spaces from the generated App Password (make it a single string of 16 characters)
2. Set the password as a Firebase secret:
   ```bash
   echo "your16characterpassword" | firebase functions:secrets:set EMAIL_PASSWORD
   ```
   - Replace "your16characterpassword" with the actual password you copied (without spaces)

## Verify Email Configuration

Make sure your email configuration is correct:

1. The EMAIL_USER should be set to your full Gmail address (the one that created the App Password)
2. If you need to update the email user:
   ```bash
   echo "your-email@gmail.com" | firebase functions:secrets:set EMAIL_USER
   ```

## Common Issues

If you're still getting authentication errors:

1. **Wrong email format**: Make sure the EMAIL_USER is your complete Gmail address
2. **Spaces in password**: Ensure you removed all spaces from the App Password
3. **Copy-paste issues**: Sometimes copying can add invisible characters. Try typing the password manually
4. **App Password expired**: Google might invalidate App Passwords occasionally. Try creating a new one
5. **Less secure app access**: For some Google Workspace accounts, an admin might need to allow "less secure app access"

## After Setting the Password

After correctly setting the App Password:

1. Redeploy your functions:
   ```bash
   ./deploy-email-functions.sh
   ```
2. Create a new assignment to test if emails are now being sent
3. Check the logs for any errors:
   ```bash
   firebase functions:log
   ``` 