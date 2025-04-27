"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const params_1 = require("firebase-functions/params");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
admin.initializeApp();
// Define config parameters
const emailUser = (0, params_1.defineString)('email.user');
const emailPassword = (0, params_1.defineString)('email.password');
const appUrl = (0, params_1.defineString)('app.url');
// Configure nodemailer with your email service (e.g., Gmail, SendGrid)
// For production, consider using a service like SendGrid, Mailgun, etc.
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: emailUser.value(),
        pass: emailPassword.value(),
    },
});
// Function to send assignment emails
exports.sendAssignmentEmail = (0, firestore_1.onDocumentCreated)('assignments/{assignmentId}', async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        console.log('No data associated with the event');
        return;
    }
    try {
        const assignment = snapshot.data();
        const assignmentId = event.params.assignmentId;
        // Get teacher information
        const teacherDoc = await admin.firestore().collection('users').doc(assignment.teacherId).get();
        const teacherData = teacherDoc.data();
        const teacherName = (teacherData === null || teacherData === void 0 ? void 0 : teacherData.displayName) || 'Your teacher';
        // Create assignment URL
        const assignmentUrl = `${appUrl.value()}/assignment/${assignment.linkToken}`;
        // Format deadline date
        const deadline = assignment.deadline.toDate();
        const formattedDeadline = deadline.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        // Email content
        const mailOptions = {
            from: `"Verse Learning" <${emailUser.value()}>`,
            to: assignment.studentEmail,
            subject: `New Assignment: ${assignment.gameName}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Assignment</h2>
          <p>Hello,</p>
          <p>${teacherName} has assigned you a new educational game.</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${assignment.gameName}</h3>
            <p><strong>Type:</strong> ${assignment.gameType}</p>
            <p><strong>Complete by:</strong> ${formattedDeadline}</p>
            <p><strong>Times to complete:</strong> ${assignment.timesRequired}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${assignmentUrl}" style="background-color: #3182CE; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Play Assignment
            </a>
          </div>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all;"><a href="${assignmentUrl}">${assignmentUrl}</a></p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eaeaea;">
          <p style="color: #666; font-size: 12px;">This is an automated message from Verse Learning.</p>
        </div>
      `,
        };
        // Send email
        await transporter.sendMail(mailOptions);
        // Update assignment to mark email as sent
        await admin.firestore().collection('assignments').doc(assignmentId).update({
            emailSent: true,
            emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true };
    }
    catch (error) {
        console.error('Error sending assignment email:', error);
        return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
});
// Daily scheduled function to send reminder emails for approaching deadlines
exports.sendReminderEmails = (0, scheduler_1.onSchedule)('every 24 hours', async (event) => {
    try {
        const now = admin.firestore.Timestamp.now();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 59, 59, 999);
        const tomorrowTimestamp = admin.firestore.Timestamp.fromDate(tomorrow);
        // Get assignments due tomorrow that aren't completed
        const assignmentsSnapshot = await admin.firestore()
            .collection('assignments')
            .where('deadline', '<=', tomorrowTimestamp)
            .where('deadline', '>=', now)
            .where('status', '!=', 'completed')
            .get();
        const reminderPromises = assignmentsSnapshot.docs.map(async (doc) => {
            const assignment = doc.data();
            // Create assignment URL
            const assignmentUrl = `${appUrl.value()}/assignment/${assignment.linkToken}`;
            // Format deadline date
            const deadline = assignment.deadline.toDate();
            const formattedDeadline = deadline.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            // Email content
            const mailOptions = {
                from: `"Verse Learning" <${emailUser.value()}>`,
                to: assignment.studentEmail,
                subject: `Reminder: Assignment Due Soon - ${assignment.gameName}`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Assignment Reminder</h2>
            <p>Hello,</p>
            <p>This is a friendly reminder that you have an assignment due soon.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">${assignment.gameName}</h3>
              <p><strong>Due by:</strong> ${formattedDeadline}</p>
              <p><strong>Current progress:</strong> ${assignment.completedCount}/${assignment.timesRequired} completed</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${assignmentUrl}" style="background-color: #3182CE; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                Complete Assignment
              </a>
            </div>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all;"><a href="${assignmentUrl}">${assignmentUrl}</a></p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eaeaea;">
            <p style="color: #666; font-size: 12px;">This is an automated message from Verse Learning.</p>
          </div>
        `,
            };
            // Send reminder email
            return transporter.sendMail(mailOptions);
        });
        await Promise.all(reminderPromises);
        console.log(`Successfully sent ${reminderPromises.length} reminder emails`);
    }
    catch (error) {
        console.error('Error sending reminder emails:', error);
    }
});
//# sourceMappingURL=index.js.map