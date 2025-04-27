import { db } from '../config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { generateAndUploadThumbnail } from './thumbnailGenerator';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

/**
 * Utility function to regenerate thumbnails for all games
 * Can be called from a admin panel or developer tools
 */
export async function regenerateAllThumbnails(): Promise<{ success: number; failed: number }> {
  try {
    const gamesSnapshot = await getDocs(collection(db, 'userGameConfigs'));
    
    let successCount = 0;
    let failedCount = 0;
    
    const regenerationPromises = gamesSnapshot.docs.map(async (gameDoc) => {
      const gameData = gameDoc.data();
      const gameId = gameDoc.id;
      
      try {
        // Generate and upload new thumbnail
        const thumbnailUrl = await generateAndUploadThumbnail(gameId, gameData);
        
        // Update the document with the new thumbnail URL
        if (thumbnailUrl) {
          await updateDoc(doc(db, 'userGameConfigs', gameId), {
            thumbnail: thumbnailUrl
          });
          console.log(`Successfully regenerated thumbnail for game: ${gameId}`);
          successCount++;
        } else {
          console.error(`Failed to generate thumbnail for game: ${gameId}`);
          failedCount++;
        }
      } catch (error) {
        console.error(`Error regenerating thumbnail for game ${gameId}:`, error);
        failedCount++;
      }
    });
    
    // Wait for all regeneration attempts to complete
    await Promise.all(regenerationPromises);
    
    return { success: successCount, failed: failedCount };
  } catch (error) {
    console.error('Error in regenerateAllThumbnails:', error);
    throw error;
  }
}

/**
 * Regenerate thumbnail for a specific game
 */
export async function regenerateThumbnail(gameId: string): Promise<boolean> {
  try {
    // Get the game data
    const gameDocRef = doc(db, 'userGameConfigs', gameId);
    const gameDocSnap = await getDoc(gameDocRef);
    
    if (!gameDocSnap.exists()) {
      console.error(`Game with ID ${gameId} not found`);
      return false;
    }
    
    const gameData = gameDocSnap.data();
    
    // Generate and upload new thumbnail
    const thumbnailUrl = await generateAndUploadThumbnail(gameId, gameData);
    
    // Update the document with the new thumbnail URL
    if (thumbnailUrl) {
      await updateDoc(doc(db, 'userGameConfigs', gameId), {
        thumbnail: thumbnailUrl
      });
      console.log(`Successfully regenerated thumbnail for game: ${gameId}`);
      return true;
    } else {
      console.error(`Failed to generate thumbnail for game: ${gameId}`);
      return false;
    }
  } catch (error) {
    console.error(`Error regenerating thumbnail for game ${gameId}:`, error);
    return false;
  }
} 