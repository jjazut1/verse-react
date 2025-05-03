# Alternative Email Solution: SendGrid

If Gmail App Passwords continue to cause authentication issues, here's how to implement SendGrid as an alternative:

## Why SendGrid?

1. **Reliable Delivery**: Designed specifically for transactional emails
2. **Free Tier**: 100 emails/day free
3. **Simple Integration**: Straightforward Node.js library
4. **Better Deliverability**: Less likely to be marked as spam
5. **No Authentication Issues**: Uses API keys instead of passwords

## Implementation Steps

### 1. Create a SendGrid Account

1. Sign up at [SendGrid.com](https://sendgrid.com/)
2. Verify your account
3. Create an API key:
   - Navigate to Settings → API Keys
   - Create a new API key with "Mail Send" permissions
   - Save the generated API key securely

### 2. Install SendGrid in Your Project

```bash
cd functions
npm install @sendgrid/mail
```

### 3. Update Firebase Functions Code

Edit `functions/src/index.ts` to replace nodemailer with SendGrid:

```typescript
import { defineString } from "firebase-functions/params";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { ScheduleOptions, onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import * as sgMail from '@sendgrid/mail';

// Initialize Firebase
admin.initializeApp({
  projectId: 'verse-11f2d',
  credential: admin.credential.applicationDefault()
});

// Define environment parameters
const sendgridApiKey = defineString("SENDGRID_API_KEY");
const senderEmail = defineString("SENDER_EMAIL");

// Initialize SendGrid
sgMail.setApiKey(sendgridApiKey.value());

// Function to send email on assignment creation
export const sendAssignmentEmail = onDocumentCreated("assignments/{assignmentId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    logger.log("No data associated with the event");
    return;
  }

  try {
    const assignment = snapshot.data();
    const assignmentId = event.params.assignmentId;

    // Log assignment creation
    logger.log("Assignment creation event", {
      assignmentId,
      studentEmail: assignment.studentEmail,
    });

    // Skip if email has already been sent
    if (assignment.emailSent === true) {
      logger.log("Email already sent for this assignment", { assignmentId });
      return;
    }

    // Robust date handling
    const rawDueDate = assignment.dueDate ?? assignment.deadline;
    if (!rawDueDate || typeof rawDueDate.toDate !== "function") {
      logger.error("Invalid deadline format", { assignmentId });
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
    const assignmentLink = `${baseUrl}/assignment/${assignment.linkToken}`;
    
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
    
    // Log success
    logger.log("Assignment email successfully sent", {
      assignmentId,
      email: assignment.studentEmail
    });
    
    // Don't update the document here, let the client handle it

  } catch (error) {
    logger.error("Error sending assignment email", {
      error: error instanceof Error ? error.message : String(error),
      assignmentId: event.params.assignmentId,
    });
  }
});

// Implement the reminder emails function similarly
```

### 4. Set Environment Variables

```bash
firebase functions:secrets:set SENDGRID_API_KEY
firebase functions:secrets:set SENDER_EMAIL
```

For the sender email, use a verified sender in your SendGrid account.

### 5. Deploy the Updated Functions

```bash
./deploy-email-functions.sh
```

### 6. Testing the SendGrid Implementation

Create a new assignment and check if:
1. The email is delivered successfully
2. The `emailSent` field is updated to `true`

## Additional Benefits of SendGrid

1. **Email Analytics**: Track opens, clicks, and bounces
2. **Templating**: Create reusable email templates
3. **Scheduled Sending**: Schedule emails for future delivery
4. **Attachments**: Easily attach files to emails
5. **IP Reputation**: Better deliverability rates

This solution should provide a more reliable email experience than trying to use Gmail with App Passwords. 