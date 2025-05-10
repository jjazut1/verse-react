"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testAssignmentEmail = exports.automateTestEmail = exports.sendReminderEmails = exports.sendAssignmentEmail = exports.testEmail = exports.helloWorld = void 0;
exports.callInternalService = callInternalService;
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const google_auth_library_1 = require("google-auth-library");
const node_fetch_1 = require("node-fetch");
const sgMail = require("@sendgrid/mail");
// Initialize Firebase with explicit project ID
admin.initializeApp({
    projectId: 'verse-11f2d',
    credential: admin.credential.applicationDefault()
});
// Define environment parameters
const sendgridApiKey = (0, params_1.defineString)("SENDGRID_API_KEY");
const senderEmail = (0, params_1.defineString)("SENDER_EMAIL");
// Initialize SendGrid
sgMail.setApiKey(sendgridApiKey.value());
// HTTP hello world function
exports.helloWorld = (0, https_1.onRequest)((request, response) => {
    logger.info("Hello logs!", { structuredData: true });
    response.send("Hello from Verse Learning!");
});
// HTTP test email function
exports.testEmail = (0, https_1.onRequest)({
    invoker: "public"
}, async (request, response) => {
    var _a;
    try {
        const recipientEmail = ((_a = request.query.email) === null || _a === void 0 ? void 0 : _a.toString()) || senderEmail.value();
        // Email content
        const msg = {
            to: recipientEmail,
            from: senderEmail.value(),
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
        await sgMail.send(msg);
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
        // Skip if email has already been sent
        if (assignment.emailSent === true) {
            logger.log("Email already sent for this assignment", { assignmentId });
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
        // Updated: Use the assignment token to generate a direct link to the game page
        // with query parameter format
        const baseUrl = "https://r2process.com";
        const assignmentLink = `${baseUrl}/play?token=${assignment.linkToken}`;
        logger.log("Generated assignment link", { assignmentLink });
        const msg = {
            to: assignment.studentEmail,
            from: senderEmail.value(),
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
          <p><a href="${assignmentLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Start Activity</a></p>
          <p>If the button doesn't work, copy and paste this link into your browser: ${assignmentLink}</p>
          <p>This link is unique to you. Please do not share it with others.</p>
        </div>
      `,
        };
        // Send email
        await sgMail.send(msg);
        logger.log("Assignment email successfully sent", {
            assignmentId,
            email: assignment.studentEmail
        });
        // Update the assignment document to mark email as sent
        try {
            await admin.firestore().collection('assignments').doc(assignmentId).update({
                emailSent: true
            });
            logger.log("Assignment marked as email sent", { assignmentId });
        }
        catch (updateError) {
            logger.error("Error marking assignment as sent", {
                error: updateError instanceof Error ? updateError.message : String(updateError),
                assignmentId
            });
            // Continue execution even if update fails - email was still sent
        }
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
            // Construct the assignment link with token
            const baseUrl = "https://r2process.com";
            const assignmentLink = `${baseUrl}/play?token=${assignment.linkToken}`;
            // Email content
            const msg = {
                to: assignment.studentEmail,
                from: senderEmail.value(),
                subject: `Reminder: ${assignment.gameTitle || assignment.gameName} Due Soon`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Assignment Due Reminder</h2>
            <p>Hello ${assignment.studentName || "Student"},</p>
            <p>This is a friendly reminder that you have an assignment due soon:</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Activity:</strong> ${assignment.gameTitle || assignment.gameName}</p>
              <p><strong>Due Date:</strong> ${formattedDate}</p>
            </div>
            <p><a href="${assignmentLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Complete Activity</a></p>
            <p>If the button doesn't work, copy and paste this link into your browser: ${assignmentLink}</p>
          </div>
        `,
            };
            // Send email
            try {
                await sgMail.send(msg);
                logger.log(`Reminder email sent to ${assignment.studentEmail} for assignment ${assignment.id}`);
            }
            catch (error) {
                logger.error(`Error sending reminder email for assignment ${assignment.id}:`, error instanceof Error ? error.message : "Unknown error");
            }
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
// HTTP endpoint to manually send an assignment email for testing
exports.testAssignmentEmail = (0, https_1.onRequest)({
    invoker: "public"
}, async (request, response) => {
    var _a;
    try {
        const assignmentId = request.query.assignmentId;
        if (!assignmentId) {
            response.status(400).send({ error: "Missing assignmentId parameter" });
            return;
        }
        // Get the assignment data
        const assignmentDoc = await admin.firestore().collection("assignments").doc(assignmentId).get();
        if (!assignmentDoc.exists) {
            response.status(404).send({ error: "Assignment not found" });
            return;
        }
        const assignment = assignmentDoc.data();
        // Format the due date
        const rawDueDate = (_a = assignment.dueDate) !== null && _a !== void 0 ? _a : assignment.deadline;
        if (!rawDueDate || typeof rawDueDate.toDate !== "function") {
            response.status(400).send({ error: "Invalid deadline format in assignment" });
            return;
        }
        const dueDate = rawDueDate.toDate();
        const formattedDate = dueDate.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });
        // Generate assignment link
        const baseUrl = "https://r2process.com";
        const assignmentLink = `${baseUrl}/play?token=${assignment.linkToken}`;
        // Create email content
        const msg = {
            to: assignment.studentEmail,
            from: senderEmail.value(),
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
          <p><a href="${assignmentLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Start Activity</a></p>
          <p>If the button doesn't work, copy and paste this link into your browser: ${assignmentLink}</p>
          <p>This link is unique to you. Please do not share it with others.</p>
        </div>
      `,
        };
        // Send email
        await sgMail.send(msg);
        // Respond with success
        response.send({
            success: true,
            message: "Test assignment email sent successfully",
            sentTo: assignment.studentEmail,
        });
    }
    catch (error) {
        logger.error("Error sending test assignment email:", error);
        response.status(500).send({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
//# sourceMappingURL=index.js.map