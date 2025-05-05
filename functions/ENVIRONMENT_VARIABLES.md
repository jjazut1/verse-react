# Environment Variables for Firebase Functions

This file documents the environment variables needed for Firebase Functions to work properly.

## Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `sendgrid.key` | SendGrid API key for sending emails | `SG.XXXXXXXXXXXXXXXXXXXX.XXXXXXXXXXXXXXX` |
| `email.sender` | The email address used as sender | `Verse Learning <james@learnwithverse.com>` |
| `app.url` | The base URL of the application | `https://r2process.com` |

## Setting Environment Variables

These variables are set using Firebase Functions Configuration:

```bash
firebase functions:config:set sendgrid.key="YOUR_SENDGRID_API_KEY"
firebase functions:config:set email.sender="Verse Learning <james@learnwithverse.com>"
firebase functions:config:set app.url="https://r2process.com"
```

## Current Configuration

The current configuration is stored in `firebase-config-backup.json` and can be restored using the `restore-config.js` script.

## Accessing Environment Variables in Code

These variables are accessed in the code as follows:

```typescript
const SENDGRID_API_KEY = functions.config().sendgrid?.key || '';
const SENDER_EMAIL = functions.config().email?.sender || 'Verse Learning <james@learnwithverse.com>';
const APP_URL = functions.config().app?.url || 'https://r2process.com';
``` 