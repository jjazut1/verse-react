{
  "name": "functions",
  "description": "Firebase Cloud Functions for Verse Learning",
  "scripts": {
    "build": "echo 'No build step needed for JavaScript'",
    "serve": "firebase emulators:start --only functions",
    "shell": "firebase functions:shell",
    "start": "npm run shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "engines": {
    "node": "18"
  },
  "main": "index.js",
  "dependencies": {
    "@sendgrid/mail": "^7.7.0",
    "firebase-admin": "^11.8.0",
    "firebase-functions": "^4.3.1"
  },
  "private": true
} 