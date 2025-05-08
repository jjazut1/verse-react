// This script uses Firebase Admin SDK to add a test assignment with email link authentication
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { randomUUID } from 'crypto';

// Initialize Firebase Admin
initializeApp({
  projectId: 'verse-11f2d'
});

const db = getFirestore();

async function addTestAssignment() {
  try {
    // Generate a unique token
    const linkToken = `test-token-${randomUUID()}`;
    
    // Create assignment data
    const assignmentData = {
      studentEmail: 'james.alspaugh@sunriseoasisacademy.com',
      studentName: 'Test Student',
      gameId: `test-game-${Date.now()}`,
      gameTitle: `Email Link Auth Test ${new Date().toLocaleTimeString()}`,
      gameName: 'Test Game',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      completed: false,
      linkToken: linkToken,
      emailSent: false,
      useEmailLinkAuth: true, // This is the important flag
      status: 'assigned',
      completedCount: 0,
      createdAt: new Date()
    };
    
    console.log('Adding test assignment with data:', assignmentData);
    
    // Add document to Firestore
    const docRef = await db.collection('assignments').add(assignmentData);
    
    console.log(`Assignment added with ID: ${docRef.id}`);
    console.log('The Firebase function should send an email with authentication link to:', assignmentData.studentEmail);
    
    // Wait for a bit to allow Firebase Functions to process
    console.log('Waiting 10 seconds for Firebase Functions to process...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
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

addTestAssignment().catch(console.error); 