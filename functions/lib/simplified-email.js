"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");
// Initialize Firebase Admin SDK if not already initialized
try {
    admin.initializeApp();
}
catch (e) {
    // App already initialized
}
// Set up SendGrid - replace with your actual config
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'james@learnwithverse.com';
sgMail.setApiKey(SENDGRID_API_KEY);
/**
 * Cloud Function that sends a combined authentication+assignment email to new users
 * or a regular assignment email to existing users.
 */
exports.sendCombinedAssignmentEmail = functions.firestore
    .document('assignments/{assignmentId}')
    .onCreate(async (snapshot, context) => {
    var _a, _b;
    // Get assignment data
    const assignment = snapshot.data();
    const assignmentId = context.params.assignmentId;
    // Skip if no data or email already sent
    if (!assignment || assignment.emailSent === true) {
        console.log('No assignment data or email already sent');
        return null;
    }
    try {
        // Check if user already exists
        const userQuery = await admin
            .firestore()
            .collection('users')
            .where('email', '==', assignment.studentEmail.toLowerCase())
            .limit(1)
            .get();
        const isExistingUser = !userQuery.empty;
        // Base URL and basic assignment link
        const baseUrl = 'https://r2process.com';
        let assignmentLink = `${baseUrl}/play?token=${assignment.linkToken}`;
        let authMessage = '';
        // For new users, create an authentication link
        if (!isExistingUser) {
            try {
                // Set up the authentication link that forwards to the assignment
                const actionCodeSettings = {
                    url: assignmentLink,
                    handleCodeInApp: true
                };
                // Generate Firebase authentication link
                const signInLink = await admin.auth().generateSignInWithEmailLink(assignment.studentEmail, actionCodeSettings);
                // Replace normal link with auth link
                assignmentLink = signInLink;
                // Create a pre-registered user record
                const newUserId = admin.firestore().collection('users').doc().id;
                await admin.firestore().collection('users').doc(newUserId).set({
                    email: assignment.studentEmail.toLowerCase(),
                    role: 'user',
                    status: 'invited',
                    authComplete: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    createdBy: assignment.teacherId || 'system'
                });
                console.log(`Created pre-registered user record for ${assignment.studentEmail} with ID ${newUserId}`);
                // Add special message for new users
                authMessage = `<p><strong>Note:</strong> This is your first time using our system. 
          Clicking the button below will both authenticate you and take you to your assignment. No separate login required!</p>`;
            }
            catch (error) {
                console.error('Error creating authentication link:', error);
                // Fall back to regular link if there's an error
                assignmentLink = `${baseUrl}/play?token=${assignment.linkToken}`;
            }
        }
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
            to: assignment.studentEmail,
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
            ${authMessage}
            <p><a href="${assignmentLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Start Activity</a></p>
            <p>If the button doesn't work, copy and paste this link into your browser: ${assignmentLink}</p>
            <p>This link is unique to you. Please do not share it with others.</p>
          </div>
        `
        };
        // Send the email
        await sgMail.send(msg);
        console.log(`Assignment email sent to ${assignment.studentEmail}`);
        // Mark assignment as email sent
        await admin.firestore().collection('assignments').doc(assignmentId).update({
            emailSent: true
        });
        return null;
    }
    catch (error) {
        console.error('Error sending assignment email:', error);
        return null;
    }
});
//# sourceMappingURL=simplified-email.js.map