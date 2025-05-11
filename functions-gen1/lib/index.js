"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testAuthPermissions = exports.getAssignmentByIdForAuth = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Initialize Firebase with the default credentials
admin.initializeApp();
console.log('Firebase Admin initialized with default application credentials');
exports.getAssignmentByIdForAuth = functions.https.onCall(async (request) => {
    var _a;
    // Check if the user is authenticated
    if (!request.auth) {
        throw new Error('You must be logged in to access assignments');
    }
    const { assignmentId } = request.data;
    if (!assignmentId) {
        throw new Error('Assignment ID is required');
    }
    try {
        const docSnapshot = await admin.firestore().collection('assignments').doc(assignmentId).get();
        if (!docSnapshot.exists) {
            throw new Error('Assignment not found');
        }
        const assignment = docSnapshot.data();
        // Verify the assignment belongs to the authenticated user
        if (!assignment || !assignment.studentEmail) {
            throw new Error('Invalid assignment data');
        }
        if (!((_a = request.auth.token) === null || _a === void 0 ? void 0 : _a.email)) {
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
    }
    catch (error) {
        console.error('Error in getAssignmentByIdForAuth:', error);
        throw error;
    }
});
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to authenticate with Firebase Admin SDK",
            error: error.message,
            errorCode: error.code || 'unknown',
            errorStack: error.stack
        });
    }
});
//# sourceMappingURL=index.js.map