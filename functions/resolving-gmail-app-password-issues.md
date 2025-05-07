# Resolving Gmail App Password Issues

We're still encountering authentication errors with Gmail despite setting up the App Password. Let's go through some more detailed troubleshooting steps.

## Common Issues with Gmail App Passwords

1. **Gmail restrictions**: Some Google Workspace accounts have restrictions that prevent using App Passwords
2. **2-Step Verification status**: 2-Step Verification must be fully enabled (not just set up)
3. **Incorrect password format**: App Passwords should be exactly 16 characters with no spaces
4. **Authentication delay**: Sometimes there's a delay before new App Passwords become active
5. **Account security settings**: Google may block sign-in attempts from unfamiliar locations/apps

## Complete Solution Approach

### 1. Create a Fresh App Password

1. Go to https://myaccount.google.com/security
2. Scroll down to "Signing in to Google" and click on "App passwords"
3. First, delete any existing App Passwords for Firebase/Verse
4. Create a completely new App Password:
   - Select "Other (Custom name)" from the dropdown
   - Name it "Verse Firebase Functions"
   - Click "Create"
5. Copy the entire 16-character password (without spaces)

### 2. Try a Different Google Account

If you have access to another Gmail account with 2-Step Verification enabled:
1. Create an App Password on that account
2. Update the EMAIL_USER and EMAIL_PASSWORD secrets with this new account's details

### 3. Check for Less Secure App Access

Some accounts may require enabling "Less secure app access":
1. Go to https://myaccount.google.com/security
2. Scroll to "Less secure app access" (if present)
3. Enable it temporarily for testing

### 4. Use a Service-Specific App Password

Instead of selecting "Other (Custom name)":
1. Select "Mail" as the app
2. Select "Other" as the device

### 5. Verify the nodemailer Configuration

The current nodemailer configuration is:

```javascript
const getTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser.value(),
      pass: emailPassword.value(),
    },
  });
};
```

Try modifying this to explicitly use SMTP:

```javascript
const getTransporter = () => {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: emailUser.value(),
      pass: emailPassword.value(),
    },
  });
};
```

### 6. Consider Alternative Email Solutions

If Gmail continues to be problematic, consider:

1. **SendGrid**: Free tier available, designed for transactional emails
   - Create a SendGrid account
   - Get an API key
   - Use the SendGrid Node.js library instead of nodemailer

2. **Mailgun**: Another reliable email service
   - Offers a free tier
   - Has a straightforward Node.js integration

3. **AWS SES**: Amazon's Simple Email Service
   - Very reliable and scalable
   - Low cost

## Immediate Next Steps

1. **Manually mark the current assignments as sent**:
   - In the Firebase Console, edit both assignments to set `emailSent: true`

2. **Create and use a fresh App Password**:
   - Follow the steps above to create a completely new App Password
   - Update the environment variable with the new password

3. **Modify the email transport configuration**:
   - Edit `functions/src/index.ts` to use the explicit SMTP configuration
   - Redeploy the functions

4. **Create a test assignment**:
   - After making these changes, create another test assignment
   - Check the logs immediately after creation 