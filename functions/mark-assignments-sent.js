/*
 * This script will mark all assignments in Firestore as having emails sent.
 * Run this with: firebase emulators:exec --only firestore 'node mark-assignments-sent.js'
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'verse-11f2d',
});

async function markAllAssignmentEmailsAsSent() {
  try {
    console.log('Fetching assignments...');
    
    // Get all assignments where emailSent is false or doesn't exist
    const assignmentsRef = admin.firestore().collection('assignments');
    const snapshot = await assignmentsRef.where('emailSent', '==', false).get();
    
    if (snapshot.empty) {
      console.log('No assignments found with emailSent=false');
      return;
    }
    
    console.log(`Found ${snapshot.size} assignments to update.`);
    
    // Update each assignment
    const batch = admin.firestore().batch();
    
    snapshot.forEach(doc => {
      console.log(`Will update assignment: ${doc.id}`);
      batch.update(doc.ref, { emailSent: true });
    });
    
    // Commit the batch
    await batch.commit();
    
    console.log('Successfully marked all assignments as having emails sent.');
  } catch (error) {
    console.error('Error updating assignments:', error);
  }
}

// Run the function
markAllAssignmentEmailsAsSent()
  .then(() => {
    console.log('Operation complete.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Operation failed:', error);
    process.exit(1);
  }); 