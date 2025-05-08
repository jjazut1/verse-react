const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Firebase
admin.initializeApp();

/**
 * Test function to check if Firebase Admin Auth permissions are working
 */
exports.testAuthPermissions = functions.https.onRequest(async (req, res) => {
  try {
    // Try to generate a custom token, which requires Auth Admin privileges
    const customToken = await admin.auth().createCustomToken('test-user-id');
    
    // Try to access Firestore
    const snapshot = await admin.firestore().collection('assignments').limit(1).get();
    const assignmentCount = snapshot.size;

    res.status(200).json({
      success: true,
      message: "Successfully authenticated with Firebase Admin SDK",
      authPermissionsWorking: true,
      firestorePermissionsWorking: true,
      customTokenGenerated: !!customToken, 
      assignmentCount: assignmentCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to authenticate with Firebase Admin SDK",
      error: error.message,
      errorCode: error.code || 'unknown',
      errorStack: error.stack
    });
  }
}); 