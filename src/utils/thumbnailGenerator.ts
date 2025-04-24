import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";

interface ThumbnailGenerationOptions {
  type: 'sort-categories-egg' | 'whack-a-mole';
  title: string;
  categories?: Array<{ name: string; items: string[] }>;
  wordCategories?: Array<{ title: string; words: string[] }>;
}

/**
 * Generates a thumbnail image for a game configuration
 * Uses HTML canvas to create a visual representation of the game
 */
export function generateThumbnailDataUrl(options: ThumbnailGenerationOptions): string {
  // Create a canvas element
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 300;
  canvas.height = 200;
  
  if (!ctx) return getDefaultThumbnail(options.type);
  
  // Set background color based on game type
  const backgroundColors = {
    'sort-categories-egg': '#f0e6ff', // Light purple
    'whack-a-mole': '#e6fff0'  // Light green
  };
  
  // Fill background
  ctx.fillStyle = backgroundColors[options.type] || '#f0f0f0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add game-specific visuals
  if (options.type === 'sort-categories-egg') {
    drawSortCategoriesPreview(ctx, options, canvas.width, canvas.height);
  } else if (options.type === 'whack-a-mole') {
    drawWhackAMolePreview(ctx, options, canvas.width, canvas.height);
  }
  
  // Add title text
  ctx.fillStyle = '#333333';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(shortenText(options.title, 20), canvas.width / 2, 30);
  
  // Convert canvas to data URL
  return canvas.toDataURL('image/png');
}

/**
 * Uploads a data URL to Firebase Storage and returns the download URL
 */
export async function uploadThumbnail(
  dataUrl: string, 
  gameId: string, 
  gameType: string
): Promise<string> {
  try {
    const storage = getStorage();
    const storagePath = `thumbnails/${gameType}/${gameId}.png`;
    const storageRef = ref(storage, storagePath);
    
    // Upload the data URL
    await uploadString(storageRef, dataUrl, 'data_url');
    
    // Get the download URL
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error('Error uploading thumbnail:', error);
    return '';
  }
}

/**
 * Creates a thumbnail for the Sort Categories Egg game
 */
function drawSortCategoriesPreview(
  ctx: CanvasRenderingContext2D,
  options: ThumbnailGenerationOptions,
  width: number, 
  height: number
) {
  // Draw egg icons
  drawEggs(ctx, width, height);
  
  // Draw categories if available
  if (options.categories && options.categories.length > 0) {
    drawCategories(ctx, options.categories, width, height);
  }
}

/**
 * Creates a thumbnail for the Whack-a-Mole game
 */
function drawWhackAMolePreview(
  ctx: CanvasRenderingContext2D,
  options: ThumbnailGenerationOptions,
  width: number, 
  height: number
) {
  // Draw mole icons
  drawMoles(ctx, width, height);
  
  // Draw word categories if available
  if (options.wordCategories && options.wordCategories.length > 0) {
    const wordList = options.wordCategories.flatMap(cat => cat.words).slice(0, 8);
    drawWordCloud(ctx, wordList, width, height);
  }
}

/**
 * Draws egg icons for Sort Categories Egg game
 */
function drawEggs(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Draw multiple eggs
  const eggPositions = [
    { x: width * 0.2, y: height * 0.5 },
    { x: width * 0.5, y: height * 0.4 },
    { x: width * 0.8, y: height * 0.6 }
  ];
  
  eggPositions.forEach(pos => {
    // Draw egg
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#dddddd';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y, 30, 40, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Add crack to one egg
    if (pos.x === width * 0.5) {
      ctx.strokeStyle = '#888888';
      ctx.beginPath();
      ctx.moveTo(pos.x - 15, pos.y - 20);
      ctx.lineTo(pos.x + 5, pos.y);
      ctx.lineTo(pos.x - 5, pos.y + 10);
      ctx.stroke();
    }
  });
}

/**
 * Draws moles for Whack-a-Mole game
 */
