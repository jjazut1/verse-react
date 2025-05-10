"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAssignmentInfo = exports.verifyTokenAndLogin = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// Verify token and handle login
exports.verifyTokenAndLogin = functions
    .region('us-central1')
    .https.onCall(async (data, context) => {
    const token = data.token;
    if (!token) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing token');
    }
    try {
        const tokenDoc = await admin.firestore()
            .collection('assignmentTokens')
            .doc(token)
            .get();
        if (!tokenDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Token not found or invalid');
        }
        const tokenData = tokenDoc.data();
        const now = admin.firestore.Timestamp.now();
        if (tokenData.expiresAt.toMillis() < now.toMillis()) {
            throw new functions.https.HttpsError('failed-precondition', 'Token has expired');
        }
        if (tokenData.used) {
            throw new functions.https.HttpsError('permission-denied', 'Token has already been used');
        }
        const { studentEmail, assignmentId } = tokenData;
        let userRecord;
        try {
            userRecord = await admin.auth().getUserByEmail(studentEmail);
        }
        catch (error) {
            userRecord = await admin.auth().createUser({
                email: studentEmail,
                emailVerified: true
            });
            await admin.firestore().collection('users').doc(userRecord.uid).set({
                email: studentEmail.toLowerCase(),
                role: 'student',
                status: 'active',
                createdAt: admin.firestore.Timestamp.now(),
            });
        }
        const customToken = await admin.auth().createCustomToken(userRecord.uid, {
            assignmentId,
        });
        await tokenDoc.ref.update({ used: true });
        return {
            firebaseToken: customToken,
            assignmentId
        };
    }
    catch (error) {
        console.error('Token verification error:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Internal server error');
    }
});
// Get assignment info for already used tokens
exports.getAssignmentInfo = functions
    .region('us-central1')
    .https.onCall(async (data, context) => {
    const token = data.token;
    if (!token) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing token');
    }
    try {
        // Look up the token in the assignmentTokens collection
        const tokenDoc = await admin.firestore()
            .collection('assignmentTokens')
            .doc(token)
            .get();
        if (!tokenDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Token not found');
        }
        const tokenData = tokenDoc.data();
        const { assignmentId } = tokenData;
        // Get the assignment details
        const assignmentDoc = await admin.firestore()
            .collection('assignments')
            .doc(assignmentId)
            .get();
        if (!assignmentDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Assignment not found');
        }
        const assignmentData = assignmentDoc.data();
        return {
            assignmentId,
            linkToken: assignmentData === null || assignmentData === void 0 ? void 0 : assignmentData.linkToken
        };
    }
    catch (error) {
        console.error('Error getting assignment info:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Internal server error');
    }
});
//# sourceMappingURL=token-functions.js.map