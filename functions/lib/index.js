"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.automateTestEmail = exports.sendReminderEmails = exports.sendAssignmentEmail = exports.testEmail = exports.helloWorld = void 0;
exports.callInternalService = callInternalService;
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const google_auth_library_1 = require("google-auth-library");
const node_fetch_1 = require("node-fetch");
// Initialize Firebase with explicit project ID
admin.initializeApp({
    projectId: 'verse-11f2d',
    credential: admin.credential.applicationDefault()
});
// Define environment parameters
const emailUser = (0, params_1.defineString)("EMAIL_USER");
const emailPassword = (0, params_1.defineString)("EMAIL_PASSWORD");
// Configure nodemailer
const getTransporter = () => {
    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: emailUser.value(),
            pass: emailPassword.value(),
        },
    });
};
// HTTP hello world function
exports.helloWorld = (0, https_1.onRequest)((request, response) => {
    logger.info("Hello logs!", { structuredData: true });
    response.send("Hello from Verse Learning!");
});
// HTTP test email function
exports.testEmail = (0, https_1.onRequest)(async (request, response) => {
    var _a;
    try {
        const recipientEmail = ((_a = request.query.email) === null || _a === void 0 ? void 0 : _a.toString()) || emailUser.value();
        const transporter = getTransporter();
        // Email content
        const mailOptions = {
            from: `"Verse Learning" <${emailUser.value()}>`,
            to: recipientEmail,
            subject: "Test Email from Verse Learning",
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Test Email</h2>
          <p>This is a test email from Verse Learning.</p>
          <p>If you're seeing this, email functionality is working correctly!</p>
        </div>
      `,
        };
        // Send email
        await transporter.sendMail(mailOptions);
        response.send({
            success: true,
            message: "Test email sent successfully",
            sentTo: recipientEmail,
        });
    }
    catch (error) {
        logger.error("Error sending test email:", error);
        response.status(500).send({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
// Function to send email on assignment creation
exports.sendAssignmentEmail = (0, firestore_1.onDocumentCreated)("assignments/{assignmentId}", async (event) => {
    var _a;
    const snapshot = event.data;
    if (!snapshot) {
        logger.log("No data associated with the event");
        return;
    }
    try {
        const assignment = snapshot.data();
        const assignmentId = event.params.assignmentId;
        // Local dev logs
        console.log("Raw snapshot data:", JSON.stringify(snapshot.data()));
        console.log("Assignment object:", JSON.stringify(assignment));
        // Cloud structured log
        logger.log("Assignment creation event", {
            assignmentId,
            studentEmail: assignment.studentEmail,
        });
        if (assignment.emailSent === true) {
            logger.log("Email already sent", { assignmentId });
            return;
        }
        // Log dueDate/deadline for debug
        logger.log("Checking dueDate and deadline", {
            dueDate: assignment.dueDate,
            deadline: assignment.deadline,
        });
        // Robust Timestamp check
        const rawDueDate = (_a = assignment.dueDate) !== null && _a !== void 0 ? _a : assignment.deadline;
        if (!rawDueDate || typeof rawDueDate.toDate !== "function") {
            logger.error("Invalid or missing dueDate/deadline Timestamp", {
                assignmentId,
                dueDateRaw: assignment.dueDate,
                deadlineRaw: assignment.deadline,
            });
            return;
        }
        const dueDate = rawDueDate.toDate();
        const formattedDate = dueDate.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });
        // Update the game link URL to ensure it's correctly formatted
        // Make sure there's no trailing slash before the play path
        const baseUrl = "https://verse-learning.vercel.app";
        const gameLink = `${baseUrl}/play/${assignment.gameId}?token=${assignment.linkToken}`;
        logger.log("Generated game link", { gameLink });
        const mailOptions = {
            from: `"Verse Learning" <${emailUser.value()}>`,
            to: assignment.studentEmail,
            subject: `New Assignment: ${assignment.gameTitle || assignment.gameName}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Assignment from Verse Learning</h2>
          <p>Hello ${assignment.studentName || "Student"},</p>
          <p>You have been assigned a new learning activity:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Activity:</strong> ${assignment.gameTitle || assignment.gameName}</p>
            <p><strong>Due Date:</strong> ${formattedDate}</p>
          </div>
          <p><a href="${gameLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Start Activity</a></p>
          <p>If the button doesn't work, copy and paste this link into your browser: ${gameLink}</p>
          <p>This link is unique to you. Please do not share it with others.</p>
        </div>
      `,
        };
        // Send email
        const transporter = getTransporter();
        await transporter.sendMail(mailOptions);
        // Instead of trying to update Firestore directly (which is causing permission issues),
        // just log a success message and consider the email part done
        logger.log("Assignment email successfully sent", {
            assignmentId,
            email: assignment.studentEmail,
            note: "Due to permission restrictions, the document was not updated with emailSent=true."
        });
        // Important: The client side should handle updating the emailSent flag
        // or you can set up a separate function with different permissions to do this
    }
    catch (error) {
        logger.error("Error sending assignment email", {
            error: error instanceof Error ? error.message : String(error),
            assignmentId: event.params.assignmentId,
            details: error instanceof Error && error.stack ? error.stack : "No stack trace available"
        });
    }
});
// Scheduled function to send reminder emails
const scheduleOptions = {
    schedule: "0 8 * * *", // Run at 8:00 AM every day
    timeZone: "America/New_York",
};
exports.sendReminderEmails = (0, scheduler_1.onSchedule)(scheduleOptions, async () => {
    try {
        const now = admin.firestore.Timestamp.now();
        const tomorrow = admin.firestore.Timestamp.fromDate(new Date(now.toMillis() + 24 * 60 * 60 * 1000));
        // Query assignments due in the next 24 hours that are not completed
        const assignmentsSnapshot = await admin
            .firestore()
            .collection("assignments")
            .where("dueDate", ">=", now)
            .where("dueDate", "<=", tomorrow)
            .where("completed", "==", false)
            .get();
        if (assignmentsSnapshot.empty) {
            logger.log("No assignments due in the next 24 hours");
            return;
        }
        // Process each assignment
        const transporter = getTransporter();
        const emailPromises = assignmentsSnapshot.docs.map(async (doc) => {
            const assignment = doc.data();
            // Format the due date
            const dueDate = assignment.dueDate.toDate();
            const formattedDate = dueDate.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
            });
            // Construct the game link with token
            const gameLink = `https://verse-learning.vercel.app/play/${assignment.gameId}?token=${assignment.linkToken}`;
            // Email content
            const mailOptions = {
                from: `"Verse Learning" <${emailUser.value()}>`,
                to: assignment.studentEmail,
                subject: `Reminder: ${assignment.gameTitle} Due Soon`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Assignment Due Reminder</h2>
            <p>Hello ${assignment.studentName},</p>
            <p>This is a friendly reminder that you have an assignment due soon:</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Activity:</strong> ${assignment.gameTitle}</p>
              <p><strong>Due Date:</strong> ${formattedDate}</p>
            </div>
            <p><a href="${gameLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Complete Activity</a></p>
          </div>
        `,
            };
            // Send email
            return transporter
                .sendMail(mailOptions)
                .then(() => {
                logger.log(`Reminder email sent to ${assignment.studentEmail} for assignment ${assignment.id}`);
            })
                .catch((error) => {
                logger.error(`Error sending reminder email for assignment ${assignment.id}:`, error instanceof Error ? error.message : "Unknown error");
            });
        });
        await Promise.all(emailPromises);
        logger.log(`Processed ${assignmentsSnapshot.size} reminder emails`);
    }
    catch (error) {
        logger.error("Error sending reminder emails:", error instanceof Error ? error.message : "Unknown error");
    }
});
// Generalized helper for internal service calls
async function callInternalService(baseUrl, pathWithQuery, options = {}, maxRetries = 3) {
    const auth = new google_auth_library_1.GoogleAuth({ scopes: "https://www.googleapis.com/auth/cloud-platform" });
    const client = await auth.getClient();
    // @ts-ignore
    const idToken = await client.fetchIdToken(baseUrl);
    // Merge headers
    options.headers = Object.assign(Object.assign({}, (options.headers || {})), { Authorization: `Bearer ${idToken}` });
    // Retry logic
    let attempt = 0, delay = 500;
    while (attempt < maxRetries) {
        try {
            const response = await (0, node_fetch_1.default)(`${baseUrl}${pathWithQuery}`, options);
            if (response.ok || response.status < 500)
                return response;
        }
        catch (err) {
            if (attempt === maxRetries - 1)
                throw err;
        }
        await new Promise(res => setTimeout(res, delay));
        delay *= 2;
        attempt++;
    }
    throw new Error("Max retries reached");
}
exports.automateTestEmail = (0, https_1.onRequest)(async (req, res) => {
    try {
        // Update with the correct URL from your deployed testEmail function
        const baseRunUrl = 'https://testemail-5zrv23g6za-uc.a.run.app';
        const pathWithQuery = '?email=james@learnwithverse.com';
        const response = await callInternalService(baseRunUrl, pathWithQuery);
        const contentType = response.headers.get('content-type');
        if (!response.ok) {
            const text = await response.text();
            res.status(response.status).send({
                error: `Request failed with status ${response.status}`,
                reason: response.status >= 500 ? 'Cloud Run service error' : 'Client error or unauthorized',
                body: text,
            });
            return;
        }
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            res.status(200).send(data);
        }
        else {
            const text = await response.text();
            res.status(200).send({
                message: 'Non-JSON response received',
                body: text,
            });
        }
    }
    catch (error) {
        if (error instanceof Error) {
            res.status(500).send({ error: error.message });
        }
        else {
            res.status(500).send({ error: String(error) });
        }
    }
});
//# sourceMappingURL=index.js.map