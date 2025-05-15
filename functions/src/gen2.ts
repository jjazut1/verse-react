import { onDocumentCreated } from "firebase-functions/v2/firestore";
import admin from "./firebaseAdmin";
import * as sgMail from '@sendgrid/mail';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'Verse Learning <james@learnwithverse.com>';

console.log("Configuring SendGrid with key:", SENDGRID_API_KEY ? 'Key set' : 'No key set');
if (SENDGRID_API_KEY && SENDGRID_API_KEY.startsWith('SG.')) {
  sgMail.setApiKey(SENDGRID_API_KEY);
  console.log('SendGrid API key configured successfully');
} else {
  console.warn('Invalid SendGrid API Key - emails will not be sent');
  console.warn('Please set your SendGrid API key using: firebase functions:config:set sendgrid.key=SG.YOUR_API_KEY');
}

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

export const sendAssignmentEmail = onDocumentCreated("assignments/{assignmentId}", async (event) => {
  const snapshot = event.data;
  const assignment = snapshot?.data() as Assignment;
  const assignmentId = event.params.assignmentId;
  if (!assignment || assignment.emailSent === true) {
    console.log('No assignment data or email already sent', { assignmentId });
    return;
  }
  if (assignment.useEmailLinkAuth === true) {
    console.log(`Assignment ${assignmentId} uses email link auth, skipping regular email`);
    return;
  }
  try {
    if (!assignment.studentEmail) {
      console.error('No student email in assignment data');
      return;
    }
    const studentEmail = assignment.studentEmail.toLowerCase();
    console.log(`Processing assignment for student: ${studentEmail}, ID: ${assignmentId}`);
    const baseUrl = 'https://r2process.com';
    const assignmentLink = `${baseUrl}/play?token=${assignment.linkToken}`;
    console.log("Generated assignment link", { assignmentLink });
    let formattedDate = 'No due date set';
    try {
      const dueDate = assignment.dueDate?.toDate() || assignment.deadline?.toDate();
      if (dueDate) {
        formattedDate = dueDate.toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
      }
    } catch (e) {
      console.error('Error formatting date:', e);
    }
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
    console.log(`Attempting to send email to ${studentEmail} for assignment ${assignmentId}`);
    await sgMail.send(msg);
    console.log(`Assignment email successfully sent to ${studentEmail}`);
    await admin.firestore().collection('assignments').doc(assignmentId).update({ emailSent: true });
    console.log(`Assignment ${assignmentId} marked as email sent`);
    return;
  } catch (error) {
    console.error(`Error sending assignment email to ${assignment?.studentEmail}:`, error);
    return;
  }
});

export const sendEmailLinkWithAssignment = onDocumentCreated("assignments/{assignmentId}", async (event) => {
  const snapshot = event.data;
  const assignment = snapshot?.data() as Assignment;
  const assignmentId = event.params.assignmentId;
  if (!assignment || assignment.emailSent === true) {
    console.log('No assignment data or email already sent', { assignmentId });
    return;
  }
  if (assignment.useEmailLinkAuth !== true) {
    console.log(`Assignment ${assignmentId} does not use email link auth, skipping`);
    return;
  }
  try {
    if (!assignment.studentEmail) {
      console.error('No student email in assignment data');
      return;
    }
    const studentEmail = assignment.studentEmail.toLowerCase();
    console.log(`Processing assignment with email link for student: ${studentEmail}, ID: ${assignmentId}`);
    const baseUrl = 'https://r2process.com';
    const signInLink = `${baseUrl}/login?assignmentId=${assignmentId}&email=${encodeURIComponent(studentEmail)}&mode=signIn&oobCode=${assignment.linkToken}`;
    console.log("Generated sign-in link with embedded assignment and email", { signInLink });
    let formattedDate = 'No due date set';
    try {
      const dueDate = assignment.dueDate?.toDate() || assignment.deadline?.toDate();
      if (dueDate) {
        formattedDate = dueDate.toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
      }
    } catch (e) {
      console.error('Error formatting date:', e);
    }
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
    console.log(`Attempting to send email link authentication to ${studentEmail} for assignment ${assignmentId}`);
    await sgMail.send(msg);
    console.log(`Assignment email with sign-in link successfully sent to ${studentEmail}`);
    await admin.firestore().collection('assignments').doc(assignmentId).update({ emailSent: true });
    console.log(`Assignment ${assignmentId} marked as email sent`);
    return;
  } catch (error) {
    console.error(`Error sending assignment email with sign-in link to ${assignment?.studentEmail}:`, error);
    return;
  }
}); 