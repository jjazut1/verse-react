const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

// Initialize Firebase Admin with service account
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/**
 * Creates a test assignment with email link authentication enabled
 * specifically for jjazut1@gmail.com as a beta tester
 */
async function createTestAssignment(teacherEmail, studentEmail, gameId) {
  try {
    // Generate a unique token for the assignment
    const linkToken = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
    
    // Create assignment object
    const assignment = {
      teacherEmail: teacherEmail,
      studentEmail: studentEmail,
      studentName: 'Beta Tester',
      gameId: gameId,
      gameName: 'Beta Test Game',
      gameTitle: 'Passwordless Auth Beta Test',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      dueDate: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      ),
      completed: false,
      linkToken: linkToken,
      emailSent: false,
      useEmailLinkAuth: true, // Enable email link authentication
      beta: true // Mark as beta test assignment
    };
    
    // Add to Firestore
    const docRef = await db.collection('assignments').add(assignment);
    console.log(`Created test assignment with ID: ${docRef.id}`);
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating test assignment:', error);
    throw error;
  }
}

// jjazut1@gmail.com beta test configuration
const teacherEmail = 'jjazut1@gmail.com';
const students = [
  'jamesalspaugh@gmail.com',
  'student1.jjazut@example.com',
  'student2.jjazut@example.com'
];

// Real game IDs from the database - replace with actual game IDs
const testGameIds = [
  'whack-a-mole-template-1',
  'sort-categories-egg-template-1'
];

// Create assignments for jjazut1@gmail.com
async function createJJazutAssignments() {
  console.log(`Creating beta test assignments for teacher: ${teacherEmail}`);
  
  let assignmentCount = 0;
  
  for (const student of students) {
    // Create one assignment per game for each student
    for (const gameId of testGameIds) {
      await createTestAssignment(teacherEmail, student, gameId);
      assignmentCount++;
    }
  }
  
  console.log(`Created ${assignmentCount} beta test assignments for ${teacherEmail}`);
  console.log('Test emails will be sent automatically by the Firebase function');
  
  // Exit process after completion
  process.exit(0);
}

// Run the script
createJJazutAssignments(); 