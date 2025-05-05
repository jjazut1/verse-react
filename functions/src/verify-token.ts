import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

interface AssignmentToken {
  studentEmail: string;
  assignmentId: string;
  expiresAt: FirebaseFirestore.Timestamp;
  used: boolean;
}

export const testVerifyTokenAndLogin = functions.https.onCall(async (data, context) => {
  const { token } = data;
  if (!token) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Token is required'
    );
  }

  // Look up the token in the assignmentTokens collection
  const tokenDoc = await admin.firestore()
    .collection('assignmentTokens')
    .doc(token)
    .get();

  if (!tokenDoc.exists) {
    throw new functions.https.HttpsError(
      'not-found',
      'Token not found or invalid'
    );
  }

  const tokenData = tokenDoc.data() as AssignmentToken;

  // Check if token is used or expired
  const now = admin.firestore.Timestamp.now();
  if (tokenData.expiresAt.toMillis() < now.toMillis()) {
    throw new functions.https.HttpsError(
      'deadline-exceeded',
      'Token has expired'
    );
  }

  if (tokenData.used) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Token has already been used'
    );
  }

  const { studentEmail, assignmentId } = tokenData;

  // Find or create the user account
  let userRecord;
  try {
    // Try to get the existing user
    userRecord = await admin.auth().getUserByEmail(studentEmail);
  } catch (error) {
    // User doesn't exist yet, create a new one
    userRecord = await admin.auth().createUser({
      email: studentEmail,
      emailVerified: true, // Consider these accounts pre-verified since we sent the token to their email
    });

    // Optionally create a user record in Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      email: studentEmail.toLowerCase(),
      role: 'student',
      status: 'active',
      createdAt: admin.firestore.Timestamp.now(),
    });
  }

  // Create custom token with assignment claim
  const customToken = await admin.auth().createCustomToken(userRecord.uid, {
    assignmentId,
  });

  // Mark token as used
  await tokenDoc.ref.update({ used: true });

  // Return the custom token to the client
  return { firebaseToken: customToken, assignmentId };
});

// Function to get assignment details for an already used token
export const testGetAssignmentForToken = functions.https.onCall(async (data, context) => {
  const { token } = data;
  if (!token) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Token is required'
    );
  }

  // Look up the token in the assignmentTokens collection
  const tokenDoc = await admin.firestore()
    .collection('assignmentTokens')
    .doc(token)
    .get();

  if (!tokenDoc.exists) {
    return { found: false };
  }

  const tokenData = tokenDoc.data() as AssignmentToken;
  const { assignmentId } = tokenData;

  // Check if token is expired
  const now = admin.firestore.Timestamp.now();
  if (tokenData.expiresAt.toMillis() < now.toMillis()) {
    return { found: false, reason: 'expired' };
  }

  // Get the assignment details
  const assignmentDoc = await admin.firestore()
    .collection('assignments')
    .doc(assignmentId)
    .get();

  if (!assignmentDoc.exists) {
    return { found: false, reason: 'no_assignment' };
  }

  const assignmentData = assignmentDoc.data();
  return { 
    found: true, 
    assignmentId,
    linkToken: assignmentData?.linkToken 
  };
}); 