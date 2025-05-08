// This script uses Firebase Admin SDK to add a test assignment with email link authentication
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'verse-11f2d'
});

const db = admin.firestore();

async function addTestAssignment() {
  try {
    // Generate a unique token
    const linkToken = `test-token-${uuidv4()}`;
    
    // Create assignment data
    const assignmentData = {
      studentEmail: 'james.alspaugh@sunriseoasisacademy.com',
      studentName: 'Test Student',
      gameId: `test-game-${Date.now()}`,
      gameTitle: `Email Link Auth Test ${new Date().toLocaleTimeString()}`,
      gameName: 'Test Game',
      dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 7 days from now
      deadline: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 7 days from now
      completed: false,
      linkToken: linkToken,
      emailSent: false,
      useEmailLinkAuth: true, // This is the important flag
      status: 'assigned',
      completedCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    console.log('Adding test assignment with data:', assignmentData);
    
    // Add document to Firestore
    const docRef = await db.collection('assignments').add(assignmentData);
    
    console.log(`Assignment added with ID: ${docRef.id}`);
    console.log('The Firebase function should send an email with authentication link to:', assignmentData.studentEmail);
    
    // Wait for a bit to allow Firebase Functions to process
    console.log('Waiting 15 seconds for Firebase Functions to process...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Check if the email was marked as sent
    const updatedDoc = await docRef.get();
    if (updatedDoc.exists) {
      const updatedData = updatedDoc.data();
      console.log('Assignment status after waiting:', {
        emailSent: updatedData.emailSent,
        updatedAt: updatedData.updatedAt ? updatedData.updatedAt.toDate() : 'not set'
      });
    }
    
    console.log('Done. Check your email inbox for the authentication link.');
  } catch (error) {
    console.error('Error adding test assignment:', error);
  }
}

// Run the function
addTestAssignment().catch(console.error); 