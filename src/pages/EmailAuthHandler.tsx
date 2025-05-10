import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * EmailAuthHandler - Redirects /email-auth to /login while preserving query parameters
 * This component bridges the production authentication flow (r2process.com/email-auth) with
 * the local development authentication flow
 */
const EmailAuthHandler: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    // Get all query parameters
    const params = new URLSearchParams();
    for (const [key, value] of searchParams.entries()) {
      params.append(key, value);
    }
    
    // Always ensure directAccess=true is included when coming from email link
    if (!params.has('directAccess')) {
      params.append('directAccess', 'true');
    }
    
    // Check if we have assignment ID and token for direct game access
    const assignmentId = params.get('assignmentId');
    const token = params.get('token');
    
    // If we have both, we can redirect directly to the game
    if (assignmentId && token) {
      console.log('EmailAuthHandler: Direct assignment access detected, redirecting to play with token');
      sessionStorage.setItem('direct_token_access', 'true');
      navigate(`/play?token=${token}&directAccess=true`);
      return;
    }
    
    // Redirect to login page with parameters intact (fallback)
    console.log('EmailAuthHandler: Redirecting to /login with params:', params.toString());
    navigate(`/login?${params.toString()}`);
  }, [navigate, searchParams]);
  
  return (
    <div className="p-4 text-center">
      <p>Redirecting to game...</p>
    </div>
  );
};

export default EmailAuthHandler; 