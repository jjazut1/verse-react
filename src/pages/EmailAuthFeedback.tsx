import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { trackEmailLinkAuthCompleted } from '../services/analyticsService';

const containerStyle = {
  maxWidth: '600px',
  margin: '2rem auto',
  padding: '2rem',
  backgroundColor: 'white',
  borderRadius: 'var(--border-radius-lg)',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
};

const formStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '1.5rem',
};

const fieldStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '0.5rem',
};

const labelStyle = {
  fontWeight: 'bold',
  fontSize: '1rem',
};

const inputStyle = {
  padding: '0.75rem',
  borderRadius: 'var(--border-radius-md)',
  border: '1px solid var(--color-gray-300)',
  fontSize: '1rem',
};

const textareaStyle = {
  ...inputStyle,
  minHeight: '120px',
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

const messageStyle = {
  padding: '1rem',
  borderRadius: 'var(--border-radius-md)',
  marginBottom: '1rem',
};

const successStyle = {
  ...messageStyle,
  backgroundColor: '#d4edda',
  color: '#155724',
};

const errorStyle = {
  ...messageStyle,
  backgroundColor: '#f8d7da',
  color: '#721c24',
};

const EmailAuthFeedback = () => {
  const [rating, setRating] = useState<number>(0);
  const [easeOfUse, setEaseOfUse] = useState<number>(0);
  const [issuesReported, setIssuesReported] = useState<string>('');
  const [comments, setComments] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const assignmentId = searchParams.get('assignmentId');
  const timeToComplete = searchParams.get('timeToComplete');
  
  useEffect(() => {
    // If no assignmentId or user is not authenticated, redirect to home
    if (!assignmentId || !currentUser) {
      navigate('/');
    }
    
    // Track authentication completion
    if (assignmentId && timeToComplete && currentUser) {
      trackEmailLinkAuthCompleted(assignmentId, parseInt(timeToComplete, 10));
    }
  }, [assignmentId, currentUser, navigate, timeToComplete]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    if (rating === 0 || easeOfUse === 0) {
      setError('Please provide ratings for all questions');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Create feedback document
      const feedbackId = `${assignmentId}_${currentUser?.uid || 'anonymous'}`;
      
      await setDoc(doc(db, 'emailAuthFeedback', feedbackId), {
        assignmentId,
        userId: currentUser?.uid || 'anonymous',
        userEmail: currentUser?.email || 'unknown',
        rating,
        easeOfUse,
        issuesReported,
        comments,
        createdAt: serverTimestamp(),
        timeToComplete: timeToComplete ? parseInt(timeToComplete, 10) : null
      });
      
      setIsSubmitted(true);
      
      // Redirect to the assignment after a short delay
      setTimeout(() => {
        if (assignmentId) {
          navigate(`/play?id=${assignmentId}`);
        } else {
          navigate('/');
        }
      }, 3000);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError('Error submitting feedback. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div style={containerStyle}>
      <h1>Email Authentication Feedback</h1>
      <p>Thank you for participating in our beta test! Please take a moment to provide feedback on your experience with the passwordless login.</p>
      
      {error && <div style={errorStyle}>{error}</div>}
      {isSubmitted && (
        <div style={successStyle}>
          <p>Thank you for your feedback! You will be redirected to your assignment shortly.</p>
        </div>
      )}
      
      {!isSubmitted && (
        <form style={formStyle} onSubmit={handleSubmit}>
          <div style={fieldStyle}>
            <label style={labelStyle}>How would you rate your overall experience with the email link authentication?</label>
            <div>
              {[1, 2, 3, 4, 5].map((value) => (
                <label key={value} style={{ marginRight: '1rem' }}>
                  <input
                    type="radio"
                    name="rating"
                    value={value}
                    checked={rating === value}
                    onChange={() => setRating(value)}
                  />
                  {value} {value === 1 ? '(Poor)' : value === 5 ? '(Excellent)' : ''}
                </label>
              ))}
            </div>
          </div>
          
          <div style={fieldStyle}>
            <label style={labelStyle}>How easy was it to access your assignment?</label>
            <div>
              {[1, 2, 3, 4, 5].map((value) => (
                <label key={value} style={{ marginRight: '1rem' }}>
                  <input
                    type="radio"
                    name="easeOfUse"
                    value={value}
                    checked={easeOfUse === value}
                    onChange={() => setEaseOfUse(value)}
                  />
                  {value} {value === 1 ? '(Very Difficult)' : value === 5 ? '(Very Easy)' : ''}
                </label>
              ))}
            </div>
          </div>
          
          <div style={fieldStyle}>
            <label style={labelStyle}>Did you encounter any issues? Please describe.</label>
            <textarea
              style={textareaStyle}
              value={issuesReported}
              onChange={(e) => setIssuesReported(e.target.value)}
              placeholder="Describe any issues you encountered..."
            />
          </div>
          
          <div style={fieldStyle}>
            <label style={labelStyle}>Any additional comments or suggestions?</label>
            <textarea
              style={textareaStyle}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Share your thoughts..."
            />
          </div>
          
          <button
            type="submit"
            style={buttonStyle}
            disabled={isLoading}
          >
            {isLoading ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>
      )}
    </div>
  );
};

export default EmailAuthFeedback; 