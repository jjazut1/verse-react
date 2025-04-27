# Testing Thumbnail Regeneration

This document outlines the steps to test the thumbnail regeneration functionality in the application.

## Prerequisites

1. You must have admin privileges in the application
2. The application must be running (use `npm run dev`)

## Testing Bulk Thumbnail Regeneration

1. Log in with your admin account
2. Navigate to the Admin page by clicking the "Admin" link in the navigation bar (displayed in gold color)
3. Go to the "Maintenance" tab
4. Click the "Regenerate All Thumbnails" button
5. Wait for the process to complete
6. You should see a success message showing how many thumbnails were regenerated
7. Navigate back to the Home page to verify that thumbnails are now displaying correctly

## Testing Single Thumbnail Regeneration

1. Log in with your admin account
2. Navigate to the Home page
3. For each game item, you will see a regenerate icon (↻) button next to any games you own
   - This button is only visible to admin users
4. Click this button to regenerate the thumbnail for a specific game
5. The button will show a loading spinner while the thumbnail is being regenerated
6. Once complete, the page will refresh to show the new thumbnail
7. If the process fails, check the browser console for error messages

## Expected Results

- Sort Categories games should have thumbnails with egg visuals and a light purple tint
- Whack-a-Mole games should have thumbnails with mole visuals and a light green tint
- All thumbnails should be 60x60 pixels and maintain proper sizing
- The regeneration process should be quick (1-3 seconds per thumbnail)

## Troubleshooting

If you encounter issues with thumbnail regeneration:

1. Check browser console for error messages (F12 or Cmd+Option+I)
2. Verify that you have admin privileges
3. Ensure the game data is valid and contains all required fields
4. Try refreshing the page and attempting the regeneration again

## Implementation Details

The thumbnail regeneration uses two main functions:

1. `regenerateAllThumbnails()` - Regenerates thumbnails for all games in the database
2. `regenerateThumbnail(gameId)` - Regenerates a thumbnail for a specific game

These functions are implemented in `src/utils/regenerateThumbnails.ts` and use the thumbnail generator component in `src/utils/thumbnailGenerator.ts`. 