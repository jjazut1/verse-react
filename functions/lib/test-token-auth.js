const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

// Initialize Firebase Admin (using application default credentials)
admin.initializeApp({
  projectId: 'verse-11f2d',
  credential: admin.credential.applicationDefault()
});

/**
 * Test function to create a token for testing the Token + Firebase Login flow
 */
async function createTestToken() {
  try {
    // Get the test assignment
    const assignmentsSnapshot = await admin.firestore()
      .collection('assignments')
      .limit(1)
      .get();
    
    if (assignmentsSnapshot.empty) {
      console.error('No assignments found to test with');
      return null;
    }
    
    // Use the first assignment for testing
    const assignment = assignmentsSnapshot.docs[0];
    const assignmentId = assignment.id;
    const assignmentData = assignment.data();
    const studentEmail = assignmentData.studentEmail;
    
    console.log(`Using assignment: ${assignmentId} for student: ${studentEmail}`);
    
    // Generate token
    const token = uuidv4();
    
    // Set token expiration (14 days from now)
    const expiresAt = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    );
    
    // Store token in Firestore
    await admin.firestore().collection('assignmentTokens').doc(token).set({
      studentEmail,
      assignmentId,
      expiresAt,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      used: false,
    });
    
    // Generate the link that would be used in the email
    const baseUrl = 'https://r2process.com';
    const assignmentLink = `${baseUrl}/assignment-access?token=${token}`;
    
    console.log('Test token created successfully!');
    console.log('-----------------------------------');
    console.log(`Token: ${token}`);
    console.log(`Assignment Link: ${assignmentLink}`);
    console.log(`Student Email: ${studentEmail}`);
    console.log(`Assignment ID: ${assignmentId}`);
    console.log(`Expires At: ${expiresAt.toDate().toLocaleString()}`);
    console.log('-----------------------------------');
    console.log('To test:');
    console.log('1. Open the Assignment Link in a browser');
    console.log('2. The system should automatically log you in');
    console.log('3. You should be redirected to the assignment');
    
    return token;
  } catch (error) {
    console.error('Error creating test token:', error);
    return null;
  }
}

// Run the test function
createTestToken()
  .then(() => {
    console.log('Test script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test script failed:', error);
    process.exit(1);
  }); 