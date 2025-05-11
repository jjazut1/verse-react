# Firebase Functions Gen1

This directory contains Firebase Functions (1st generation) for the Verse Learning platform. These functions use the Firebase Functions SDK v1 and are primarily HTTP/callable functions that support user authentication and security rules.

## Functions

### `getAssignmentByIdForAuth`

A callable function that provides secure access to assignments by verifying user authentication and ownership.

**Purpose**:
- Securely fetches assignment details for authenticated users
- Validates that the user requesting access is the assignment's intended recipient
- Returns the assignment token required for access

**Usage**:
```javascript
// Client-side code
const getAssignment = firebase.functions().httpsCallable('getAssignmentByIdForAuth');
getAssignment({ assignmentId: 'your-assignment-id' })
  .then((result) => {
    // result.data contains { success: true, assignmentToken: 'token' }
    const { assignmentToken } = result.data;
    // Use the token to access the assignment
  })
  .catch((error) => {
    // Handle errors
  });
```

**Security**:
- Requires Firebase Authentication
- Checks that the authenticated user's email matches the assignment's target email
- Prevents unauthorized access to assignments

### `testAuthPermissions`

A utility HTTP function to verify Firebase Authentication permissions.

**Purpose**:
- Tests Firebase Admin SDK authentication capabilities
- Verifies Firestore access permissions
- Confirms ability to generate custom tokens

**Usage**:
Direct HTTP access to the function endpoint.

## Development

### Prerequisites

- Node.js (version specified in package.json)
- Firebase CLI installed globally
- Firebase project configured

### Installation

```bash
cd functions-gen1
npm install
```

### Local Testing

```bash
npm run serve
```

### Deployment

```bash
# Deploy only Gen1 functions
firebase deploy --only functions:gen1

# Or from the parent directory
cd ..
firebase deploy --only functions:gen1
```

## Architecture

- Functions use the Firebase Functions v1 SDK
- Implements Firebase Admin SDK for Firestore operations
- Uses callable functions pattern for authenticated client access
- Employs comprehensive error handling

## Dependencies

- firebase-functions: v3.x (1st generation)
- firebase-admin: For Firestore and Auth operations 