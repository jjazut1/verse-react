import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getAssignment } from '../services/assignmentService';

const AssignmentLogin = () => {
  // State variables
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Authenticating...');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    const processToken = async () => {
      try {
        // Get token from URL
        const token = searchParams.get('token');
        
        if (!token) {
          setStatus('error');
          setMessage('Missing token. Please use the link from your email.');
          return;
        }
        
        // Initialize Firebase services
        const auth = getAuth();
        const functions = getFunctions();
        
        // Call the Cloud Function to verify the token and get a Firebase custom token
        const functionName = import.meta.env.VITE_USE_TEST_FUNCTIONS === 'true' 
          ? 'testVerifyTokenAndLogin' 
          : 'verifyTokenAndLogin';
        const verifyTokenFn = httpsCallable(functions, functionName);
        const result = await verifyTokenFn({ token });
        
        // Get the Firebase custom token from the result
        const data = result.data as { firebaseToken: string, assignmentId: string };
        const firebaseToken = data.firebaseToken;
        const assignmentId = data.assignmentId;
        
        if (!firebaseToken) {
          throw new Error('No authentication token received');
        }
        
        // Sign in with the custom token
        await signInWithCustomToken(auth, firebaseToken);
        
        // Get the assignment details
        const assignment = await getAssignment(assignmentId);
        
        if (!assignment) {
          throw new Error('Assignment not found');
        }
        
        // Success - update state and navigate
        setStatus('success');
        setMessage('Login successful! Redirecting to your assignment...');
        
        // Redirect to the assignment page after a short delay
        setTimeout(() => {
          // For backward compatibility, navigate to the existing play endpoint
          // that uses the linkToken for the game itself, while using Firebase auth
          // for the user authentication
          navigate(`/play?token=${assignment.linkToken}`);
        }, 1500);
        
      } catch (error) {
        console.error('Error during token authentication:', error);
        setStatus('error');
        
        // Provide appropriate error message based on the error
        if (error instanceof Error) {
          if (error.message.includes('permission-denied') || 
              (error.message.includes('PERMISSION_DENIED') && error.message.includes('already been used'))) {
            // Token already used - try to get the assignment ID from the token
            try {
              const token = searchParams.get('token');
              if (token) {
                const functions = getFunctions();
                // Call a custom function to get assignment details for already used token
                const getTokenFunctionName = import.meta.env.VITE_USE_TEST_FUNCTIONS === 'true'
                  ? 'testGetAssignmentForToken'
                  : 'getAssignmentForToken';
                const getAssignmentForToken = httpsCallable(functions, getTokenFunctionName);
                const result = await getAssignmentForToken({ token });
                const data = result.data as { found: boolean, assignmentId?: string, linkToken?: string };
                
                if (data.found && data.linkToken) {
                  setStatus('success');
                  setMessage('Token already used. Redirecting to your assignment...');
                  
                  // Redirect directly to the assignment
                  setTimeout(() => {
                    navigate(`/play?token=${data.linkToken}`);
                  }, 1500);
                  return;
                }
              }
            } catch (redirectErr) {
              console.error('Error attempting redirect for used token:', redirectErr);
            }
            
            setMessage('This link has already been used. Please use the "Return to Assignment" link from your email.');
          } else if (error.message.includes('not found') || error.message.includes('not-found')) {
            setMessage('Invalid or expired token. Please request a new assignment link.');
          } else if (error.message.includes('deadline-exceeded')) {
            setMessage('This link has expired. Please contact your teacher for a new assignment link.');
          } else {
            setMessage('An error occurred during authentication. Please try again later or contact support.');
          }
        } else {
          setMessage('An unexpected error occurred. Please try again or contact support.');
        }
      }
    };
    
    processToken();
  }, [searchParams, navigate]);
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Verse Learning</h1>
        
        {status === 'loading' && (
          <>
            <div className="flex justify-center my-4">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-700">{message}</p>
          </>
        )}
        
        {status === 'success' && (
          <p className="text-green-600 font-medium">{message}</p>
        )}
        
        {status === 'error' && (
          <div>
            <div className="text-red-500 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-600 font-medium mb-4">{message}</p>
            <a 
              href="/"
              className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Go to Homepage
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignmentLogin; 