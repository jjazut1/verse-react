import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Log environment variables for debugging (will be removed in production)
console.log('Firebase Config Environment Variables:');
console.log('API Key exists:', Boolean(import.meta.env.VITE_FIREBASE_API_KEY));
console.log('Auth Domain exists:', Boolean(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN));
console.log('Project ID exists:', Boolean(import.meta.env.VITE_FIREBASE_PROJECT_ID));
console.log('API Key length:', import.meta.env.VITE_FIREBASE_API_KEY ? import.meta.env.VITE_FIREBASE_API_KEY.length : 0);

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Log the actual configuration (with sensitive parts masked)
console.log('Firebase Config:', {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey ? '✓ Set (hidden for security)' : '✗ Missing',
  appId: firebaseConfig.appId ? '✓ Set (hidden for security)' : '✗ Missing'
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth }; 