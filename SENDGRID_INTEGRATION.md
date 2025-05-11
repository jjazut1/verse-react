# SendGrid Integration for Verse Learning

This document provides a detailed overview of the SendGrid email integration implemented for the Verse Learning platform.

## Architecture Overview

The SendGrid integration follows a modular architecture with separation of concerns:

```
functions-gen2/
├── src/
│   ├── index.ts                # Main function definitions
│   ├── sendgridHelper.ts       # SendGrid-specific functionality
│   ├── emailValidator.ts       # Email validation with Zod
│   ├── validateApiKey.ts       # API key validation tool
│   └── testSendEmail.ts        # Email testing tool
├── test-sendgrid.sh            # Shell script for testing
└── validate-key.sh             # Shell script for key validation
```

## Core Components

### 1. SendGrid Helper (`sendgridHelper.ts`)

Provides encapsulated SendGrid functionality:

```typescript
// Key functions
export function setupSendGrid(apiKey: string): boolean
export async function sendEmail(message: sgMail.MailDataRequired): Promise<boolean>
function cleanEmailAddress(email: string): string
```

**Features**:
- API key validation with URL-safe Base64 checking
- Email address sanitization to remove problematic characters
- Comprehensive error handling and logging
- Multi-level validation of email data

### 2. Email Validator (`emailValidator.ts`)

Implements Zod schema validation for email data:

```typescript
// Key components
export const emailSchema = z.object({ ... })
export function validateEmailData(data: any): { isValid: boolean; data?: EmailData; errors?: string[] }
export function logEmailPayload(data: any): void
```

**Features**:
- Strict validation of email structure and format
- Detailed error reporting for validation failures
- Privacy-conscious logging with email masking
- Preprocessing of email data to handle edge cases

### 3. Main Functions (`index.ts`)

Two Firestore-triggered functions that use SendGrid:

```typescript
export const sendAssignmentEmail = onDocumentCreated(...)
export const sendEmailLinkWithAssignment = onDocumentCreated(...)
```

## Security and Configuration

### Secret Management

SendGrid credentials are stored as Firebase secrets:

```typescript
// Defining secrets
const SENDGRID_API_KEY = defineSecret("SENDGRID_API_KEY");
const SENDER_EMAIL = defineSecret("SENDER_EMAIL");

// Using in function definition
{
  document: "assignments/{assignmentId}",
  secrets: [SENDGRID_API_KEY, SENDER_EMAIL],
}
```

### Email Sanitization

Multiple levels of sanitization prevent formatting issues:

1. **At Creation**: 
   ```typescript
   from: {
     email: SENDER_EMAIL.value().trim(),
     name: "Verse Learning"
   }
   ```

2. **Pre-validation**:
   ```typescript
   function cleanEmailAddress(email: string): string {
     return email.replace(/[\s\n\r]/g, '');
   }
   ```

3. **Schema Validation**:
   ```typescript
   z.string().trim().email('Invalid sender email')
   ```

### Secure Logging

Logs mask sensitive information:

```typescript
// Example masked email log
Email payload for debugging: { 
  "to": "ja***h@sunriseoasisacademy.com", 
  "from": { 
    "email": "ja***s@learnwithverse.com",
    "name": "Verse Learning" 
  },
  ...
}
```

## Testing and Validation Tools

### API Key Validation

The `validateApiKey.ts` tool analyzes API key format:

```bash
./validate-key.sh "YOUR_SENDGRID_API_KEY"
```

**Output Example**:
```
SendGrid API Key Validator
------------------------
Input key length: 69 characters
Cleaned key length: 69 characters
✓ Key starts with "SG." (correct)
Number of parts: 3 (should be 3)
✓ Key has 3 parts separated by dots (correct)

Part details:
1. "SG" (should be "SG")
2. Length: 22 characters
3. Length: 43 characters
✓ Part 2 contains valid Base64 URL-safe characters
✓ Part 3 contains valid Base64 URL-safe characters

✅ VALID: The API key format appears to be valid
```

### Email Sending Test

The `testSendEmail.ts` tool verifies email sending:

```bash
./test-sendgrid.sh "YOUR_SENDGRID_API_KEY" "your_verified_email@example.com"
```

**Features**:
- Tests both simple and detailed email formats
- Provides detailed error reporting
- Shows exact SendGrid API responses
- Verifies API key and sender email validity

## Error Handling

Comprehensive error handling at multiple levels:

1. **API Key Validation Errors**:
   - Invalid format (not starting with "SG.")
   - Missing parts (not having 3 parts separated by dots)
   - Invalid characters in Base64 sections

2. **Email Validation Errors**:
   - Missing required fields
   - Invalid email format
   - Subject or content requirements not met

3. **SendGrid API Errors**:
   - Unauthorized errors (403)
   - Bad request errors (400)
   - Rate limiting or other API errors

## SendGrid Configuration Requirements

1. **Sender Verification**:
   - Verify sender email address in SendGrid
   - Or authenticate the entire domain

2. **API Key Permissions**:
   - API key must have "Mail Send" permission
   - Ensure no IP restrictions that would block Firebase Functions

3. **Content Requirements**:
   - HTML content follows email best practices
   - Subject lines are appropriate length
   - Properly formatted recipient addresses

## Best Practices Implemented

1. **Separation of Concerns**: Each module has a specific responsibility
2. **Defense in Depth**: Multiple validation layers catch different issues
3. **Secure Credential Handling**: No hardcoded credentials
4. **Privacy-Conscious Logging**: Sensitive data is masked in logs
5. **Comprehensive Error Handling**: Detailed error reporting at all levels
6. **Testability**: Independent testing tools for each component
7. **Modularity**: Components can be maintained and updated independently 