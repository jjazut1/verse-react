import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * LoginComplete component
 * 
 * This is a fallback component for the old authentication flow.
 * It redirects users to the appropriate page based on query parameters.
 */
const LoginComplete = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  
  useEffect(() => {
    // If user is authenticated, redirect based on query params
    if (currentUser) {
      const redirectTo = searchParams.get('redirectTo');
      const assignmentId = searchParams.get('assignmentId');
      
      if (assignmentId) {
        // Redirect to the feedback page for the assignment
        navigate(`/feedback?assignmentId=${assignmentId}`);
      } else if (redirectTo) {
        // Redirect to the specified page
        navigate(redirectTo);
      } else {
        // Default redirect to home
        navigate('/');
      }
    } else {
      // If not authenticated, redirect to login
      navigate('/login');
    }
  }, [currentUser, navigate, searchParams]);
  
  return (
    <div style={{ 
      maxWidth: '600px', 
      margin: '2rem auto', 
      padding: '2rem', 
      textAlign: 'center',
      backgroundColor: 'white',
      borderRadius: 'var(--border-radius-lg)',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }}>
      <h1>Completing Login...</h1>
      <p>Please wait while we redirect you.</p>
    </div>
  );
};

export default LoginComplete; 