import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Add reCAPTCHA types
declare global {
  interface Window {
    grecaptcha: {
      render: (container: string | HTMLElement, parameters: any) => number;
      reset: (widgetId?: number) => void;
      execute: (widgetId?: number) => void;
      getResponse: (widgetId?: number) => string;
    };
  }
}

// reCAPTCHA site key - replace with your own
const RECAPTCHA_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'; // This is a test key, replace with your actual key in production

const containerStyle = {
  maxWidth: '400px',
  margin: '0 auto',
  padding: '2rem',
  backgroundColor: 'white',
  borderRadius: 'var(--border-radius-lg)',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
};

const formStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '1rem',
};

const inputStyle = {
  padding: '0.75rem',
  borderRadius: 'var(--border-radius-md)',
  border: '1px solid var(--color-gray-300)',
  fontSize: '1rem',
};

const buttonStyle = {
  padding: '0.75rem',
  borderRadius: 'var(--border-radius-md)',
  backgroundColor: 'var(--color-primary-500)',
  color: 'white',
  border: 'none',
  fontSize: '1rem',
  fontWeight: 'bold' as const,
  cursor: 'pointer',
  transition: 'background-color 0.2s',
};

const googleButtonStyle = {
  ...buttonStyle,
  backgroundColor: '#4285F4',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
};

const errorStyle = {
  color: 'var(--color-error)',
  fontSize: '0.875rem',
  marginTop: '0.25rem',
};

const switchModeStyle = {
  marginTop: '1rem',
  textAlign: 'center' as const,
  fontSize: '0.875rem',
  color: 'var(--color-gray-600)',
};

const linkStyle = {
  color: 'var(--color-primary-500)',
  textDecoration: 'none',
  fontWeight: 'bold',
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [recaptchaVerified, setRecaptchaVerified] = useState(false);
  const recaptchaRef = useRef<number | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const { login, signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Initialize reCAPTCHA when in signup mode
  useEffect(() => {
    if (mode === 'signup' && recaptchaContainerRef.current && window.grecaptcha && !recaptchaRef.current) {
      try {
        recaptchaRef.current = window.grecaptcha.render(recaptchaContainerRef.current, {
          'sitekey': RECAPTCHA_SITE_KEY,
          'callback': () => {
            setRecaptchaVerified(true);
          },
          'expired-callback': () => {
            setRecaptchaVerified(false);
          }
        });
      } catch (error) {
        console.error('Error rendering reCAPTCHA:', error);
      }
    } else if (mode === 'login' && recaptchaRef.current && window.grecaptcha) {
      // Reset reCAPTCHA when switching to login mode
      window.grecaptcha.reset(recaptchaRef.current);
      setRecaptchaVerified(false);
      recaptchaRef.current = null;
    }
  }, [mode]);

  const validateForm = () => {
    setError('');
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!password.trim()) {
      setError('Password is required');
      return false;
    }
    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (mode === 'signup' && !recaptchaVerified) {
      setError('Please complete the reCAPTCHA verification');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      setError('');

      if (mode === 'login') {
        await login(email, password);
      } else {
        // Get the reCAPTCHA token if we're in signup mode
        const recaptchaToken = recaptchaRef.current && window.grecaptcha 
          ? window.grecaptcha.getResponse(recaptchaRef.current) 
          : undefined;
        
        await signup(email, password, recaptchaToken);
      }
      
      // Navigate to home page on success
      navigate('/');
    } catch (err: any) {
      let errorMessage = 'Failed to ';
      errorMessage += mode === 'login' ? 'log in' : 'sign up';
      
      // Extract Firebase error message if available
      if (err.code) {
        switch (err.code) {
          case 'auth/user-not-found':
            errorMessage = 'No account found with this email';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Incorrect password';
            break;
          case 'auth/email-already-in-use':
            errorMessage = 'An account with this email already exists';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password is too weak';
            break;
          default:
            errorMessage += `: ${err.message}`;
        }
      }
      
      setError(errorMessage);
      
      // If there was an error and we're in signup mode, reset the reCAPTCHA
      if (mode === 'signup' && recaptchaRef.current && window.grecaptcha) {
        window.grecaptcha.reset(recaptchaRef.current);
        setRecaptchaVerified(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError('');
      await loginWithGoogle();
      navigate('/');
    } catch (err: any) {
      setError('Failed to sign in with Google');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError('');
    setRecaptchaVerified(false);
    
    // Need to reset and re-render reCAPTCHA when toggling modes
    if (recaptchaRef.current && window.grecaptcha) {
      window.grecaptcha.reset(recaptchaRef.current);
      recaptchaRef.current = null;
    }
  };

  return (
    <div style={{ padding: '2rem', backgroundColor: 'var(--color-gray-100)', minHeight: 'calc(100vh - 64px)' }}>
      <div style={containerStyle}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--color-primary-700)' }}>
          {mode === 'login' ? 'Log In' : 'Sign Up'}
        </h2>
        
        {error && <div style={errorStyle}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={formStyle}>
          <div>
            <label htmlFor="email" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              required
            />
          </div>
          
          <div>
            <label htmlFor="password" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              required
            />
          </div>
          
          {mode === 'signup' && (
            <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
              <div ref={recaptchaContainerRef}></div>
              {recaptchaVerified && (
                <div style={{ 
                  color: 'var(--color-success)', 
                  fontSize: '0.875rem', 
                  marginTop: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
                  </svg>
                  <span>Verification complete</span>
                </div>
              )}
            </div>
          )}
          
          <button
            type="submit"
            style={buttonStyle}
            disabled={isLoading || (mode === 'signup' && !recaptchaVerified)}
          >
            {isLoading ? 'Processing...' : mode === 'login' ? 'Log In' : 'Sign Up'}
          </button>
        </form>
        
        <div style={{ margin: '1rem 0', textAlign: 'center', position: 'relative' }}>
          <hr style={{ border: '1px solid var(--color-gray-200)' }} />
          <span style={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)', 
            backgroundColor: 'white',
            padding: '0 0.5rem',
            color: 'var(--color-gray-500)',
            fontSize: '0.875rem'
          }}>
            OR
          </span>
        </div>
        
        <button 
          onClick={handleGoogleSignIn} 
          style={googleButtonStyle}
          disabled={isLoading}
        >
          <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
          </svg>
          <span>Continue with Google</span>
        </button>
        
        <div style={switchModeStyle}>
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <a href="#" onClick={toggleMode} style={linkStyle}>
                Sign up
              </a>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <a href="#" onClick={toggleMode} style={linkStyle}>
                Log in
              </a>
            </>
          )}
        </div>
        
        {mode === 'login' && (
          <div style={{ ...switchModeStyle, marginTop: '0.5rem' }}>
            <Link to="/forgot-password" style={linkStyle}>
              Forgot password?
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login; 