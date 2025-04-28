import { defineString } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { ScheduleOptions, onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

// Initialize Firebase
admin.initializeApp();

// Define environment parameters
const emailUser = defineString("EMAIL_USER");
const emailPassword = defineString("EMAIL_PASSWORD");

// Interface for Assignment data
interface Assignment {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  gameId: string;
  gameTitle: string;
  gameName: string;
  deadline: admin.firestore.Timestamp;
  dueDate: admin.firestore.Timestamp;
  completed: boolean;
  score?: number;
  linkToken: string;
  emailSent?: boolean;
}

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
export const helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", { structuredData: true });
  response.send("Hello from Verse Learning!");
});

// HTTP test email function
export const testEmail = onRequest(async (request, response) => {
  try {
    const recipientEmail = request.query.email?.toString() || emailUser.value();
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
  } catch (error) {
    logger.error("Error sending test email:", error);
    response.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Function to send email on assignment creation
export const sendAssignmentEmail = onDocumentCreated("assignments/{assignmentId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    logger.log("No data associated with the event");
    return;
  }
  
  try {
    // Get the assignment data
    const assignment = snapshot.data() as Assignment;
    const assignmentId = event.params.assignmentId;
    
    // Only send email if emailSent is not true
    if (assignment.emailSent === true) {
      logger.log("Email already sent for assignment:", assignmentId);
      return;
    }
    
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
      subject: `New Assignment: ${assignment.gameTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Assignment from Verse Learning</h2>
          <p>Hello ${assignment.studentName},</p>
          <p>You have been assigned a new learning activity:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Activity:</strong> ${assignment.gameTitle}</p>
            <p><strong>Due Date:</strong> ${formattedDate}</p>
          </div>
          <p><a href="${gameLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Start Activity</a></p>
          <p>This link is unique to you. Please do not share it with others.</p>
        </div>
      `,
    };
    
    // Send email
    const transporter = getTransporter();
    await transporter.sendMail(mailOptions);
    
    // Update the assignment document to mark email as sent
    await admin.firestore().collection("assignments").doc(assignmentId).update({
      emailSent: true,
    });
    
    logger.log("Assignment email sent to:", assignment.studentEmail);
  } catch (error) {
    logger.error("Error sending assignment email:", error instanceof Error ? error.message : "Unknown error");
  }
});

// Scheduled function to send reminder emails
const scheduleOptions: ScheduleOptions = {
  schedule: "0 8 * * *", // Run at 8:00 AM every day
  timeZone: "America/New_York",
};

export const sendReminderEmails = onSchedule(scheduleOptions, async () => {
  try {
    const now = admin.firestore.Timestamp.now();
    const tomorrow = admin.firestore.Timestamp.fromDate(
      new Date(now.toMillis() + 24 * 60 * 60 * 1000)
    );
    
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
      const assignment = doc.data() as Assignment;
      
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
          logger.error(
            `Error sending reminder email for assignment ${assignment.id}:`,
            error instanceof Error ? error.message : "Unknown error"
          );
        });
    });
    
    await Promise.all(emailPromises);
    logger.log(`Processed ${assignmentsSnapshot.size} reminder emails`);
  } catch (error) {
    logger.error("Error sending reminder emails:", error instanceof Error ? error.message : "Unknown error");
  }
});
