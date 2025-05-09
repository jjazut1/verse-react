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
    
    // Redirect to login page with parameters intact
    console.log('EmailAuthHandler: Redirecting to /login with params:', params.toString());
    navigate(`/login?${params.toString()}`);
  }, [navigate, searchParams]);
  
  return (
    <div className="p-4 text-center">
      <p>Redirecting to login page...</p>
    </div>
  );
};

export default EmailAuthHandler; 