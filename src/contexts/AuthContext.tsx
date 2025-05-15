import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateEmail as firebaseUpdateEmail,
  updatePassword as firebaseUpdatePassword,
  UserCredential
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// For demo purposes, we'll check if user email is in this list to determine if they're a teacher
const TEACHER_EMAILS = [
  'teacher@example.com',
  'admin@example.com'
];

interface AuthContextType {
  currentUser: User | null;
  isTeacher: boolean;
  loginWithGoogle: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateEmail: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signup: (email: string, password: string, recaptchaToken?: string) => Promise<UserCredential>;
  setCurrentUserAsAdmin: () => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isTeacher: false,
  loginWithGoogle: async () => {},
  login: async () => {},
  logout: async () => {},
  resetPassword: async () => {},
  updateEmail: async () => {},
  updatePassword: async () => {},
  signup: async () => { return {} as UserCredential; },
  setCurrentUserAsAdmin: async () => { return false; }
});

export const useAuth = () => {
  return useContext(AuthContext);
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isTeacher, setIsTeacher] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if a user is a teacher
  const checkIfTeacher = async (user: User | null) => {
    if (!user) {
      setIsTeacher(false);
      return;
    }
    
    try {
      // First check if email is in our demo list
      if (TEACHER_EMAILS.includes(user.email || '')) {
        setIsTeacher(true);
        return;
      }
      
      // Check if they have a teacher or admin role in their user document
      try {
        console.log(`Checking user document for uid: ${user.uid}`);
        const userDoc = doc(db, 'users', user.uid);
        const userRecord = await getDoc(userDoc);
        
        if (userRecord.exists()) {
          const userData = userRecord.data();
          console.log(`User data retrieved:`, userData);
          const role = userData.role;
          
          // If they have either teacher OR admin role, they should have teacher capabilities
          if (role === 'teacher' || role === 'admin') {
            console.log(`User has role: ${role}, setting isTeacher to true`);
            setIsTeacher(true);
            
            // Update lastLogin timestamp
            try {
              await setDoc(userDoc, {
                lastLogin: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }, { merge: true });
              console.log("Updated user lastLogin timestamp");
            } catch (updateError) {
              console.error("Error updating lastLogin:", updateError);
              // Non-critical error, continue
            }
            
            return;
          }
        } else {
          console.log(`User document does not exist for uid: ${user.uid}, checking by email`);
          
          // If user document doesn't exist with UID, try to find by email
          if (user.email) {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', user.email));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              // Found user by email
              const existingUserDoc = querySnapshot.docs[0];
              const existingUserData = existingUserDoc.data();
              console.log(`Found user document by email: ${existingUserDoc.id}`, existingUserData);
              
              // If they have a teacher or admin role, set isTeacher to true
              if (existingUserData.role === 'teacher' || existingUserData.role === 'admin') {
                console.log(`User has role: ${existingUserData.role}, setting isTeacher to true`);
                setIsTeacher(true);
                
                // Create a new document with the user's actual UID
                try {
                  console.log(`Creating new user document with correct UID: ${user.uid}`);
                  await setDoc(doc(db, 'users', user.uid), {
                    ...existingUserData,
                    userId: user.uid,
                    updatedAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString(),
                    displayName: user.displayName || existingUserData.displayName || user.email.split('@')[0],
                    email: user.email,
                    emailVerified: user.emailVerified,
                    role: existingUserData.role  // Preserve their original role
                  });
                  
                  console.log("Successfully created user document with correct UID");
                  
                  // Now check if we have permission to update the original document
                  // This would be nice to have but not critical since we now have the new document
                  try {
                    await updateDoc(doc(db, 'users', existingUserDoc.id), {
                      linkedToAuth: true,
                      authUid: user.uid,
                      lastLogin: new Date().toISOString(),
                      updatedAt: new Date().toISOString()
                    });
                    console.log("Updated original user document with authUid reference");
                  } catch (linkError) {
                    console.warn("Could not update original document with authUid reference:", linkError);
                    // This is not critical, we can continue
                  }
                } catch (createError) {
                  console.error("Error creating user document with correct UID:", createError);
                  // Even though document creation failed, we still know they're a teacher
                  // So we can continue with the current isTeacher state
                }
                
                return;
              }
            }
          }
        }
      } catch (docError) {
        console.error(`Error reading user document:`, docError);
        // Continue execution - don't throw the error
      }
      
      // If we've made it this far, user is not a teacher
      setIsTeacher(false);
    } catch (error) {
      console.error('Error checking teacher status:', error);
      setIsTeacher(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      checkIfTeacher(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signup = async (email: string, password: string, recaptchaToken?: string): Promise<UserCredential> => {
    try {
      // Validate recaptcha token if present (this would typically be done server-side)
      if (!recaptchaToken) {
        console.log('No reCAPTCHA token provided, proceeding with signup without verification');
        // In a production environment, you might want to implement server-side verification
        // and reject signups without a valid token
      }
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create a user record in the users collection
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: email,
        createdAt: new Date().toISOString(),
        userId: userCredential.user.uid,
        // Store the fact that user was verified by reCAPTCHA
        verifiedByRecaptcha: !!recaptchaToken,
      });
      
      return userCredential;
    } catch (error) {
      console.error('Error creating user with email and password:', error);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error signing in with email and password:', error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  };

  const updateEmail = async (email: string) => {
    try {
      if (currentUser) {
        await firebaseUpdateEmail(currentUser, email);
      } else {
        throw new Error('No user logged in');
      }
    } catch (error) {
      console.error('Error updating email:', error);
      throw error;
    }
  };

  const updatePassword = async (password: string) => {
    try {
      if (currentUser) {
        await firebaseUpdatePassword(currentUser, password);
      } else {
        throw new Error('No user logged in');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  };

  const setCurrentUserAsAdmin = async () => {
    try {
      if (!currentUser) {
        throw new Error('No user logged in');
      }
      
      // Update the user document with admin role
      await setDoc(doc(db, 'users', currentUser.uid), {
        email: currentUser.email,
        role: 'admin',
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      // Force set isTeacher to true locally, this ensures the UI will work
      // even if there are permission issues with reading the user doc
      setIsTeacher(true);
      console.log('User set as admin and teacher flag activated');
      
      return true;
    } catch (error) {
      console.error('Error setting user as admin:', error);
      throw error;
    }
  };

  const value = {
    currentUser,
    isTeacher,
    loginWithGoogle,
    login,
    logout,
    resetPassword,
    updateEmail,
    updatePassword,
    signup,
    setCurrentUserAsAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 