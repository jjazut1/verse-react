import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * This utility function syncs a categoryTemplate with its corresponding userGameConfig
 * to ensure they have the same data structure and fields.
 * 
 * @param categoryTemplateId The ID of the categoryTemplate document to update
 * @param gameTitle The title of the game to find in userGameConfigs (e.g., "short a v5")
 */
export const syncTemplateWithGameConfig = async (
  categoryTemplateId: string,
  gameTitle: string
) => {
  try {
    console.log(`Starting sync for template ${categoryTemplateId} with game title "${gameTitle}"...`);
    
    // First get the userGameConfig with the matching title
    const userGameConfigsRef = collection(db, 'userGameConfigs');
    const userGameConfigQuery = query(userGameConfigsRef, where('title', '==', gameTitle), where('type', '==', 'whack-a-mole'));
    const userGameConfigSnapshot = await getDocs(userGameConfigQuery);
    
    if (userGameConfigSnapshot.empty) {
      console.error(`No userGameConfig found with title "${gameTitle}"`);
      return false;
    }
    
    console.log(`Found ${userGameConfigSnapshot.size} matching userGameConfigs`);
    
    // Get the first matching userGameConfig
    const userGameConfigDoc = userGameConfigSnapshot.docs[0];
    const userGameConfig = userGameConfigDoc.data();
    
    console.log('UserGameConfig data:', userGameConfig);
    
    // Get the words from categories (if available)
    let words: string[] = [];
    if (userGameConfig.categories && Array.isArray(userGameConfig.categories)) {
      userGameConfig.categories.forEach((category: any) => {
        if (category.words && Array.isArray(category.words)) {
          words = words.concat(category.words);
        }
      });
    }
    
    // If no words found in categories, try to use existing words in the template
    if (words.length === 0) {
      const categoryTemplateRef = doc(db, 'categoryTemplates', categoryTemplateId);
      const categoryTemplateSnapshot = await getDocs(query(collection(db, 'categoryTemplates'), where('title', '==', gameTitle)));
      
      if (!categoryTemplateSnapshot.empty) {
        const categoryTemplateData = categoryTemplateSnapshot.docs[0].data();
        if (categoryTemplateData.words && Array.isArray(categoryTemplateData.words)) {
          words = categoryTemplateData.words;
        }
      }
    }
    
    // Create the update data
    const updateData = {
      title: userGameConfig.title,
      type: 'whack-a-mole',
      words: words,
      gameTime: userGameConfig.gameTime || 30,
      pointsPerHit: userGameConfig.pointsPerHit || 10,
      penaltyPoints: userGameConfig.penaltyPoints || 5,
      bonusPoints: userGameConfig.bonusPoints || 10,
      bonusThreshold: userGameConfig.bonusThreshold || 3,
      speed: userGameConfig.speed || 2,
      instructions: userGameConfig.instructions || '',
      share: userGameConfig.share || false,
      // Preserve existing userId and email
    };
    
    console.log('Update data to apply:', updateData);
    
    // Update the categoryTemplate
    await updateDoc(doc(db, 'categoryTemplates', categoryTemplateId), updateData);
    
    console.log(`Successfully updated categoryTemplate ${categoryTemplateId}`);
    return true;
  } catch (error) {
    console.error('Error syncing template with game config:', error);
    return false;
  }
};

/**
 * Run this in your browser console to sync a template:
 * 
 * import { syncTemplateWithGameConfig } from './utils/updateTemplates';
 * syncTemplateWithGameConfig('pn24sw2vaDmdGjzcbkCb', 'short a v5');
 */ 