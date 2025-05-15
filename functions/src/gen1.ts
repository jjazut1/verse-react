import * as functions from 'firebase-functions';
import admin from "./firebaseAdmin";

interface Assignment {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  gameId: string;
  gameTitle: string;
  gameName: string;
  deadline: admin.firestore.Timestamp;
  dueDate: admin.firestore.Timestamp;
  completed: boolean;
  score?: number;
  linkToken: string;
  emailSent?: boolean;
  useEmailLinkAuth?: boolean;
}

export const getAssignmentByIdForAuth = functions.https.onCall(async (request) => {
  // Check if the user is authenticated
  if (!request.auth) {
    throw new Error('You must be logged in to access assignments');
  }

  const { assignmentId } = request.data as { assignmentId: string };
  
  if (!assignmentId) {
    throw new Error('Assignment ID is required');
  }

  try {
    const docSnapshot = await admin.firestore().collection('assignments').doc(assignmentId).get();
    
    if (!docSnapshot.exists) {
      throw new Error('Assignment not found');
    }
    
    const assignment = docSnapshot.data() as Assignment;
    
    // Verify the assignment belongs to the authenticated user
    if (!assignment || !assignment.studentEmail) {
      throw new Error('Invalid assignment data');
    }
    
    if (!request.auth.token?.email) {
      throw new Error('User email not found in auth token');
    }
    
    if (assignment.studentEmail.toLowerCase() !== request.auth.token.email.toLowerCase()) {
      console.log(`Email mismatch: Assignment email ${assignment.studentEmail} vs authenticated email ${request.auth.token.email}`);
      throw new Error('You do not have permission to access this assignment');
    }
    
    // Return the token for assignment access
    return {
      success: true,
      assignmentToken: assignment.linkToken
    };
  } catch (error) {
    console.error('Error in getAssignmentByIdForAuth:', error);
    throw error;
  }
});

export const testAuthPermissions = functions.https.onRequest(async (req, res) => {
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to authenticate with Firebase Admin SDK",
      error: error.message,
      errorCode: error.code || 'unknown',
      errorStack: error.stack
    });
  }
}); 