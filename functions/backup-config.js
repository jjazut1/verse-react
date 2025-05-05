/**
 * Firebase Functions Configuration Backup Script
 * 
 * This script creates a backup of your Firebase Functions configuration
 * that can be committed to your repository for easy restoration.
 * 
 * IMPORTANT: This file will contain sensitive information like API keys.
 * Add firebase-config-backup.json to .gitignore if you don't want to
 * commit the actual values, or encrypt them before committing.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Run the Firebase config:get command to get all configurations
try {
  const configOutput = execSync('firebase functions:config:get').toString();
  
  // Parse the JSON output
  const config = JSON.parse(configOutput);
  
  // Write the config to a file
  fs.writeFileSync(
    path.join(__dirname, 'firebase-config-backup.json'),
    JSON.stringify(config, null, 2)
  );
  
  console.log('Firebase Functions configuration backed up to firebase-config-backup.json');
  console.log('You can commit this file to your repository for future reference.');
  console.log('WARNING: This file contains sensitive information like API keys.');
} catch (error) {
  console.error('Error backing up Firebase Functions configuration:', error.message);
  process.exit(1);
} 