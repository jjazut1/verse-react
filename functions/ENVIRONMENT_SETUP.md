# Firebase Functions Environment Setup

This document provides instructions for backing up and restoring the Firebase Functions environment, which includes configuration values (like API keys) that are not stored in the Git repository.

## Prerequisites

- Node.js installed (version 20)
- Firebase CLI installed (`npm install -g firebase-tools`)
- Logged in to Firebase (`firebase login`)

## Current Configuration

As of May 2025, the following configuration is required for the email notification functions:

1. **SendGrid API Key**: For sending emails
2. **Sender Email**: The email address used as the sender
3. **App URL**: The base URL of the application

## Backing up the Configuration

To back up your current Firebase Functions configuration, run:

```bash
node backup-config.js
```

This will create a file called `firebase-config-backup.json` containing all your configuration values.

⚠️ **SECURITY WARNING**: This file contains sensitive information like API keys. Be careful about committing it to a public repository. Consider encrypting it or adding it to `.gitignore`.

## Restoring the Configuration

To restore the Firebase Functions configuration from a backup, run:

```bash
node restore-config.js
```

Then deploy the functions to apply the configuration:

```bash
firebase deploy --only functions
```

## Manual Configuration (if needed)

If you need to set up the configuration manually, use these commands:

```bash
# Set SendGrid API key
firebase functions:config:set sendgrid.key="YOUR_SENDGRID_API_KEY"

# Set email sender
firebase functions:config:set email.sender="Verse Learning <your-email@example.com>"

# Set app URL
firebase functions:config:set app.url="https://your-app-url.com"

# Deploy functions to apply configuration
firebase deploy --only functions
```

## Testing Email Functionality

To test if your SendGrid API key is working correctly, you can run this script:

```bash
node src/test-sendgrid.js
```

## Troubleshooting

### Common Issues

1. **SendGrid Authentication Errors (401)**
   - Generate a new API key in the SendGrid dashboard
   - Ensure the key has "Mail Send" permissions
   - Update the Firebase configuration with the new key

2. **Email Not Sending**
   - Check the Firebase Functions logs
   - Verify the sender domain is authenticated in SendGrid
   - Ensure the sender email is verified

3. **Firebase Functions Not Deploying**
   - Check for correct Node.js version
   - Ensure Firebase CLI is up to date
   - Check for TypeScript compilation errors

## Complete Reset Process

If you need to completely reset the environment to a known working state:

1. Reset the Git repository:
   ```bash
   git reset --hard a0f741f90ffc4966a976650d16b1ed8fa2f35cce
   ```

2. Restore the Firebase Functions configuration:
   ```bash
   cd functions
   node restore-config.js
   ```

3. Deploy the functions:
   ```bash
   firebase deploy --only functions
   ``` 