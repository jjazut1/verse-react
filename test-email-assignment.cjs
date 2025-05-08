const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'verse-11f2d'
});

const db = admin.firestore();

async function createTestAssignment() {
  try {
    // Create a test assignment document with auth link
    const testAssignmentData = {
      studentEmail: 'james.alspaugh@sunriseoasisacademy.com',
      studentName: 'Test Student',
      gameId: `test-game-${Date.now()}`,
      gameTitle: `Test Email Link Auth - ${new Date().toLocaleTimeString()}`,
      gameName: 'Test Game',
      dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      deadline: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      completed: false,
      linkToken: `test-token-${Date.now()}`,
      emailSent: false,
      useEmailLinkAuth: true,
      status: 'assigned',
      completedCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    console.log('Creating test assignment...');
    const docRef = await db.collection('assignments').add(testAssignmentData);
    console.log(`Assignment document created with ID: ${docRef.id}`);
    console.log('Student Email:', testAssignmentData.studentEmail);
    console.log('Game Title:', testAssignmentData.gameTitle);
    
    // Wait for the cloud function to process
    console.log('\nWaiting for cloud function to process (15 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Check if the document was updated
    const updatedDoc = await docRef.get();
    if (updatedDoc.exists) {
      const data = updatedDoc.data();
      console.log('\nAssignment status after processing:');
      console.log('- Email Sent:', data.emailSent);
      console.log('- Updated At:', data.updatedAt ? data.updatedAt.toDate() : 'N/A');
    } else {
      console.log('Document no longer exists!');
    }
    
    console.log('\nCheck your email for the authentication link.');
  } catch (error) {
    console.error('Error creating test assignment:', error);
  } finally {
    process.exit();
  }
}

// Run the function
createTestAssignment(); 