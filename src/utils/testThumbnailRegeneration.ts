import { regenerateThumbnail } from './regenerateThumbnails';

/**
 * Test utility to regenerate a thumbnail for a specific game
 * 
 * To use this function:
 * 1. In the browser, go to Home and find a game or create a new one
 * 2. Get the game ID (visible in the URL when you click on a game: /game/{gameId})
 * 3. Open browser console (F12 or Cmd+Option+I)
 * 4. Run: testRegenerateThumbnail('your-game-id-here')
 * 
 * Note: This function is automatically added to the window object
 * so you can call it directly from the console
 */
export async function testRegenerateThumbnail(gameId: string): Promise<void> {
  console.log(`Starting thumbnail regeneration for game: ${gameId}`);
  
  try {
    const result = await regenerateThumbnail(gameId);
    
    if (result) {
      console.log(`✅ Successfully regenerated thumbnail for game: ${gameId}`);
      console.log('Please refresh the page to see the updated thumbnail.');
    } else {
      console.error(`❌ Failed to regenerate thumbnail for game: ${gameId}`);
      console.log('Check the console for detailed error messages.');
    }
  } catch (error) {
    console.error('Error while testing thumbnail regeneration:', error);
  }
}

// Make the function available globally on the window object
if (typeof window !== 'undefined') {
  (window as any).testRegenerateThumbnail = testRegenerateThumbnail;
}

// Export as default to allow easier importing in development
export default testRegenerateThumbnail; 