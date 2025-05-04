/*
 * This script copies the token-redirect.html file from the public folder to the dist folder
 * during the build process. This ensures that our direct token handling file is available
 * for Firebase hosting rewrites.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const publicDir = path.resolve(__dirname, '../public');
const distDir = path.resolve(__dirname, '../dist');
const sourceFile = path.join(publicDir, 'token-redirect.html');
const destFile = path.join(distDir, 'token-redirect.html');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  console.log('Creating dist directory...');
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy the file
console.log(`Copying ${sourceFile} to ${destFile}...`);
try {
  fs.copyFileSync(sourceFile, destFile);
  console.log('Token redirect file copied successfully!');
} catch (error) {
  console.error('Error copying token redirect file:', error);
  process.exit(1);
} 