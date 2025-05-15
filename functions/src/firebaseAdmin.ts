import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
  console.log('Firebase Admin initialized with default application credentials');
}

export default admin; 