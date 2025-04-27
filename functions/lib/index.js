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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTestEmailREST = exports.sendTestEmail = exports.sendAssignmentEmail = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const cors = require("cors");
// Initialize Firebase Admin
admin.initializeApp();
// Create a CORS middleware instance
const corsHandler = cors({ origin: true });
// Configure nodemailer with environment variables
const mailTransport = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: functions.config().email.user,
        pass: functions.config().email.password,
    },
});
// The sender email address - should match the authenticated user above
const SENDER_EMAIL = functions.config().email.sender || functions.config().email.user;
/**
 * Cloud Function triggered when a new assignment document is created
 * Sends an email to the student with instructions and a link to access the assignment
 */
exports.sendAssignmentEmail = functions.firestore
    .document("assignments/{assignmentId}")
    .onCreate(async (snap, context) => {
    const assignmentId = context.params.assignmentId;
    const assignmentData = snap.data();
    // Generate a unique link token if it doesn't exist
    let linkToken = assignmentData.linkToken;
    if (!linkToken) {
        linkToken = generateLinkToken();
        // Update the assignment with the link token
        await admin.firestore().collection("assignments").doc(assignmentId).update({
            linkToken: linkToken,
            status: "assigned",
            completedCount: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    try {
        // Get teacher information
        const teacherDoc = await admin.firestore().collection("users").doc(assignmentData.teacherId).get();
        const teacherData = teacherDoc.data();
        const teacherName = (teacherData === null || teacherData === void 0 ? void 0 : teacherData.displayName) || (teacherData === null || teacherData === void 0 ? void 0 : teacherData.email) || "Your teacher";
        // Format the deadline
        const deadlineDate = assignmentData.deadline.toDate();
        const formattedDeadline = deadlineDate.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });
        // Create the assignment link
        const baseUrl = functions.config().app.url || "http://localhost:3000";
        const assignmentLink = `${baseUrl}/assignment/${linkToken}`;
        // Prepare email
        const mailOptions = {
            from: `Verse Learning <${SENDER_EMAIL}>`,
            to: assignmentData.studentEmail,
            subject: `New Assignment: ${assignmentData.gameName}`,
            html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #3182CE; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">New Assignment</h1>
            </div>
            <div style="padding: 20px; border: 1px solid #E2E8F0; border-top: none;">
              <p>Hello,</p>
              <p>${teacherName} has assigned you a new learning activity: <strong>${assignmentData.gameName}</strong>.</p>
              <p><strong>Details:</strong></p>
              <ul>
                <li>Assignment type: ${assignmentData.gameType === "sort-categories-egg" ? "Sort Categories" : "Whack-a-Mole"}</li>
                <li>Due by: ${formattedDeadline}</li>
                <li>Times to complete: ${assignmentData.timesRequired}</li>
              </ul>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${assignmentLink}" style="background-color: #3182CE; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                  Start Assignment
                </a>
              </div>
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all;"><a href="${assignmentLink}">${assignmentLink}</a></p>
              <p>Good luck!</p>
              <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 20px 0;">
              <p style="font-size: 12px; color: #718096;">This is an automated message from Verse Learning. Please do not reply to this email.</p>
            </div>
          </div>
        `,
        };
        // Send the email
        await mailTransport.sendMail(mailOptions);
        console.log(`Assignment email sent to ${assignmentData.studentEmail}`);
        return { success: true };
    }
    catch (error) {
        console.error("Error sending assignment email:", error);
        return { error: "Failed to send assignment email" };
    }
});
/**
 * Generate a unique token for assignment links
 */
function generateLinkToken() {
    // Generate a random string of 20 characters
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
}
/**
 * HTTP function for sending a test email (for testing purposes)
 * Using the callable approach for better CORS handling
 */
exports.sendTestEmail = functions.https.onCall(async (data, context) => {
    console.log('sendTestEmail function called with data:', data);
    // Check if the user is authenticated and is an admin/teacher
    if (!context.auth) {
        console.error('Authentication failed: No auth context');
        throw new functions.https.HttpsError("unauthenticated", "You must be logged in to send test emails.");
    }
    console.log('Auth UID:', context.auth.uid);
    try {
        // Optionally check for admin/teacher role
        const userDoc = await admin.firestore().collection("users").doc(context.auth.uid).get();
        const userData = userDoc.data();
        console.log('User data:', userData);
        if (!userData || (userData.role !== "admin" && userData.role !== "teacher")) {
            console.error('Permission denied: User role is not admin or teacher');
            throw new functions.https.HttpsError("permission-denied", "Only admins and teachers can send test emails.");
        }
        // Email address to send the test to
        const { email } = data;
        if (!email) {
            console.error('Invalid argument: No email provided');
            throw new functions.https.HttpsError("invalid-argument", "Email address is required.");
        }
        console.log('Sending test email to:', email);
        // For emulator testing, just return success without actually sending email
        // In production, this will actually send the email
        if (process.env.FUNCTIONS_EMULATOR === 'true') {
            console.log('Running in emulator mode - email sending simulated');
            return {
                success: true,
                message: "Test email simulated in emulator!",
                emulator: true
            };
        }
        const mailOptions = {
            from: `Verse Learning <${SENDER_EMAIL}>`,
            to: email,
            subject: "Test Email from Verse Learning",
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #3182CE; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Test Email</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #E2E8F0; border-top: none;">
            <p>Hello,</p>
            <p>This is a test email from Verse Learning. If you received this, your email configuration is working correctly.</p>
            <p>Time sent: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `,
        };
        await mailTransport.sendMail(mailOptions);
        console.log('Email sent successfully to:', email);
        return { success: true, message: "Test email sent successfully!" };
    }
    catch (error) {
        console.error("Error sending test email:", error);
        throw new functions.https.HttpsError("internal", "Failed to send test email.");
    }
});
/**
 * HTTP REST endpoint for sending a test email (alternative approach)
 * This provides a REST endpoint with proper CORS handling
 */
exports.sendTestEmailREST = functions.https.onRequest((request, response) => {
    // Handle CORS
    return corsHandler(request, response, async () => {
        // Only allow POST requests
        if (request.method !== 'POST') {
            response.status(405).send('Method Not Allowed');
            return;
        }
        try {
            // Verify authentication
            const authHeader = request.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                response.status(401).send('Unauthorized');
                return;
            }
            const idToken = authHeader.split('Bearer ')[1];
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            const uid = decodedToken.uid;
            // Check if user is admin or teacher
            const userDoc = await admin.firestore().collection("users").doc(uid).get();
            const userData = userDoc.data();
            if (!userData || (userData.role !== "admin" && userData.role !== "teacher")) {
                response.status(403).send('Forbidden: Only admins and teachers can send test emails');
                return;
            }
            // Get email from request body
            const { email } = request.body.data || {};
            if (!email) {
                response.status(400).send('Email address is required');
                return;
            }
            // Send email
            const mailOptions = {
                from: `Verse Learning <${SENDER_EMAIL}>`,
                to: email,
                subject: "Test Email from Verse Learning (REST API)",
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #3182CE; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">Test Email (REST API)</h1>
            </div>
            <div style="padding: 20px; border: 1px solid #E2E8F0; border-top: none;">
              <p>Hello,</p>
              <p>This is a test email from Verse Learning via the REST API. If you received this, your email configuration is working correctly.</p>
              <p>Time sent: ${new Date().toLocaleString()}</p>
            </div>
          </div>
        `,
            };
            await mailTransport.sendMail(mailOptions);
            response.status(200).send({ success: true, message: "Test email sent successfully!" });
        }
        catch (error) {
            console.error("Error in REST endpoint:", error);
            response.status(500).send({ error: "Failed to send test email" });
        }
    });
});
// Re-export from test file
__exportStar(require("./test"), exports);
//# sourceMappingURL=index.js.map