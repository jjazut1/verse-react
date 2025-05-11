# Firebase Functions Gen2 with SendGrid Integration

This directory contains Firebase Functions (2nd generation) for the Verse Learning platform. These functions use the Firebase Functions SDK v2 and are primarily Firestore-triggered functions that handle email communications via SendGrid.

## Functions

### `sendAssignmentEmail`

A Firestore-triggered function that sends assignment notifications to students using standard links.

**Trigger**: Document creation in the `assignments` collection
**Purpose**:
- Sends email notifications for new assignments
- Provides students with a direct link to access their assignments
- Updates the assignment document with email status

### `sendEmailLinkWithAssignment`

A Firestore-triggered function that sends assignments that require email link authentication.

**Trigger**: Document creation in the `assignments` collection
**Purpose**:
- Sends email with secure authentication links
- Enables passwordless sign-in for assignment access
- Supports Firebase Authentication email link flow
- Updates the assignment document with email status

## SendGrid Integration Architecture

The SendGrid email integration is implemented using a modular architecture with the following components:

### 1. SendGrid Helper (`sendgridHelper.ts`)

A dedicated module that encapsulates all SendGrid-related functionality:

- **setupSendGrid**: Validates the API key format and sets up the SendGrid client
- **sendEmail**: Handles email sending with comprehensive error handling and logging
- **cleanEmailAddress**: Sanitizes email addresses to prevent formatting issues

### 2. Email Validator (`emailValidator.ts`)

Uses Zod schema validation to ensure email data meets required formats:

- **validateEmailData**: Validates email data against the schema
- **logEmailPayload**: Logs email data with sensitive information masked for privacy
- **emailSchema**: Defines the required structure and format for email data

### 3. Testing and Validation Tools

- **validateApiKey.ts**: Tool to validate SendGrid API key format
- **testSendEmail.ts**: Tests email sending functionality
- **test-sendgrid.sh**: Shell script for easy testing
- **validate-key.sh**: Shell script for API key validation

## Security and Configuration

- SendGrid API key and sender email are stored as Firebase secrets
- Multiple levels of validation ensure data integrity
- Email addresses are sanitized to prevent formatting issues
- Logging masks sensitive information for privacy
- Proper error handling with detailed logging

## Development

### Prerequisites

- Node.js v20 (as specified in package.json)
- Firebase CLI installed globally
- Firebase project configured
- SendGrid account with API key

### Installation

```bash
cd functions-gen2
npm install
```

### Setting Up SendGrid

1. Create a SendGrid account and verify your sender email/domain
2. Generate an API key with appropriate permissions
3. Set up Firebase secrets:

```bash
firebase functions:secrets:set SENDGRID_API_KEY
firebase functions:secrets:set SENDER_EMAIL
```

### Testing SendGrid Integration

The repository includes tools for testing the SendGrid integration:

```bash
# Validate SendGrid API key format
./validate-key.sh "YOUR_SENDGRID_API_KEY"

# Test sending emails
./test-sendgrid.sh "YOUR_SENDGRID_API_KEY" "your_verified_email@example.com"
```

### Local Testing

```bash
npm run serve
```

### Deployment

```bash
# Deploy only Gen2 functions
firebase deploy --only functions:gen2

# Or from the parent directory
cd ..
firebase deploy --only functions:gen2
```

## Dependencies

- firebase-functions: v6.x (2nd generation)
- firebase-admin: For Firestore operations
- @sendgrid/mail: For email sending
- zod: For email validation 