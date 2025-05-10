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
      emailSent: false,
      // Explicitly disable email link authentication to use the simple token approach
      useEmailLinkAuth: false
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
export const createAttempt = async (assignmentId: string, attemptData: {
  duration: number;
  score?: number;
  results?: any;
  studentEmail: string;
  studentName: string;
}): Promise<string> => {
  try {
    // Validate inputs to ensure we don't send invalid data to Firestore
    if (!assignmentId) {
      throw new Error("Missing assignmentId parameter");
    }
    
    // Ensure we have valid values for all fields or provide defaults
    const validatedData = {
      assignmentId,
      studentEmail: attemptData.studentEmail || "unknown@email.com",
      studentName: attemptData.studentName || "Unknown Student",
      duration: typeof attemptData.duration === 'number' ? attemptData.duration : 0,
      // Ensure score is a valid number or null (not undefined)
      score: typeof attemptData.score === 'number' && !isNaN(attemptData.score) ? attemptData.score : null,
      // Ensure results is a valid object (not undefined)
      results: attemptData.results || null,
      timestamp: Timestamp.now(),
    };
    
    console.log("Creating attempt with validated data:", validatedData);
    
    const docRef = await addDoc(collection(db, 'attempts'), validatedData);
    console.log("Successfully created attempt with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating attempt:', error);
    // Rethrow the error for handling upstream
    throw error;
  }
};

// Get assignment by token
export const getAssignmentByToken = async (token: string): Promise<Assignment | null> => {
  if (!token) {
    console.error("getAssignmentByToken: Missing token parameter");
    return null;
  }

  try {
    console.log(`getAssignmentByToken: Searching for assignment with token: ${token}`);
    const assignmentsRef = collection(db, 'assignments');
    const q = query(assignmentsRef, where('linkToken', '==', token));
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.warn(`getAssignmentByToken: No assignment found with token: ${token}`);
      return null;
    }
    
    // There should only be one assignment with this token
    const doc = querySnapshot.docs[0];
    console.log(`getAssignmentByToken: Found assignment with ID: ${doc.id}`);
    
    return {
      id: doc.id,
      ...doc.data(),
    } as Assignment;
  } catch (error) {
    console.error(`getAssignmentByToken: Error searching for token ${token}:`, error);
    throw error;
  }
};

// Get the count of attempts for a specific assignment
export const getAssignmentAttemptsCount = async (assignmentId: string): Promise<number> => {
  try {
    const attemptsRef = collection(db, 'attempts');
    const q = query(attemptsRef, where('assignmentId', '==', assignmentId));
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error getting assignment attempts count:', error);
    throw error;
  }
};

// Update the completed count based on actual attempts
export const updateCompletedCountFromAttempts = async (assignmentId: string): Promise<void> => {
  try {
    // Get the current assignment to check timesRequired
    const assignment = await getAssignment(assignmentId);
    if (!assignment) {
      throw new Error(`Assignment not found with ID: ${assignmentId}`);
    }
    
    // Count the actual attempts
    const attemptsCount = await getAssignmentAttemptsCount(assignmentId);
    
    // Update the assignment with the accurate count
    const isNowCompleted = attemptsCount >= assignment.timesRequired;
    
    await updateAssignment(assignmentId, {
      completedCount: attemptsCount,
      lastCompletedAt: Timestamp.now(),
      status: isNowCompleted ? 'completed' : assignment.status === 'assigned' ? 'started' : assignment.status
    });
    
    console.log(`Updated assignment ${assignmentId} completedCount to ${attemptsCount} based on actual attempts`);
  } catch (error) {
    console.error('Error updating completed count from attempts:', error);
    throw error;
  }
};

/**
 * Get a game config and assignment using a token
 * @param token The assignment token
 * @returns The game config and assignment
 */
export const getGameConfigByToken = async (token: string) => {
  try {
    // First get the assignment
    const assignment = await getAssignmentByToken(token);
    
    if (!assignment || !assignment.gameId) {
      console.error(`getGameConfigByToken: Assignment not found or missing gameId for token: ${token}`);
      return null;
    }
    
    // Get the game config
    const gameConfigRef = doc(db, 'game_configs', assignment.gameId);
    const gameConfigSnap = await getDoc(gameConfigRef);
    
    if (!gameConfigSnap.exists()) {
      console.error(`getGameConfigByToken: Game config not found for ID: ${assignment.gameId}`);
      return null;
    }
    
    const gameConfig = { 
      id: gameConfigSnap.id, 
      ...gameConfigSnap.data() 
    };
    
    return {
      gameConfig,
      assignment
    };
  } catch (error) {
    console.error(`getGameConfigByToken: Error getting game config for token ${token}:`, error);
    throw error;
  }
}; 