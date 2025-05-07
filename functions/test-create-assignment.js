const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

// Initialize Firebase Admin (using application default credentials)
admin.initializeApp({
  projectId: 'verse-11f2d',
  credential: admin.credential.applicationDefault()
});

async function createTestAssignment() {
  try {
    // Generate a unique link token for the assignment
    const linkToken = uuidv4();
    
    // Create a test assignment
    const assignmentData = {
      teacherId: "test-teacher-123",
      studentEmail: "james@learnwithverse.com", // Replace with test email
      gameId: "test-game-123",
      gameName: "Test Game",
      gameType: "sort-categories-egg",
      deadline: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)) // 7 days from now
      ),
      timesRequired: 1,
      linkToken,
      status: "assigned",
      completedCount: 0,
      createdAt: admin.firestore.Timestamp.now(),
      emailSent: false
    };
    
    // Create assignment document in Firestore
    const docRef = await admin.firestore().collection('assignments').add(assignmentData);
    
    console.log('Test assignment created with ID:', docRef.id);
    console.log('Assignment data:', assignmentData);
    console.log('Check your email and Firebase Functions logs to see if the email was sent.');
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating test assignment:', error);
    throw error;
  }
}

// Run the function
createTestAssignment()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to create test assignment:', error);
    process.exit(1);
  }); 