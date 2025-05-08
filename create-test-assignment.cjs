const admin = require('firebase-admin');

// Initialize Firebase Admin using the application default credentials
admin.initializeApp({
  projectId: 'verse-11f2d',
  credential: admin.credential.applicationDefault()
});

// Create a test assignment with email link authentication enabled
async function createTestAssignment() {
  try {
    // Generate a unique token for the assignment
    const linkToken = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
    
    const assignmentData = {
      studentEmail: 'james.alspaugh@sunriseoasisacademy.com', // Replace with your email
      studentName: 'Test Student',
      gameId: 'test-game-001',
      gameTitle: 'Test Game - Email Link Auth',
      gameName: 'Test Game',
      deadline: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      completed: false,
      linkToken: linkToken,
      emailSent: false,
      useEmailLinkAuth: true, // This flag enables email link authentication
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    console.log('Creating test assignment with data:', assignmentData);
    
    // Add to Firestore
    const docRef = await admin.firestore().collection('assignments').add(assignmentData);
    
    console.log('Test assignment created with ID:', docRef.id);
    console.log('Email will be sent to:', assignmentData.studentEmail);
    console.log('The Firebase function should automatically send an email with authentication link');
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating test assignment:', error);
    throw error;
  }
}

// Run the test
createTestAssignment()
  .then(assignmentId => {
    console.log('Assignment created successfully!');
    console.log('Assignment ID:', assignmentId);
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed to create assignment:', error);
    process.exit(1);
  }); 