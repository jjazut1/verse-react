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
import { doc, setDoc, getDoc } from 'firebase/firestore';
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
      
      // Then check if the user is in the teachers collection
      const userDoc = await getDoc(doc(db, 'teachers', user.uid));
      if (userDoc.exists()) {
        setIsTeacher(true);
        return;
      }
      
      // Check if they have a teacher or admin role in their user document
      const userRecord = await getDoc(doc(db, 'users', user.uid));
      if (userRecord.exists()) {
        const role = userRecord.data().role;
        // If they have either teacher OR admin role, they should have teacher capabilities
        if (role === 'teacher' || role === 'admin') {
        setIsTeacher(true);
        return;
        }
      }
      
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
      
      await setDoc(doc(db, 'users', currentUser.uid), {
        email: currentUser.email,
        role: 'admin',
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      // Since we're updating the user's role, check if they're a teacher as well
      checkIfTeacher(currentUser);
      
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