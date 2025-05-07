"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");
// Initialize Firebase
admin.initializeApp();
// Get environment variables from Firebase config
const SENDGRID_API_KEY = ((_a = functions.config().sendgrid) === null || _a === void 0 ? void 0 : _a.key) || '';
const SENDER_EMAIL = ((_b = functions.config().email) === null || _b === void 0 ? void 0 : _b.sender) || 'Verse Learning <james@learnwithverse.com>';
// Initialize SendGrid with the key
console.log("Configuring SendGrid with key:", SENDGRID_API_KEY ? 'Key set' : 'No key set');
if (SENDGRID_API_KEY && SENDGRID_API_KEY.startsWith('SG.')) {
    sgMail.setApiKey(SENDGRID_API_KEY);
    console.log('SendGrid API key configured successfully');
}
else {
    console.warn('Invalid SendGrid API Key - emails will not be sent');
    console.warn('Please set your SendGrid API key using: firebase functions:config:set sendgrid.key=SG.YOUR_API_KEY');
}
// Function to send email on assignment creation
exports.sendAssignmentEmail = functions.firestore
    .document('assignments/{assignmentId}')
    .onCreate(async (snapshot, context) => {
    var _a, _b;
    // Get assignment data
    const assignment = snapshot.data();
    const assignmentId = context.params.assignmentId;
    // Skip if no data or email already sent
    if (!assignment || assignment.emailSent === true) {
        console.log('No assignment data or email already sent', { assignmentId });
        return null;
    }
    // If this assignment should use email link authentication, let the other function handle it
    if (assignment.useEmailLinkAuth === true) {
        console.log(`Assignment ${assignmentId} uses email link auth, skipping regular email`);
        return null;
    }
    try {
        // Make sure student email exists
        if (!assignment.studentEmail) {
            console.error('No student email in assignment data');
            return null;
        }
        const studentEmail = assignment.studentEmail.toLowerCase();
        console.log(`Processing assignment for student: ${studentEmail}, ID: ${assignmentId}`);
        // Base URL and assignment link
        const baseUrl = 'https://r2process.com';
        const assignmentLink = `${baseUrl}/play?token=${assignment.linkToken}`;
        console.log("Generated assignment link", { assignmentLink });
        // Format the due date
        let formattedDate = 'No due date set';
        try {
            const dueDate = ((_a = assignment.dueDate) === null || _a === void 0 ? void 0 : _a.toDate()) || ((_b = assignment.deadline) === null || _b === void 0 ? void 0 : _b.toDate());
            if (dueDate) {
                formattedDate = dueDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
        }
        catch (e) {
            console.error('Error formatting date:', e);
        }
        // Create email content
        const msg = {
            to: studentEmail,
            from: SENDER_EMAIL,
            subject: `New Assignment: ${assignment.gameTitle || assignment.gameName}`,
            html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New Assignment from Verse Learning</h2>
            <p>Hello ${assignment.studentName || 'Student'},</p>
            <p>You have been assigned a new learning activity:</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Activity:</strong> ${assignment.gameTitle || assignment.gameName}</p>
              <p><strong>Due Date:</strong> ${formattedDate}</p>
            </div>
            <p><a href="${assignmentLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Start Activity</a></p>
            <p>If the button doesn't work, copy and paste this link into your browser: ${assignmentLink}</p>
            <p>This link is unique to you. Please do not share it with others.</p>
          </div>
        `
        };
        // Log that we're trying to send the email
        console.log(`Attempting to send email to ${studentEmail} for assignment ${assignmentId}`);
        // Send the email
        await sgMail.send(msg);
        console.log(`Assignment email successfully sent to ${studentEmail}`);
        // Mark assignment as email sent
        await admin.firestore().collection('assignments').doc(assignmentId).update({
            emailSent: true
        });
        console.log(`Assignment ${assignmentId} marked as email sent`);
        return null;
    }
    catch (error) {
        console.error(`Error sending assignment email to ${assignment === null || assignment === void 0 ? void 0 : assignment.studentEmail}:`, error);
        return null;
    }
});
// Function to send authentication email with assignment link
exports.sendEmailLinkWithAssignment = functions.firestore
    .document('assignments/{assignmentId}')
    .onCreate(async (snapshot, context) => {
    var _a, _b;
    // Get assignment data
    const assignment = snapshot.data();
    const assignmentId = context.params.assignmentId;
    // Skip if no data or email already sent
    if (!assignment || assignment.emailSent === true) {
        console.log('No assignment data or email already sent', { assignmentId });
        return null;
    }
    // Only process assignments that are explicitly set to use email link auth
    if (assignment.useEmailLinkAuth !== true) {
        console.log(`Assignment ${assignmentId} does not use email link auth, skipping`);
        return null;
    }
    try {
        // Make sure student email exists
        if (!assignment.studentEmail) {
            console.error('No student email in assignment data');
            return null;
        }
        const studentEmail = assignment.studentEmail.toLowerCase();
        console.log(`Processing assignment with email link for student: ${studentEmail}, ID: ${assignmentId}`);
        // Base URL - use Firebase Auth domain
        const baseUrl = 'https://r2process.com';
        // Set up the action code settings for Firebase Auth Email Link
        const actionCodeSettings = {
            url: `${baseUrl}/login?assignmentId=${assignmentId}`,
            handleCodeInApp: true,
            iOS: {
                bundleId: 'com.verselearning.app'
            },
            android: {
                packageName: 'com.verselearning.app',
                installApp: true,
                minimumVersion: '12'
            },
            dynamicLinkDomain: 'verselearning.page.link'
        };
        // Generate the sign-in link with Firebase Auth
        const signInLink = await admin.auth().generateSignInWithEmailLink(studentEmail, actionCodeSettings);
        console.log("Generated sign-in link with embedded assignment ID", { signInLink });
        // Format the due date
        let formattedDate = 'No due date set';
        try {
            const dueDate = ((_a = assignment.dueDate) === null || _a === void 0 ? void 0 : _a.toDate()) || ((_b = assignment.deadline) === null || _b === void 0 ? void 0 : _b.toDate());
            if (dueDate) {
                formattedDate = dueDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
        }
        catch (e) {
            console.error('Error formatting date:', e);
        }
        // Create email content
        const msg = {
            to: studentEmail,
            from: SENDER_EMAIL,
            subject: `New Assignment: ${assignment.gameTitle || assignment.gameName}`,
            html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New Assignment from Verse Learning</h2>
            <p>Hello ${assignment.studentName || 'Student'},</p>
            <p>You have been assigned a new learning activity:</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Activity:</strong> ${assignment.gameTitle || assignment.gameName}</p>
              <p><strong>Due Date:</strong> ${formattedDate}</p>
            </div>
            <p><a href="${signInLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Start Activity</a></p>
            <p>If the button doesn't work, copy and paste this link into your browser: ${signInLink}</p>
            <p>This link is unique to you. Please do not share it with others.</p>
            <p><strong>Note:</strong> Clicking the link will automatically sign you in - no password needed!</p>
          </div>
        `
        };
        // Log that we're trying to send the email
        console.log(`Attempting to send email link authentication to ${studentEmail} for assignment ${assignmentId}`);
        // Send the email
        await sgMail.send(msg);
        console.log(`Assignment email with sign-in link successfully sent to ${studentEmail}`);
        // Mark assignment as email sent
        await admin.firestore().collection('assignments').doc(assignmentId).update({
            emailSent: true
        });
        console.log(`Assignment ${assignmentId} marked as email sent`);
        return null;
    }
    catch (error) {
        console.error(`Error sending assignment email with sign-in link to ${assignment === null || assignment === void 0 ? void 0 : assignment.studentEmail}:`, error);
        return null;
    }
});
// Callable function to get assignment by ID and verify authentication
exports.getAssignmentByIdForAuth = functions.https.onCall((data, context) => {
    // TypeScript type assertions to suppress type errors
    const typedContext = context;
    const typedData = data;
    // Check if the user is authenticated
    if (!typedContext.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to access assignments');
    }
    const { assignmentId } = typedData;
    if (!assignmentId) {
        throw new functions.https.HttpsError('invalid-argument', 'Assignment ID is required');
    }
    return admin.firestore().collection('assignments').doc(assignmentId).get()
        .then(docSnapshot => {
        if (!docSnapshot.exists) {
            throw new functions.https.HttpsError('not-found', 'Assignment not found');
        }
        const assignment = docSnapshot.data();
        // Verify the assignment belongs to the authenticated user
        if (!assignment || !assignment.studentEmail) {
            throw new functions.https.HttpsError('internal', 'Invalid assignment data');
        }
        // We've already checked auth exists above, so it's safe to use non-null assertion here
        if (assignment.studentEmail.toLowerCase() !== typedContext.auth.token.email.toLowerCase()) {
            console.log(`Email mismatch: Assignment email ${assignment.studentEmail} vs authenticated email ${typedContext.auth.token.email}`);
            throw new functions.https.HttpsError('permission-denied', 'You do not have permission to access this assignment');
        }
        // Return the token for assignment access
        return {
            success: true,
            assignmentToken: assignment.linkToken
        };
    })
        .catch(error => {
        console.error('Error in getAssignmentByIdForAuth:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'An error occurred while fetching the assignment');
    });
});
//# sourceMappingURL=index.js.map