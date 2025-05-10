"use strict";
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.testSendAssignmentEmail = void 0;
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const sgMail = require("@sendgrid/mail");
const uuid_1 = require("uuid");
// Get environment variables from Firebase config
const SENDGRID_API_KEY = ((_a = functions.config().sendgrid) === null || _a === void 0 ? void 0 : _a.key) || '';
const SENDER_EMAIL = ((_b = functions.config().email) === null || _b === void 0 ? void 0 : _b.sender) || 'Verse Learning <james@learnwithverse.com>';
const BASE_URL = ((_c = functions.config().app) === null || _c === void 0 ? void 0 : _c.url) || 'https://r2process.com';
// Initialize SendGrid with the key
if (SENDGRID_API_KEY && SENDGRID_API_KEY.startsWith('SG.')) {
    sgMail.setApiKey(SENDGRID_API_KEY);
    console.log('SendGrid API key configured successfully');
}
else {
    console.warn('Invalid SendGrid API Key - emails will not be sent');
}
// Function to send assignment email with secure token
exports.testSendAssignmentEmail = functions.firestore
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
    try {
        // Make sure student email exists
        if (!assignment.studentEmail) {
            console.error('No student email in assignment data');
            return null;
        }
        const studentEmail = assignment.studentEmail.toLowerCase();
        console.log(`Processing assignment for student: ${studentEmail}, ID: ${assignmentId}`);
        // Generate a secure token (UUID)
        const token = (0, uuid_1.v4)();
        // Token expiration (14 days from now)
        const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));
        // Store token data in Firestore
        await admin.firestore().collection('assignmentTokens').doc(token).set({
            studentEmail,
            assignmentId,
            expiresAt,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            used: false,
        });
        // Create assignment link with token
        const assignmentLink = `${BASE_URL}/assignment-access?token=${token}`;
        // Create a direct link for returning users
        const directLink = `${BASE_URL}/play?token=${assignment.linkToken}`;
        console.log("Generated assignment links", { assignmentLink, directLink });
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
            <p>Click the button below to access your assignment for the first time. You'll be automatically signed in.</p>
            <p><a href="${assignmentLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Start Activity (First Time)</a></p>
            
            <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
              <strong>Already accessed this assignment before?</strong><br />
              If you've already clicked the button above once, use this direct link instead:
            </p>
            <p><a href="${directLink}" style="display: inline-block; background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Return to Assignment</a></p>
            
            <p style="margin-top: 20px; font-size: 0.9em; color: #666;">
              Note: The first link can only be used once for security reasons. After that, please use the "Return to Assignment" link.
            </p>
            <p>These links are unique to you. Please do not share them with others.</p>
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
//# sourceMappingURL=send-assignment-email.js.map