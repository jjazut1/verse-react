# Next Steps to Complete Email Functionality

We've successfully set up the Firebase Cloud Functions for email notifications when assignments are created and for sending reminders before deadlines. Here are the final steps to complete the setup:

## 1. Provide a Real Gmail App Password

Before everything works, you'll need to replace the placeholder password with a real Gmail App Password:

1. Follow the instructions in the README.md file to create an App Password for your Gmail account
2. Update the EMAIL_PASSWORD secret with your actual 16-character App Password:
   ```
   echo "your-actual-16-character-app-password" | firebase functions:secrets:set EMAIL_PASSWORD
   ```

## 2. Test the Email Functionality

The easiest way to test if emails are working properly:

1. Create a new assignment in the app (by clicking the chart icon in the "Free Games" column)
2. Fill in the student's email address, deadline, and other required fields
3. Submit the form to create the assignment
4. Check the email address you specified to see if you received the assignment notification

## 3. Check Firebase Functions Logs

If emails are still not working, check the Firebase Functions logs to see detailed error messages:

```
firebase functions:log
```

Look for errors related to email sending, such as authentication failures or connectivity issues.

## 4. Update Domain URL (if needed)

If you're deploying to a different domain (not r2process.com), you'll need to update the baseUrl in the functions:

1. Open `functions/src/index.ts`
2. Find the lines with `const baseUrl = "https://r2process.com";`
3. Update this to your actual domain URL
4. Deploy the functions again using `./deploy-email-functions.sh`

## 5. Test Reminder Emails

The reminder emails will be sent automatically every day at 8:00 AM ET for assignments due within the next 24 hours. To test this:

1. Create an assignment with a deadline that's within 24 hours
2. Wait for the scheduled function to run (or you can trigger it manually in the Firebase console)
3. Check the student's email to see if they received a reminder

## 6. Further Customization

You can further customize the email templates in `functions/src/index.ts` to match your branding or include additional information.

---

That's it! Once you've completed these steps, your application will be fully set up to send email notifications for assignments automatically.

# Next Steps: Single Authentication Email Flow

The current implementation sends two separate emails to new users:
1. An assignment email with the game link
2. A Firebase authentication email when they try to access the game

## The Solution

The ideal user experience is to send a **single email** that both authenticates the user and directs them to their assignment. We've developed the code for this feature but encountered deployment issues.

Here's the core function that needs to be implemented:

```javascript
/**
 * Cloud Function that sends a combined authentication+assignment email to new users
 * or a regular assignment email to existing users.
 */
exports.sendCombinedAssignmentEmail = functions.firestore
  .onDocumentCreated('assignments/{assignmentId}', async (event) => {
    // Get the assignment data
    const snapshot = event.data;
    if (!snapshot) return null;
    
    const assignment = snapshot.data();
    const assignmentId = event.params.assignmentId;
    
    // Skip if already sent
    if (assignment.emailSent === true) return null;
    
    try {
      // Check if user exists in database
      const userQuery = await admin.firestore()
        .collection('users')
        .where('email', '==', assignment.studentEmail.toLowerCase())
        .limit(1)
        .get();
      
      const isExistingUser = !userQuery.empty;
      
      // Default link (for existing users)
      const baseUrl = 'https://r2process.com';
      let assignmentLink = `${baseUrl}/play?token=${assignment.linkToken}`;
      let authMessage = '';
      
      // For new users, generate a Firebase Auth link
      if (!isExistingUser) {
        try {
          // Set up email link settings
          const actionCodeSettings = {
            url: assignmentLink,
            handleCodeInApp: true
          };
          
          // Generate auth link that redirects to the assignment
          const signInLink = await admin.auth().generateSignInWithEmailLink(
            assignment.studentEmail,
            actionCodeSettings
          );
          
          // Use the authentication link in place of the normal link
          assignmentLink = signInLink;
          
          // Add a pre-registered user record
          const newUserId = admin.firestore().collection('users').doc().id;
          await admin.firestore().collection('users').doc(newUserId).set({
            email: assignment.studentEmail.toLowerCase(),
            role: 'user',
            status: 'invited',
            authComplete: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: assignment.teacherId || 'system'
          });
          
          // Special message for new users
          authMessage = `<p><strong>Note:</strong> This is your first time using our system. 
          Clicking the button below will both authenticate you and take you to your assignment. No separate login required!</p>`;
        } catch (error) {
          console.error('Error creating auth link:', error);
          // Fall back to regular link
          assignmentLink = `${baseUrl}/play?token=${assignment.linkToken}`;
        }
      }
      
      // Send the email with the appropriate link
      await sendEmail({
        to: assignment.studentEmail,
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
            ${authMessage}
            <p><a href="${assignmentLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Start Activity</a></p>
            <p>If the button doesn't work, copy and paste this link into your browser: ${assignmentLink}</p>
            <p>This link is unique to you. Please do not share it with others.</p>
          </div>
        `
      });
      
      // Mark email as sent
      await admin.firestore().collection('assignments').doc(assignmentId).update({
        emailSent: true
      });
    } catch (error) {
      console.error('Error sending combined email:', error);
    }
  });
```

## Implementation Steps

1. **Fix Deployment Issues**:
   - Work with a Firebase expert to properly deploy the function using the correct API version
   - Ensure SendGrid API keys are properly configured
   - Consider [Firebase Support](https://firebase.google.com/support) if needed

2. **Test with Real Users**:
   - Create test assignments for new users
   - Verify they receive a single email
   - Confirm authentication + assignment access works in one step

3. **Monitor Performance**:
   - Set up logging to track authentication success rates
   - Monitor email delivery and open rates
   - Compare completion rates between old and new flow

## Expected Benefits

1. **Improved User Experience**:
   - New users only get one email, not two
   - No confusion or friction in the authentication process
   - Faster access to assignments

2. **Higher Completion Rates**:
   - Fewer drop-offs during the authentication process
   - Clearer instructions for new users
   - More streamlined experience

3. **Reduced Support Requests**:
   - Fewer questions about the second authentication email
   - Clearer process for students and teachers 