function drawMoles(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Draw a mole peeking out
  const moleX = width * 0.5;
  const moleY = height * 0.6;
  
  // Draw hole
  ctx.fillStyle = '#654321';
  ctx.beginPath();
  ctx.ellipse(moleX, moleY + 10, 40, 20, 0, 0, 2 * Math.PI);
  ctx.fill();
  
  // Draw mole
  ctx.fillStyle = '#8B4513';
  ctx.beginPath();
  ctx.arc(moleX, moleY - 20, 30, 0, Math.PI, false);
  ctx.fill();
  
  // Draw face
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(moleX - 10, moleY - 30, 5, 0, 2 * Math.PI);
  ctx.arc(moleX + 10, moleY - 30, 5, 0, 2 * Math.PI);
  ctx.fill();
  
  // Draw hammer
  ctx.fillStyle = '#A0522D';
  ctx.fillRect(width * 0.7, height * 0.3, 10, 50);
  
  ctx.fillStyle = '#708090';
  ctx.fillRect(width * 0.65, height * 0.2, 20, 30);
}

/**
 * Draws categories for Sort Categories Egg game
 */
function drawCategories(
  ctx: CanvasRenderingContext2D,
  categories: Array<{ name: string; items: string[] }>,
  width: number,
  height: number
) {
  // Draw up to 3 category boxes
  const displayCategories = categories.slice(0, 3);
  
  ctx.fillStyle = '#555555';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  
  displayCategories.forEach((category, index) => {
    const boxWidth = width * 0.25;
    const boxHeight = 30;
    const boxX = 30 + (index * (boxWidth + 20));
    const boxY = height * 0.8;
    
    // Draw category box
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    
    // Draw category name
    ctx.fillStyle = '#333333';
    ctx.fillText(shortenText(category.name, 10), boxX + boxWidth/2, boxY + 20);
  });
  
  // If there are more categories, add indicator
  if (categories.length > 3) {
    ctx.fillStyle = '#555555';
    ctx.textAlign = 'center';
    ctx.fillText(`+${categories.length - 3} more`, width * 0.8, height * 0.85);
  }
}

/**
 * Draws a word cloud for Whack-a-Mole game
 */
function drawWordCloud(
  ctx: CanvasRenderingContext2D,
  words: string[],
  width: number,
  height: number
) {
  const displayWords = words.slice(0, 8);
  
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  
  // Randomly position words
  displayWords.forEach((word, index) => {
    const row = Math.floor(index / 4);
    const col = index % 4;
    
    const xPos = (width * 0.2) + (col * width * 0.2);
    const yPos = (height * 0.4) + (row * 30);
    
    // Random subtle color
    const hue = (index * 40) % 360;
    ctx.fillStyle = `hsla(${hue}, 70%, 40%, 0.8)`;
    
    ctx.fillText(shortenText(word, 8), xPos, yPos);
  });
  
  // If there are more words, add indicator
  if (words.length > 8) {
    ctx.fillStyle = '#555555';
    ctx.fillText(`+${words.length - 8} more words`, width * 0.5, height * 0.9);
  }
}

/**
 * Helper function to shorten text with ellipsis
 */
function shortenText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Returns a default thumbnail URL based on game type
 */
function getDefaultThumbnail(type: string): string {
  // These would be replaced with actual URLs to default images
  const defaults: Record<string, string> = {
    'sort-categories-egg': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFdwI2QM1kHwAAAABJRU5ErkJggg==',
    'whack-a-mole': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFdwI2QM1kHwAAAABJRU5ErkJggg==',
  };
  
  return defaults[type] || defaults['sort-categories-egg'];
}

/**
 * Main function to generate and upload a thumbnail for a game
 */
export async function generateAndUploadThumbnail(
  gameId: string,
  gameData: any
): Promise<string> {
  try {
    // Extract relevant data based on game type
    const options: ThumbnailGenerationOptions = {
      type: gameData.type as 'sort-categories-egg' | 'whack-a-mole',
      title: gameData.title || 'Game',
    };
    
    // Add game-specific data
    if (options.type === 'sort-categories-egg' && gameData.categories) {
      options.categories = gameData.categories;
    } else if (options.type === 'whack-a-mole' && gameData.categories) {
      options.wordCategories = gameData.categories;
    }
    
    // Generate thumbnail
    const dataUrl = generateThumbnailDataUrl(options);
    
    // Upload to Firebase Storage
    return await uploadThumbnail(dataUrl, gameId, options.type);
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return '';
  }
} 