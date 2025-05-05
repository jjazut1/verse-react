/**
 * Restore Firebase Functions configuration from a versioned backup
 * 
 * This script restores a configuration backup created by make-versioned-backup.js
 * You can specify a backup file or restore from the latest backup.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get the backup file path from command line argument or use the latest backup
let backupFilePath;
if (process.argv.length > 2) {
  backupFilePath = path.join(__dirname, process.argv[2]);
} else {
  backupFilePath = path.join(__dirname, 'firebase-config-backup.json');
}

// Check if the backup file exists
if (!fs.existsSync(backupFilePath)) {
  console.error(`Error: Backup file ${backupFilePath} not found`);
  console.error('Please provide a valid backup file path or ensure firebase-config-backup.json exists.');
  process.exit(1);
}

try {
  console.log(`Restoring Firebase Functions configuration from ${backupFilePath}...`);
  
  // Read and parse the backup file
  const configJson = fs.readFileSync(backupFilePath, 'utf8');
  let config = JSON.parse(configJson);
  
  // Check if this is a versioned backup with metadata
  if (config.metadata && config.config) {
    console.log(`Restoring from backup created on ${config.metadata.date} for commit ${config.metadata.gitCommitHash}`);
    config = config.config;
  }
  
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
  
  // Get the current Git commit hash
  const currentGitHash = execSync('git rev-parse HEAD').toString().trim();
  
  // Check if the backup was for a different commit
  if (config.metadata && config.metadata.gitCommitHash !== currentGitHash) {
    console.warn('\nWARNING: The restored configuration was created for a different Git commit:');
    console.warn(`Current commit:  ${currentGitHash}`);
    console.warn(`Backup commit:   ${config.metadata.gitCommitHash}`);
    console.warn('You might want to reset to the backup commit with:');
    console.warn(`git reset --hard ${config.metadata.gitCommitHash}`);
  }
} catch (error) {
  console.error('Error restoring Firebase Functions configuration:', error.message);
  process.exit(1);
} 