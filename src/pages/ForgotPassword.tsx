import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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

const errorStyle = {
  color: 'var(--color-error)',
  fontSize: '0.875rem',
  marginTop: '0.25rem',
};

const successStyle = {
  color: 'var(--color-success)',
  fontSize: '0.875rem',
  marginTop: '0.25rem',
};

const linkStyle = {
  color: 'var(--color-primary-500)',
  textDecoration: 'none',
  fontWeight: 'bold',
};

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    
    try {
      setError('');
      setMessage('');
      setIsLoading(true);
      
      await resetPassword(email);
      setMessage('Check your email inbox for further instructions');
    } catch (err: any) {
      let errorMessage = 'Failed to reset password';
      
      if (err.code) {
        switch (err.code) {
          case 'auth/user-not-found':
            errorMessage = 'No account found with this email';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address';
            break;
          default:
            errorMessage += `: ${err.message}`;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', backgroundColor: 'var(--color-gray-100)', minHeight: 'calc(100vh - 64px)' }}>
      <div style={containerStyle}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--color-primary-700)' }}>
          Reset Password
        </h2>
        
        {error && <div style={errorStyle}>{error}</div>}
        {message && <div style={successStyle}>{message}</div>}
        
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
          
          <button
            type="submit"
            style={buttonStyle}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Reset Password'}
          </button>
        </form>
        
        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem' }}>
          <Link to="/login" style={linkStyle}>
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword; 