const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

// Initialize Firebase Admin with explicit project ID
admin.initializeApp({
  projectId: 'verse-11f2d'
});

// Test data
const studentEmail = 'test@verselearning.com'; // Use a valid test email
const studentName = 'Test Student';
const gameTitle = 'Test Game - Email Link Auth';

/**
 * Creates a test assignment with email link authentication
 */
async function createTestAssignment() {
  try {
    // Generate a unique link token
    const linkToken = uuidv4();
    
    // Create an assignment document with the useEmailLinkAuth flag
    const assignmentData = {
      studentEmail: studentEmail,
      studentName: studentName,
      gameId: 'test-game-id',
      gameTitle: gameTitle,
      gameName: 'Test Game',
      deadline: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 7 days from now
      dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 7 days from now
      completed: false,
      linkToken: linkToken,
      emailSent: false,
      useEmailLinkAuth: true, // This is the important flag
      status: 'assigned',
      completedCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Add to Firestore
    const docRef = await admin.firestore().collection('assignments').add(assignmentData);
    
    console.log('Test assignment created with ID:', docRef.id);
    console.log('For student:', studentEmail);
    console.log('The Firebase function should automatically send an email with authentication link');
    console.log('Check your email for the authentication link');
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating test assignment:', error);
    throw error;
  }
}

// Run the test
createTestAssignment()
  .then(assignmentId => {
    console.log('Test completed successfully. Assignment ID:', assignmentId);
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  }); 