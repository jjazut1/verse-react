import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  getDoc 
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * This utility function syncs a categoryTemplate with its corresponding userGameConfig
 * to ensure they have the same data structure and fields.
 * 
 * @param categoryTemplateId The ID of the categoryTemplate document to update
 * @param gameTitle The title of the game to find in userGameConfigs (e.g., "short a v5")
 * @param gameType Optional game type to filter by (e.g., 'whack-a-mole' or 'sort-categories-egg')
 */
export const syncTemplateWithGameConfig = async (
  categoryTemplateId: string,
  gameTitle: string,
  gameType?: string
) => {
  try {
    console.log(`Starting sync for template ${categoryTemplateId} with game title "${gameTitle}"...`);
    
    // First get the categoryTemplate to determine the type if not provided
    const categoryTemplateDoc = await getDoc(doc(db, 'categoryTemplates', categoryTemplateId));
    if (!categoryTemplateDoc.exists()) {
      console.error(`CategoryTemplate with ID ${categoryTemplateId} not found`);
      return false;
    }
    
    const categoryTemplateData = categoryTemplateDoc.data();
    const templateType = gameType || categoryTemplateData.type || 'whack-a-mole';
    
    console.log(`Template type: ${templateType}`);
    
    // Get the userGameConfig with the matching title and type
    const userGameConfigsRef = collection(db, 'userGameConfigs');
    const userGameConfigQuery = query(
      userGameConfigsRef, 
      where('title', '==', gameTitle), 
      where('type', '==', templateType)
    );
    const userGameConfigSnapshot = await getDocs(userGameConfigQuery);
    
    if (userGameConfigSnapshot.empty) {
      console.error(`No userGameConfig found with title "${gameTitle}" and type "${templateType}"`);
      return false;
    }
    
    console.log(`Found ${userGameConfigSnapshot.size} matching userGameConfigs`);
    
    // Get the first matching userGameConfig
    const userGameConfigDoc = userGameConfigSnapshot.docs[0];
    const userGameConfig = userGameConfigDoc.data();
    
    console.log('UserGameConfig data:', userGameConfig);
    
    // Prepare the update data based on game type
    let updateData: Record<string, any> = {
      title: userGameConfig.title,
      type: templateType,
    };
    
    // Add common fields that apply to both game types
    if (userGameConfig.gameTime !== undefined) updateData.gameTime = userGameConfig.gameTime;
    if (userGameConfig.pointsPerHit !== undefined) updateData.pointsPerHit = userGameConfig.pointsPerHit;
    if (userGameConfig.penaltyPoints !== undefined) updateData.penaltyPoints = userGameConfig.penaltyPoints;
    if (userGameConfig.bonusPoints !== undefined) updateData.bonusPoints = userGameConfig.bonusPoints;
    if (userGameConfig.bonusThreshold !== undefined) updateData.bonusThreshold = userGameConfig.bonusThreshold;
    if (userGameConfig.speed !== undefined) updateData.speed = userGameConfig.speed;
    if (userGameConfig.instructions !== undefined) updateData.instructions = userGameConfig.instructions;
    if (userGameConfig.share !== undefined) updateData.share = userGameConfig.share;
    
    // Add game-specific fields
    if (templateType === 'whack-a-mole') {
      // Handle whack-a-mole specific data
      let words: string[] = [];
      if (userGameConfig.categories && Array.isArray(userGameConfig.categories)) {
        userGameConfig.categories.forEach((category: any) => {
          if (category.words && Array.isArray(category.words)) {
            words = words.concat(category.words);
          }
        });
      }
      
      // If no words found in categories, keep existing words
      if (words.length === 0 && categoryTemplateData.words && Array.isArray(categoryTemplateData.words)) {
        words = categoryTemplateData.words;
      }
      
      updateData.words = words;
    } else if (templateType === 'sort-categories-egg') {
      // Handle sort-categories-egg specific data
      if (userGameConfig.categories) {
        updateData.categories = userGameConfig.categories;
      }
      if (userGameConfig.eggQty !== undefined) {
        updateData.eggQty = userGameConfig.eggQty;
      }
    }
    
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
 * Helper function to sync sort-categories-egg templates with userGameConfigs
 */
export const syncSortCategoriesEggTemplate = async (
  categoryTemplateId: string,
  gameTitle: string
) => {
  return syncTemplateWithGameConfig(categoryTemplateId, gameTitle, 'sort-categories-egg');
};

/**
 * Helper function to sync whack-a-mole templates with userGameConfigs
 */
export const syncWhackAMoleTemplate = async (
  categoryTemplateId: string,
  gameTitle: string
) => {
  return syncTemplateWithGameConfig(categoryTemplateId, gameTitle, 'whack-a-mole');
};

/**
 * Run this in your browser console to sync a template:
 * 
 * import { syncTemplateWithGameConfig } from './utils/updateTemplates';
 * syncTemplateWithGameConfig('ZxC2tyDrPScXMoN9eS9J', 'short a v6');
 * 
 * For sort-categories-egg specific:
 * import { syncSortCategoriesEggTemplate } from './utils/updateTemplates';
 * syncSortCategoriesEggTemplate('ZxC2tyDrPScXMoN9eS9J', 'short a v6');
 */ 