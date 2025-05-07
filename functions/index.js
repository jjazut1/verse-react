/**
 * Firebase Cloud Functions for Verse Learning Platform
 * Simple version for direct deployment
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

// Initialize Firebase
admin.initializeApp();

// Get environment variables from Firebase config
const SENDGRID_API_KEY = functions.config().sendgrid?.key || '';
const SENDER_EMAIL = functions.config().email?.sender || 'Verse Learning <james@learnwithverse.com>';

// Initialize SendGrid with the key
console.log("Configuring SendGrid with key:", SENDGRID_API_KEY ? 'Key set' : 'No key set');
if (SENDGRID_API_KEY && SENDGRID_API_KEY.startsWith('SG.')) {
  sgMail.setApiKey(SENDGRID_API_KEY);
  console.log('SendGrid API key configured successfully');
} else {
  console.warn('Invalid SendGrid API Key - emails will not be sent');
  console.warn('Please set your SendGrid API key using: firebase functions:config:set sendgrid.key=SG.YOUR_API_KEY');
}

/**
 * Cloud Function that sends an assignment email when a new assignment is created
 */
exports.sendAssignmentEmail = functions.firestore
  .document('assignments/{assignmentId}')
  .onCreate(async (snapshot, context) => {
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
      
      // Base URL and assignment link
      const baseUrl = 'https://r2process.com';
      const assignmentLink = `${baseUrl}/play?token=${assignment.linkToken}`;
      console.log("Generated assignment link", { assignmentLink });
      
      // Format the due date
      let formattedDate = 'No due date set';
      try {
        const dueDate = assignment.dueDate?.toDate() || assignment.deadline?.toDate();
        if (dueDate) {
          formattedDate = dueDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        }
      } catch (e) {
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
            <p><a href="${assignmentLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Start Activity</a></p>
            <p>If the button doesn't work, copy and paste this link into your browser: ${assignmentLink}</p>
            <p>This link is unique to you. Please do not share it with others.</p>
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
    } catch (error) {
      console.error(`Error sending assignment email to ${assignment?.studentEmail}:`, error);
      return null;
    }
  });

/* 
 * HTTP endpoint to test email functionality (compatible with Gen 1 Functions)
 * Temporarily commented out to avoid deployment issues
 */
/*
exports.testEmail = functions.https.onRequest(async (request, response) => {
  try {
    const recipientEmail = request.query.email?.toString() || SENDER_EMAIL;
    
    // Email content
    const msg = {
      to: recipientEmail,
      from: SENDER_EMAIL,
      subject: "Test Email from Verse Learning",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Test Email</h2>
          <p>This is a test email from Verse Learning.</p>
          <p>If you're seeing this, email functionality is working correctly!</p>
          <p>SendGrid API Key status: ${SENDGRID_API_KEY && SENDGRID_API_KEY.startsWith('SG.') ? 'Configured' : 'Not configured'}</p>
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
  } catch (error) {
    console.error("Error sending test email:", error);
    response.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
*/ 