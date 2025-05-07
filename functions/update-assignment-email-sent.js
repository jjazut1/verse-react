const admin = require('firebase-admin');

// Initialize Firebase Admin with application default credentials
admin.initializeApp({
  projectId: 'verse-11f2d'
});

// Specify the assignment ID to update
const assignmentId = 'xOvbHXZL3ByV888prIRB';

async function markEmailAsSent() {
  try {
    // Update the assignment document
    await admin.firestore()
      .collection('assignments')
      .doc(assignmentId)
      .update({
        emailSent: true
      });
    
    console.log(`Successfully marked assignment ${assignmentId} as emailSent=true`);
  } catch (error) {
    console.error('Error updating assignment:', error);
  }
}

// Run the function
markEmailAsSent()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  }); 