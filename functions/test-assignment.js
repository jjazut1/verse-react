const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

// Initialize Firebase admin with default credentials
admin.initializeApp();
console.log('Firebase Admin initialized');

async function createTestAssignment() {
  try {
    // Generate a random token for the assignment link
    const linkToken = uuidv4();
    console.log(`Generated link token: ${linkToken}`);
    
    // Create an assignment document
    const assignmentData = {
      id: `test-${Date.now()}`,
      studentId: 'test-student',
      studentName: 'Test Student',
      studentEmail: 'james@learnwithverse.com', // Replace with your email to receive the test
      gameId: 'test-game',
      gameTitle: 'Test Assignment',
      gameName: 'Test Game',
      deadline: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 1 week from now
      dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      completed: false,
      linkToken: linkToken,
      emailSent: false, // This is important - set to false to trigger the function
      createdAt: admin.firestore.Timestamp.now()
    };
    
    // Add the assignment to Firestore
    const assignmentRef = await admin.firestore().collection('assignments').add(assignmentData);
    console.log(`Created test assignment with ID: ${assignmentRef.id}`);
    console.log('Assignment data:', assignmentData);
    
    console.log('This should trigger the sendAssignmentEmail function.');
    console.log('Check the Firebase Functions logs for execution details.');
  } catch (error) {
    console.error('Error creating test assignment:', error);
  }
}

// Execute the function
createTestAssignment()
  .then(() => {
    console.log('Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  }); 