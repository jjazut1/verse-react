const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

// HTTP function for token verification and login
exports.testVerifyTokenAndLoginHttp = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      // Extract token from request body
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({
          error: 'Token is required'
        });
      }

      // Look up the token in the assignmentTokens collection
      const tokenDoc = await admin.firestore()
        .collection('assignmentTokens')
        .doc(token)
        .get();

      if (!tokenDoc.exists) {
        return res.status(404).json({
          error: 'Token not found or invalid'
        });
      }

      const tokenData = tokenDoc.data();

      // Check if token is used or expired
      const now = admin.firestore.Timestamp.now();
      if (tokenData.expiresAt.toMillis() < now.toMillis()) {
        return res.status(410).json({
          error: 'Token has expired'
        });
      }

      if (tokenData.used) {
        return res.status(403).json({
          error: 'Token has already been used'
        });
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
      return res.status(200).json({ 
        firebaseToken: customToken, 
        assignmentId 
      });
    } catch (error) {
      console.error('Error in verifyTokenAndLogin:', error);
      return res.status(500).json({
        error: 'Internal server error'
      });
    }
  });
});

// Function to get assignment details for an already used token
exports.testGetAssignmentForTokenHttp = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({
          error: 'Token is required'
        });
      }

      // Look up the token in the assignmentTokens collection
      const tokenDoc = await admin.firestore()
        .collection('assignmentTokens')
        .doc(token)
        .get();

      if (!tokenDoc.exists) {
        return res.status(200).json({ found: false });
      }

      const tokenData = tokenDoc.data();
      const { assignmentId } = tokenData;

      // Check if token is expired
      const now = admin.firestore.Timestamp.now();
      if (tokenData.expiresAt.toMillis() < now.toMillis()) {
        return res.status(200).json({ found: false, reason: 'expired' });
      }

      // Get the assignment details
      const assignmentDoc = await admin.firestore()
        .collection('assignments')
        .doc(assignmentId)
        .get();

      if (!assignmentDoc.exists) {
        return res.status(200).json({ found: false, reason: 'no_assignment' });
      }

      const assignmentData = assignmentDoc.data();
      return res.status(200).json({ 
        found: true, 
        assignmentId,
        linkToken: assignmentData.linkToken 
      });
    } catch (error) {
      console.error('Error in getAssignmentForToken:', error);
      return res.status(500).json({
        error: 'Internal server error'
      });
    }
  });
}); 