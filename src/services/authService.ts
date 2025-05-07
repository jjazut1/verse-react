import { 
  getAuth, 
  isSignInWithEmailLink, 
  sendSignInLinkToEmail, 
  signInWithEmailLink,
  setPersistence,
  browserLocalPersistence 
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';
import { auth } from '../config/firebase';

/**
 * Sends an authentication email link to the specified email
 * @param email Email address to send the link to
 * @param redirectUrl URL to redirect to after authentication
 * @returns Promise that resolves when the email has been sent
 */
export const sendAuthenticationEmailLink = async (email: string, redirectUrl?: string): Promise<void> => {
  try {
    const actionCodeSettings = {
      // URL you want to redirect back to after sign-in
      url: redirectUrl || window.location.href,
      handleCodeInApp: true
    };

    // Store the email locally so we can access it after the user clicks the link
    localStorage.setItem('emailForSignIn', email);

    // Send the authentication link
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    
    console.log('Auth link sent to:', email);
    return;
  } catch (error) {
    console.error('Error sending authentication link:', error);
    throw error;
  }
};

/**
 * Checks if the current URL is an email sign-in link
 * @returns boolean indicating if the current URL is a sign-in link
 */
export const isEmailSignInLink = (): boolean => {
  return isSignInWithEmailLink(auth, window.location.href);
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
    
    // Complete the sign-in process
    await signInWithEmailLink(auth, email, window.location.href);
    
    // Remove the email from storage after successful sign-in
    localStorage.removeItem('emailForSignIn');
    
    return;
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
    throw error;
  }
}; 