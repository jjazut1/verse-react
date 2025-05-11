// functions/index.ts

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { setupSendGrid, sendEmail } from './sendgridHelper';

// Define secrets
const SENDGRID_API_KEY = defineSecret("SENDGRID_API_KEY");
const SENDER_EMAIL = defineSecret("SENDER_EMAIL");

// Initialize Firebase Admin
admin.initializeApp();

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
  useEmailLinkAuth?: boolean;
}

export const sendAssignmentEmail = onDocumentCreated(
  {
    document: "assignments/{assignmentId}",
    secrets: [SENDGRID_API_KEY, SENDER_EMAIL],
  },
  async (event) => {
    const snapshot = event.data;
    const assignment = snapshot?.data() as Assignment;
    const assignmentId = event.params.assignmentId;

    if (!assignment || assignment.emailSent === true || assignment.useEmailLinkAuth === true) {
      console.log("Skipping email: already sent or uses email link auth", { assignmentId });
      return;
    }

    if (!assignment.studentEmail) {
      console.error("Missing student email");
      return;
    }

    const studentEmail = assignment.studentEmail.toLowerCase();
    const assignmentLink = `https://r2process.com/play?token=${assignment.linkToken}`;

    let formattedDate = "No due date set";
    try {
      const dueDate = assignment.dueDate?.toDate() || assignment.deadline?.toDate();
      if (dueDate) {
        formattedDate = dueDate.toLocaleDateString("en-US", {
          weekday: "long", year: "numeric", month: "long", day: "numeric"
        });
      }
    } catch (e) {
      console.error("Date formatting error", e);
    }

    // Use the helper function to set up SendGrid
    const isSetupSuccessful = setupSendGrid(SENDGRID_API_KEY.value());
    if (!isSetupSuccessful) {
      console.error("Failed to set up SendGrid properly");
      return;
    }

    const msg = {
      to: studentEmail,
      from: {
        email: SENDER_EMAIL.value().trim(),
        name: "Verse Learning"
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
          <p><a href="${assignmentLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Start Activity</a></p>
          <p>If the button doesn't work, copy and paste this link into your browser: ${assignmentLink}</p>
          <p>This link is unique to you. Please do not share it with others.</p>
        </div>
      `,
    };

    // Use the helper function to send the email
    const isEmailSent = await sendEmail(msg);
    if (isEmailSent) {
      await admin.firestore().collection("assignments").doc(assignmentId).update({ emailSent: true });
      console.log(`Email sent and marked for assignment ${assignmentId}`);
    } else {
      console.error(`Failed to send email for assignment ${assignmentId}`);
    }
  }
);

export const sendEmailLinkWithAssignment = onDocumentCreated(
  {
    document: "assignments/{assignmentId}",
    secrets: [SENDGRID_API_KEY, SENDER_EMAIL],
  },
  async (event) => {
    const snapshot = event.data;
    const assignment = snapshot?.data() as Assignment;
    const assignmentId = event.params.assignmentId;

    if (!assignment || assignment.emailSent === true || assignment.useEmailLinkAuth !== true) {
      console.log("Skipping email link auth flow", { assignmentId });
      return;
    }

    if (!assignment.studentEmail) {
      console.error("Missing student email");
      return;
    }

    const studentEmail = assignment.studentEmail.toLowerCase();
    const signInLink = `https://r2process.com/login?assignmentId=${assignmentId}&email=${encodeURIComponent(studentEmail)}&mode=signIn&oobCode=${assignment.linkToken}`;

    let formattedDate = "No due date set";
    try {
      const dueDate = assignment.dueDate?.toDate() || assignment.deadline?.toDate();
      if (dueDate) {
        formattedDate = dueDate.toLocaleDateString("en-US", {
          weekday: "long", year: "numeric", month: "long", day: "numeric"
        });
      }
    } catch (e) {
      console.error("Date formatting error", e);
    }

    const isSetupSuccessful = setupSendGrid(SENDGRID_API_KEY.value());
    if (!isSetupSuccessful) {
      console.error("Failed to set up SendGrid properly");
      return;
    }

    const msg = {
      to: studentEmail,
      from: {
        email: SENDER_EMAIL.value().trim(),
        name: "Verse Learning"
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
          <p><a href="${signInLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Start Activity</a></p>
          <p>If the button doesn't work, copy and paste this link into your browser: ${signInLink}</p>
          <p>This link is unique to you. Please do not share it with others.</p>
          <p><strong>Note:</strong> Clicking the link will automatically sign you in - no password needed!</p>
        </div>
      `,
    };

    const isEmailSent = await sendEmail(msg);
    if (isEmailSent) {
      await admin.firestore().collection("assignments").doc(assignmentId).update({ emailSent: true });
      console.log(`Sign-in email sent and marked for assignment ${assignmentId}`);
    } else {
      console.error(`Failed to send email for assignment ${assignmentId}`);
    }
  }
);