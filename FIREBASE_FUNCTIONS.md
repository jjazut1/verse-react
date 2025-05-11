# Firebase Functions Architecture

This document provides an overview of the Firebase Functions architecture for the Verse Learning platform.

## Overview

The Firebase Functions are split into two separate codebases:

1. **Generation 1 (HTTP/Callable Functions)** - Located in `functions-gen1/`
2. **Generation 2 (Firestore Trigger Functions)** - Located in `functions-gen2/`

This separation follows Firebase's recommendation for working with both generations of functions, ensuring proper deployment and configuration.

## Functions Gen1 (HTTP/Callable Functions)

These functions use the Firebase Functions v1 SDK and are primarily callable functions that support user authentication and security rules.

### Key Functions:

- **getAssignmentByIdForAuth**: Provides secure access to assignments by verifying user authentication and ownership.
- **testAuthPermissions**: Utility function to verify Firebase Authentication permissions.

### Architecture:

- Located in `functions-gen1/src/index.ts`
- Uses Firebase Admin SDK for Firestore operations
- Implements request validation and error handling
- Enforces authentication through Firebase Auth

## Functions Gen2 (Firestore Trigger Functions)

These functions use the Firebase Functions v2 SDK and are triggered by Firestore events, primarily handling email communication.

### Key Functions:

- **sendAssignmentEmail**: Sends assignment notifications to students using standard links.
- **sendEmailLinkWithAssignment**: Sends assignments that require email link authentication.

### Architecture:

- Located in `functions-gen2/src/index.ts`
- Triggered on document creation in the `assignments` collection
- Uses SendGrid for email delivery
- Implements comprehensive validation and error handling

## SendGrid Integration

The SendGrid email integration is implemented using a modular architecture with the following components:

### 1. SendGrid Helper (`sendgridHelper.ts`)

A dedicated module that encapsulates all SendGrid-related functionality:

- **setupSendGrid**: Validates and configures the SendGrid API key
- **sendEmail**: Handles email sending with comprehensive error handling
- **cleanEmailAddress**: Sanitizes email addresses to prevent formatting issues

### 2. Email Validator (`emailValidator.ts`)

Uses Zod schema validation to ensure email data meets required formats:

- **validateEmailData**: Validates email data against the schema
- **logEmailPayload**: Logs email data with sensitive information masked
- **emailSchema**: Defines the required structure for email data

### 3. Security and Configuration

- SendGrid API key and sender email are stored as Firebase secrets
- API key validation ensures proper Base64 URL-safe formatting
- Multiple levels of email validation prevent formatting issues

## Deployment Configuration

The Firebase configuration in `firebase.json` defines the separate codebases:

```json
"functions": [
  {
    "source": "functions-gen1",
    "codebase": "gen1",
    "ignore": ["node_modules", ".git", "firebase-debug.log", "firebase-debug.*.log"],
    "predeploy": ["npm --prefix \"$RESOURCE_DIR\" run build"]
  },
  {
    "source": "functions-gen2",
    "codebase": "gen2",
    "ignore": ["node_modules", ".git", "firebase-debug.log", "firebase-debug.*.log"],
    "predeploy": ["npm --prefix \"$RESOURCE_DIR\" run build"]
  }
]
```

## Testing and Debugging Tools

Several tools are provided for testing and debugging:

- **validateApiKey.ts**: Validates SendGrid API key format
- **testSendEmail.ts**: Tests email sending functionality
- **test-sendgrid.sh**: Shell script for easy testing
- **validate-key.sh**: Shell script for API key validation

## Deployment Commands

To deploy the functions separately:

```bash
# Deploy Gen1 functions
firebase deploy --only functions:gen1

# Deploy Gen2 functions
firebase deploy --only functions:gen2

# Deploy all functions
firebase deploy --only functions
```

## Best Practices Implemented

1. **Separation of Concerns**: Each module has a specific responsibility
2. **Error Handling**: Comprehensive error capturing and reporting
3. **Validation**: Multi-level validation for all inputs
4. **Security**: Proper secret management and data sanitization
5. **Logging**: Privacy-conscious logging with sensitive data masking
6. **Reusability**: Modular design for code reuse
7. **Testability**: Dedicated testing tools for each component 