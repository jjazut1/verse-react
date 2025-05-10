/**
 * Firebase Functions Configuration Restoration Script
 * 
 * This script restores your Firebase Functions configuration from the
 * backup file created by backup-config.js.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if the backup file exists
const backupFilePath = path.join(__dirname, 'firebase-config-backup.json');
if (!fs.existsSync(backupFilePath)) {
  console.error('Error: Backup file firebase-config-backup.json not found');
  process.exit(1);
}

try {
  // Read and parse the backup file
  const configJson = fs.readFileSync(backupFilePath, 'utf8');
  const config = JSON.parse(configJson);
  
  console.log('Restoring Firebase Functions configuration...');
  
  // Restore each configuration key-value pair
  for (const [namespace, values] of Object.entries(config)) {
    for (const [key, value] of Object.entries(values)) {
      const configKey = `${namespace}.${key}`;
      const configValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      // Execute the Firebase config:set command
      console.log(`Setting ${configKey}...`);
      execSync(`firebase functions:config:set ${configKey}="${configValue.replace(/"/g, '\\"')}"`);
    }
  }
  
  console.log('Configuration restored successfully!');
  console.log('Run "firebase deploy --only functions" to apply the configuration.');
} catch (error) {
  console.error('Error restoring Firebase Functions configuration:', error.message);
  process.exit(1);
} 