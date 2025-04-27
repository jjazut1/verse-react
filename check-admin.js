// Simple script to check if the current user has admin privileges
// Save this to a file and run with: node check-admin.js

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, query, where, getDocs, setDoc } = require('firebase/firestore');
const { getAuth, onAuthStateChanged } = require('firebase/auth');

// Your Firebase configuration
const firebaseConfig = {
  // Copy your Firebase config here
  // apiKey: "...",
  // authDomain: "...",
  // projectId: "...",
  // storageBucket: "...",
  // messagingSenderId: "...",
  // appId: "..."
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Check if user is an admin
async function checkAdmin(user) {
  if (!user) {
    console.log('No user is logged in');
    return;
  }
  
  console.log(`Checking admin status for user: ${user.email} (${user.uid})`);
  
  try {
    // Check if user document exists and has admin role
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      console.log('User document exists:', userDoc.data());
      if (userDoc.data().role === 'admin') {
        console.log('✅ User is an admin!');
      } else {
        console.log('❌ User document exists but does not have admin role');
      }
    } else {
      console.log('❌ User document does not exist in users collection');
    }
    
    // Check teachers collection
    console.log('\nChecking teachers collection...');
    const teacherDocRef = doc(db, 'teachers', user.uid);
    const teacherDoc = await getDoc(teacherDocRef);
    
    if (teacherDoc.exists()) {
      console.log('✅ User is a teacher:', teacherDoc.data());
    } else {
      console.log('❌ User is not in teachers collection');
    }
    
    // Check if email is in TEACHER_EMAILS array
    const TEACHER_EMAILS = [
      'teacher@example.com',
      'admin@example.com'
    ];
    
    console.log('\nChecking if email is in TEACHER_EMAILS array...');
    if (TEACHER_EMAILS.includes(user.email)) {
      console.log('✅ Email is in TEACHER_EMAILS array');
    } else {
      console.log('❌ Email is not in TEACHER_EMAILS array');
    }
    
    // Option to create or update user document with admin role
    const answer = await promptUser('Do you want to set this user as admin? (y/n): ');
    
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        role: 'admin',
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log('✅ User has been set as admin');
    }
    
  } catch (error) {
    console.error('Error checking admin status:', error);
  }
}

// Simple prompt function
function promptUser(question) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    readline.question(question, answer => {
      readline.close();
      resolve(answer);
    });
  });
}

// Listen for auth state changes
onAuthStateChanged(auth, async (user) => {
  if (user) {
    await checkAdmin(user);
  } else {
    console.log('No user is logged in. Please log in to the app first.');
  }
  process.exit(0);
});

// Keep the script running for a bit to allow the auth state to be checked
setTimeout(() => {
  console.log('Timeout - no auth state detected. Make sure you are logged in to the app first.');
  process.exit(1);
}, 10000); 