import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Assignment, Attempt } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Get all assignments for a specific teacher
export const getTeacherAssignments = async (teacherId: string): Promise<Assignment[]> => {
  try {
    const assignmentsRef = collection(db, 'assignments');
    const q = query(assignmentsRef, where('teacherId', '==', teacherId));
    
    const querySnapshot = await getDocs(q);
    
    const assignments: Assignment[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      assignments.push({
        id: doc.id,
        ...data,
      } as Assignment);
    });
    
    return assignments;
  } catch (error) {
    console.error('Error getting teacher assignments:', error);
    throw error;
  }
};

// Mark assignment email as sent
export const markAssignmentEmailAsSent = async (assignmentId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'assignments', assignmentId);
    await updateDoc(docRef, { emailSent: true });
  } catch (error) {
    console.error('Error marking assignment email as sent:', error);
    throw error;
  }
};

// Get a single assignment by ID
export const getAssignment = async (assignmentId: string): Promise<Assignment | null> => {
  try {
    const docRef = doc(db, 'assignments', assignmentId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as Assignment;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting assignment:', error);
    throw error;
  }
};

// Create a new assignment
export const createAssignment = async (assignmentData: Omit<Assignment, 'id' | 'linkToken' | 'status' | 'completedCount' | 'createdAt'>): Promise<string> => {
  try {
    // Generate a unique link token for the assignment
    const linkToken = uuidv4();
    
    // Prepare complete assignment data
    const completeAssignmentData = {
      ...assignmentData,
      linkToken,
      status: 'assigned',
      completedCount: 0,
      createdAt: Timestamp.now(),
      // Flag to track if email is sent - this will be used by the Cloud Function
      emailSent: false
    };
    
    // Create assignment document in Firestore
    const docRef = await addDoc(collection(db, 'assignments'), completeAssignmentData);
    
    console.log('Assignment created with ID:', docRef.id);
    console.log('Email will be sent automatically via Firebase Cloud Functions');
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating assignment:', error);
    throw error;
  }
};

// Update an existing assignment
export const updateAssignment = async (assignmentId: string, updatedData: Partial<Assignment>): Promise<void> => {
  try {
    const docRef = doc(db, 'assignments', assignmentId);
    await updateDoc(docRef, updatedData);
  } catch (error) {
    console.error('Error updating assignment:', error);
    throw error;
  }
};

// Delete an assignment
export const deleteAssignment = async (assignmentId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'assignments', assignmentId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting assignment:', error);
    throw error;
  }
};

// Get all attempts for a specific assignment
export const getAssignmentAttempts = async (assignmentId: string): Promise<Attempt[]> => {
  try {
    const attemptsRef = collection(db, 'attempts');
    const q = query(attemptsRef, where('assignmentId', '==', assignmentId));
    
    const querySnapshot = await getDocs(q);
    
    const attempts: Attempt[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      attempts.push({
        id: doc.id,
        ...data,
      } as Attempt);
    });
    
    return attempts;
  } catch (error) {
    console.error('Error getting assignment attempts:', error);
    throw error;
  }
};

// Get attempts for a specific student and assignment
export const getStudentAttempts = async (studentId: string, assignmentId: string): Promise<Attempt[]> => {
  try {
    const attemptsRef = collection(db, 'attempts');
    const q = query(
      attemptsRef, 
      where('studentId', '==', studentId),
      where('assignmentId', '==', assignmentId)
    );
    
    const querySnapshot = await getDocs(q);
    
    const attempts: Attempt[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      attempts.push({
        id: doc.id,
        ...data,
      } as Attempt);
    });
    
    return attempts;
  } catch (error) {
    console.error('Error getting student attempts:', error);
    throw error;
  }
};

// Create a new attempt
export const createAttempt = async (attemptData: Omit<Attempt, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'attempts'), {
      ...attemptData,
      timestamp: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating attempt:', error);
    throw error;
  }
};

// Get assignment by token
export const getAssignmentByToken = async (token: string): Promise<Assignment | null> => {
  try {
    const assignmentsRef = collection(db, 'assignments');
    const q = query(assignmentsRef, where('linkToken', '==', token));
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    // There should only be one assignment with this token
    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as Assignment;
  } catch (error) {
    console.error('Error getting assignment by token:', error);
    throw error;
  }
}; 