import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getAssignmentByToken } from './assignmentService';
import { Assignment } from '../types';

// Get game configuration by assignment token
export const getGameConfigByToken = async (token: string) => {
  if (!token) {
    console.error("getGameConfigByToken: Missing token parameter");
    throw new Error("Invalid token");
  }

  try {
    console.log(`getGameConfigByToken: Processing token: ${token}`);
    
    // First, get the assignment using the token
    const assignment = await getAssignmentByToken(token);
    
    if (!assignment) {
      console.error(`getGameConfigByToken: No assignment found for token: ${token}`);
      throw new Error("Assignment not found");
    }
    
    // Get the game configuration using the gameId from the assignment
    const gameConfigRef = doc(db, 'userGameConfigs', assignment.gameId);
    const gameConfigSnap = await getDoc(gameConfigRef);
    
    if (!gameConfigSnap.exists()) {
      console.error(`getGameConfigByToken: No game configuration found for gameId: ${assignment.gameId}`);
      throw new Error("Game configuration not found");
    }
    
    const gameConfig = {
      id: gameConfigSnap.id,
      ...gameConfigSnap.data()
    };
    
    console.log(`getGameConfigByToken: Successfully found game config: ${gameConfig.id} for token: ${token}`);
    
    // Return both the game configuration and the assignment
    return {
      gameConfig,
      assignment
    };
  } catch (error) {
    console.error('Error getting game config by token:', error);
    throw error;
  }
};

// Additional game service functions can be added here 