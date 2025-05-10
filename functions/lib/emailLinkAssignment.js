"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAssignmentWithFirebaseAuth = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");
// Initialize SendGrid with API key from environment
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (!SENDGRID_API_KEY) {
    console.error('Missing SENDGRID_API_KEY environment variable');
}
sgMail.setApiKey(SENDGRID_API_KEY || '');
// Email sender configuration
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'assignments@learnwithverse.com';
const SENDER_NAME = process.env.SENDER_NAME || 'Verse Learning';
/**
 * Cloud Function to send assignment emails with Firebase authentication links
 * using the continueUrl parameter to embed assignment tokens
 */
exports.sendAssignmentWithFirebaseAuth = functions.firestore
    .document('assignments/{assignmentId}')
    .onCreate(async (snapshot, context) => {
    var _a, _b;
    // Get assignment data
    const assignment = snapshot.data();
    const assignmentId = context.params.assignmentId;
    // Skip if email already sent or if useEmailLinkAuth flag is not set
    if (assignment.emailSent === true || assignment.useEmailLinkAuth !== true) {
        console.log(`Skipping email for assignment ${assignmentId}: 
        already sent: ${assignment.emailSent}, 
        uses email auth: ${assignment.useEmailLinkAuth}`);
        return null;
    }
    try {
        // Make sure student email exists
        if (!assignment.studentEmail) {
            console.error('No student email in assignment data');
            return null;
        }
        const studentEmail = assignment.studentEmail.toLowerCase();
        console.log(`Processing assignment with Firebase email link for student: ${studentEmail}, ID: ${assignmentId}`);
        // Base URL 
        const baseUrl = process.env.BASE_URL || 'https://r2process.com';
        // Create the parameters for the Firebase authentication link
        const actionCodeSettings = {
            url: `${baseUrl}/email-auth`,
            handleCodeInApp: true,
            // The continueUrl parameter will contain the assignment token and ID
            continueUrl: `${baseUrl}/assignment-auth?token=${assignment.linkToken}&assignmentId=${assignmentId}`
        };
        // Generate the Firebase authentication link
        let actionLink;
        try {
            actionLink = await admin.auth().generateSignInWithEmailLink(studentEmail, actionCodeSettings);
            console.log("Successfully generated Firebase sign-in link with continueUrl");
        }
        catch (error) {
            console.error("Error generating Firebase sign-in link:", error);
            return null;
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
            to: studentEmail,
            from: {
                email: SENDER_EMAIL,
                name: SENDER_NAME
            },
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
            <p><a href="${actionLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Start Activity</a></p>
            <p>If the button doesn't work, copy and paste this link into your browser: ${actionLink}</p>
            <p>This link is unique to you. Please do not share it with others.</p>
            <p><strong>Note:</strong> Clicking the link will automatically sign you in - no password needed!</p>
          </div>
        `
        };
        // Log that we're trying to send the email
        console.log(`Attempting to send email with Firebase auth link to ${studentEmail} for assignment ${assignmentId}`);
        // Send the email
        await sgMail.send(msg);
        console.log(`Assignment email with Firebase auth link successfully sent to ${studentEmail}`);
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
//# sourceMappingURL=emailLinkAssignment.js.map