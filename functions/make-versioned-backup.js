/**
 * Create a versioned backup of Firebase Functions configuration
 * 
 * This script creates a backup with the current Git commit hash to ensure
 * you can restore the exact configuration for a specific code version.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  // Get the current Git commit hash
  const gitHash = execSync('git rev-parse HEAD').toString().trim();
  
  // Get the current date in YYYY-MM-DD format
  const date = new Date().toISOString().split('T')[0];
  
  // Run the Firebase config:get command to get all configurations
  const configOutput = execSync('firebase functions:config:get').toString();
  
  // Parse the JSON output
  const config = JSON.parse(configOutput);
  
  // Create a backup object with metadata
  const backup = {
    metadata: {
      gitCommitHash: gitHash,
      date: date,
      description: 'Firebase Functions configuration backup'
    },
    config: config
  };
  
  // Create the backups directory if it doesn't exist
  const backupsDir = path.join(__dirname, 'config-backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir);
  }
  
  // Write the backup to a file with the Git hash in the name
  const backupPath = path.join(backupsDir, `firebase-config-${date}-${gitHash.substring(0, 7)}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  
  // Also create/update the latest backup
  const latestBackupPath = path.join(__dirname, 'firebase-config-backup.json');
  fs.writeFileSync(latestBackupPath, JSON.stringify(config, null, 2));
  
  console.log(`Firebase Functions configuration backed up to ${backupPath}`);
  console.log('Also updated the latest backup at firebase-config-backup.json');
  console.log('\nTo commit this configuration backup, run:');
  console.log(`git add ${backupPath.replace(__dirname + '/', '')} firebase-config-backup.json`);
  console.log('git commit -m "Backup Firebase Functions configuration"');
  console.log('\nWARNING: These files contain sensitive information like API keys.');
  console.log('Consider encrypting them or adding them to .gitignore before committing.');
} catch (error) {
  console.error('Error backing up Firebase Functions configuration:', error.message);
  process.exit(1);
} 