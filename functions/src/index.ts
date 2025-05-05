import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase
admin.initializeApp();

// Import the original sendAssignmentEmail function
// Note: Keep the original import if it exists, otherwise reference the same one

// Import the test functions
import { testSendAssignmentEmail } from './send-assignment-email';
import { testVerifyTokenAndLogin, testGetAssignmentForToken } from './verify-token';

// Export the functions - keep the original exports if they exist
// exports.sendAssignmentEmail = sendAssignmentEmail;

// Export the test functions
exports.testSendAssignmentEmail = testSendAssignmentEmail;
exports.testVerifyTokenAndLogin = testVerifyTokenAndLogin;
exports.testGetAssignmentForToken = testGetAssignmentForToken; 