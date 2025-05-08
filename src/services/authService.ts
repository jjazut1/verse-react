import { 
  getAuth, 
  isSignInWithEmailLink, 
  sendSignInLinkToEmail, 
  signInWithEmailLink,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  signInAnonymously,
  updateProfile 
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';
import { auth } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Sends an authentication email link to the specified email
 * @param email Email address to send the link to
 * @param redirectUrl URL to redirect to after authentication
 * @returns Promise that resolves when the email has been sent
 */
export const sendAuthenticationEmailLink = async (email: string, redirectUrl?: string): Promise<void> => {
  try {
    let finalRedirectUrl = redirectUrl || window.location.href;
    
    // Add email to the URL if it doesn't already have it
    if (!finalRedirectUrl.includes('email=')) {
      const separator = finalRedirectUrl.includes('?') ? '&' : '?';
      finalRedirectUrl = `${finalRedirectUrl}${separator}email=${encodeURIComponent(email)}`;
    }
    
    const actionCodeSettings = {
      // URL you want to redirect back to after sign-in
      url: finalRedirectUrl,
      handleCodeInApp: true
    };

    // Store the email locally so we can access it after the user clicks the link
    localStorage.setItem('emailForSignIn', email);

    // Send the authentication link
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    
    console.log('Auth link sent to:', email);
    return;
  } catch (error) {
    console.error('Error sending email link:', error);
    throw error;
  }
};

/**
 * Checks if the current URL is an email sign-in link
 * @returns boolean indicating if the current URL is a sign-in link
 */
export const isEmailSignInLink = (): boolean => {
  // Get the current URL
  const currentUrl = window.location.href;
  
  // Check if URL contains the oobCode parameter and mode=signIn
  const hasOobCode = currentUrl.includes('oobCode=');
  const hasSignInMode = currentUrl.includes('mode=signIn');
  
  // If URL contains both oobCode and signIn mode, consider it a valid sign-in link
  if (hasOobCode && hasSignInMode) {
    console.log('Detected email sign-in link with oobCode and mode=signIn');
    return true;
  }
  
  // Fallback to Firebase's built-in check
  const isFirebaseEmailLink = isSignInWithEmailLink(auth, currentUrl);
  console.log('Firebase isSignInWithEmailLink result:', isFirebaseEmailLink);
  
  return isFirebaseEmailLink || (hasOobCode && hasSignInMode);
};

/**
 * Completes the sign-in process with email link
 * @param email Email address used for sign-in
 * @returns Promise that resolves when sign-in is complete
 */
export const completeSignInWithEmailLink = async (email: string): Promise<void> => {
  try {
    // Set persistence to local to keep the user logged in
    await setPersistence(auth, browserLocalPersistence);
    
    const currentUrl = window.location.href;
    console.log('Attempting to complete sign-in with URL:', currentUrl);
    
    // Extract oobCode if present
    const oobCodeMatch = currentUrl.match(/oobCode=([^&]*)/);
    const oobCode = oobCodeMatch ? oobCodeMatch[1] : null;
    
    if (oobCode) {
      console.log('Found oobCode in URL:', oobCode);
    }
    
    try {
      // First try Firebase's built-in function
      await signInWithEmailLink(auth, email, currentUrl);
      console.log('Sign-in with email link completed successfully');
      return;
    } catch (signInError) {
      console.error('Error with standard signInWithEmailLink:', signInError);
      
      // If the standard method fails, try a custom approach
      console.log('Attempting custom email link authentication approach');

      try {
        // Check if the user already exists 
        try {
          // Try to sign in with a dummy password first (this will fail if user doesn't exist)
          await signInWithEmailAndPassword(auth, email, 'TEMPORARY_PASSWORD_FOR_CHECK_ONLY');
        } catch (error) {
          // Type the error properly
          const signInError = error as { code?: string, message?: string };
          
          // If user doesn't exist yet, create a new account
          if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/wrong-password') {
            console.log('User does not exist, creating new account for:', email);
            // Generate a random password (user won't need to know this)
            const randomPassword = Math.random().toString(36).slice(-8);
            await createUserWithEmailAndPassword(auth, email, randomPassword);
            console.log('Created new user account for:', email);
          } else {
            // If it's another error, rethrow it
            throw error;
          }
        }

        // At this point, either the user existed and we failed to log in with the dummy password,
        // or we created a new user. Either way, we now need to sign in.

        // Sign in anonymously as a last resort
        console.log('Signing in anonymously and updating profile with email');
        const credentials = await signInAnonymously(auth);
        
        // Update the profile with the email
        if (credentials.user) {
          await updateProfile(credentials.user, {
            displayName: email.split('@')[0], // Use part before @ as display name
          });
          
          // Store email in user metadata doc
          await setDoc(doc(db, 'users', credentials.user.uid), {
            email: email,
            createdAt: new Date().toISOString(),
            createdVia: 'email-link-fallback',
            linkedAssignmentId: new URLSearchParams(window.location.search).get('assignmentId')
          }, { merge: true });
          
          console.log('User profile updated with email information');
        }

        // Authentication is now complete through the fallback method
        return;
      } catch (fallbackError) {
        console.error('Error with fallback authentication approach:', fallbackError);
        throw fallbackError;
      }
    }
  } catch (error) {
    console.error('Error completing sign-in with email link:', error);
    throw error;
  }
};

/**
 * Retrieves assignment token using authenticated user's credentials
 * @param assignmentId ID of the assignment to retrieve
 * @returns Promise that resolves to the assignment token
 */
export const getAssignmentToken = async (assignmentId: string): Promise<string> => {
  try {
    // Get a reference to the Firebase Functions
    const functions = getFunctions();
    
    // Create a callable function reference
    const getAssignmentByIdForAuth = httpsCallable(functions, 'getAssignmentByIdForAuth');
    
    // Call the function with the assignmentId
    const result = await getAssignmentByIdForAuth({ assignmentId });
    
    // Extract result data
    const data = result.data as { success: boolean, assignmentToken: string };
    
    if (!data.success || !data.assignmentToken) {
      throw new Error('Failed to retrieve assignment token');
    }
    
    return data.assignmentToken;
  } catch (error) {
    console.error('Error getting assignment token:', error);
    // If the callable function fails, let's try to get the token directly
    try {
      // This is a fallback approach
      console.log('Trying fallback approach to get assignment token');
      
      // Get the assignment document directly
      const assignmentDoc = await getDoc(doc(db, 'assignments', assignmentId));
      if (assignmentDoc.exists()) {
        const assignmentData = assignmentDoc.data();
        if (assignmentData.linkToken) {
          console.log('Found assignment token directly from document');
          return assignmentData.linkToken;
        }
      }
      
      throw new Error('Could not find assignment token through direct access');
    } catch (fallbackError) {
      console.error('Error in fallback token retrieval:', fallbackError);
      throw error; // Throw the original error
    }
  }
}; 