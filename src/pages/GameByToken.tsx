import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getGameConfigByToken } from '../services/gameService';
import { updateAssignment, createAttempt } from '../services/assignmentService';
import { Timestamp } from 'firebase/firestore';
import { sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { auth } from '../config/firebase';

// Game components (import as needed)
import SortCategoriesEggRevealAdapter from '../components/games/sort-categories-egg-reveal/SortCategoriesEggRevealAdapter';
import WhackAMoleAdapter from '../components/games/whack-a-mole/WhackAMoleAdapter';

const GameByToken: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameConfig, setGameConfig] = useState<any | null>(null);
  const [assignment, setAssignment] = useState<any | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentNameSubmitted, setStudentNameSubmitted] = useState(false);
  
  // Authentication state
  const [authEmail, setAuthEmail] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  useEffect(() => {
    // Validate token parameter
    if (!token) {
      console.error("GameByToken: Missing token parameter");
      setError("Invalid game link. Please check the URL and try again.");
      setLoading(false);
      return;
    }
    console.log("GameByToken: Processing token", token);
    
    // Check if the URL is a sign-in link
    if (isSignInWithEmailLink(auth, window.location.href)) {
      // Get the email from localStorage - we stored it when we sent the link
      let email = window.localStorage.getItem('emailForSignIn');
      
      // If we don't have the email, ask for it
      if (!email) {
        email = window.prompt('Please provide your email for confirmation');
      }
      
      if (email) {
        setIsAuthenticating(true);
        // Sign in with the email link
        signInWithEmailLink(auth, email, window.location.href)
          .then(() => {
            // Clear the email from storage
            window.localStorage.removeItem('emailForSignIn');
            // Continue loading the game
            loadGameAndAssignment(token);
            setIsAuthenticating(false);
          })
          .catch((error) => {
            console.error('Error signing in with email link:', error);
            setError('Failed to authenticate. Please try accessing the game from your email again.');
            setIsAuthenticating(false);
          });
      }
    } else {
      // Not a sign-in link, just load the game
      loadGameAndAssignment(token);
    }
  }, [token]);
  
  // Load the game configuration and assignment using the token
  const loadGameAndAssignment = async (tokenValue: string) => {
    if (!tokenValue) {
      setError("Invalid game token");
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`GameByToken: Loading game config for token: ${tokenValue}`);
      const result = await getGameConfigByToken(tokenValue);
      
      if (!result || !result.gameConfig || !result.assignment) {
        throw new Error("Invalid game data received");
      }
      
      setGameConfig(result.gameConfig);
      setAssignment(result.assignment);
      
      // Pre-fill the authentication email
      if (result.assignment.studentEmail) {
        setAuthEmail(result.assignment.studentEmail);
      }
    } catch (err) {
      console.error('Error loading game by token:', err);
      
      // Provide a more specific error message for the user
      if (err instanceof Error && err.message.includes('permissions')) {
        setError(
          'Access denied. This link is specific to the email recipient and cannot be shared. ' +
          'Please check that you are using the correct link from your email or authenticate below.'
        );
      } else if (err instanceof Error && err.message.includes('not found')) {
        setError('Assignment not found. The link may be expired or invalid.');
      } else {
        setError('Failed to load the game. Please try again or contact your teacher.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Send authentication email link to the student
  const sendAuthenticationEmail = async () => {
    if (!authEmail || !authEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }
    
    try {
      setIsAuthenticating(true);
      
      // Save the email in localStorage so we can retrieve it later
      window.localStorage.setItem('emailForSignIn', authEmail);
      
      // The URL to redirect back to after authentication
      const currentUrl = window.location.href;
      
      // Send the sign-in link
      await sendSignInLinkToEmail(auth, authEmail, {
        url: currentUrl,
        handleCodeInApp: true,
      });
      
      setEmailSent(true);
    } catch (error) {
      console.error('Error sending sign-in link:', error);
      alert('Failed to send authentication email. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };
  
  // Format date for display
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };
  
  // Handle start game button click
  const handleStartGame = () => {
    if (!studentNameSubmitted) {
      if (!studentName.trim()) {
        alert('Please enter your name to continue.');
        return;
      }
      setStudentNameSubmitted(true);
    }
    
    setIsPlaying(true);
    setStartTime(new Date());
  };
  
  // Handle game completion
  const handleGameComplete = async (score: number) => {
    if (!assignment || !startTime || !gameConfig) {
      console.error("GameByToken: Cannot save attempt - missing required data", { 
        hasAssignment: !!assignment, 
        hasStartTime: !!startTime, 
        hasGameConfig: !!gameConfig 
      });
      alert('Missing required data to save your progress. Please try again.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const endTime = new Date();
      const durationInSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      
      // Debug log all attempt data before saving
      console.log("GameByToken: Attempting to save progress with data:", {
        assignmentId: assignment.id,
        studentEmail: assignment.studentEmail,
        studentName: studentName || 'Unknown Student',
        duration: durationInSeconds,
        score: score,
        scoreType: typeof score,
        gameType: gameConfig.type
      });
      
      // Ensure we have a valid number for score, default to 0 if not
      const validScore = typeof score === 'number' && !isNaN(score) ? score : 0;
      
      // Use the assignment's studentEmail and the provided studentName
      const attemptId = await createAttempt(assignment.id || '', {
        duration: durationInSeconds,
        score: validScore,
        results: { score: validScore },
        studentEmail: assignment.studentEmail,
        studentName: studentName || 'Unknown Student'
      });
      
      console.log(`GameByToken: Successfully saved attempt with ID: ${attemptId}`);
      
      // Update the assignment status if needed
      if (assignment.status === 'assigned') {
        await updateAssignment(assignment.id || '', { status: 'started' });
      }
      
      // Update the completedCount and potentially the status
      const newCompletedCount = (assignment.completedCount || 0) + 1;
      const isNowCompleted = newCompletedCount >= assignment.timesRequired;
      
      await updateAssignment(assignment.id || '', { 
        completedCount: newCompletedCount,
        lastCompletedAt: Timestamp.now(),
        status: isNowCompleted ? 'completed' : assignment.status
      });
      
      console.log(`GameByToken: Updated assignment - attempts: ${newCompletedCount}/${assignment.timesRequired}, completed: ${isNowCompleted}`);
      
      setIsPlaying(false);
      setStartTime(null);
      
      // Reload game and assignment to get updated completion status
      if (token) {
        await loadGameAndAssignment(token);
      }
    } catch (err) {
      console.error('Error submitting attempt:', err);
      
      // More descriptive error message to the user
      let errorMessage = 'Failed to save your progress. Please try again.';
      
      if (err instanceof Error) {
        console.error('Error details:', err.message);
        // Customize error message based on the specific error
        if (err.message.includes('undefined')) {
          errorMessage = 'There was an issue with your score data. Please try again.';
        } else if (err.message.includes('permission')) {
          errorMessage = 'You do not have permission to submit this attempt. Please check your authentication.';
        } else if (err.message.includes('network')) {
          errorMessage = 'Network error while saving progress. Please check your connection and try again.';
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Check if assignment is past due
  const isPastDue = () => {
    if (!assignment) return false;
    
    const now = new Date();
    return assignment.deadline.toDate() < now;
  };
  
  // Check if assignment is fully completed
  const isCompleted = () => {
    if (!assignment) return false;
    
    return assignment.completedCount >= assignment.timesRequired;
  };
  
  // Render appropriate game component based on type
  const renderGame = () => {
    if (!assignment || !gameConfig) return null;
    
    switch (gameConfig.type) {
      case 'sort-categories-egg':
        return (
          <SortCategoriesEggRevealAdapter
            config={gameConfig}
            onGameComplete={handleGameComplete}
            playerName={studentName}
          />
        );
      case 'whack-a-mole':
        return (
          <WhackAMoleAdapter
            config={gameConfig}
            onGameComplete={handleGameComplete}
            playerName={studentName}
          />
        );
      default:
        return (
          <div>Unsupported game type</div>
        );
    }
  };
  
  // Render authentication form
  const renderAuthenticationForm = () => (
    <div style={{
      backgroundColor: 'white',
      borderRadius: 'var(--border-radius-md)',
      padding: 'var(--spacing-6)',
      maxWidth: '500px',
      width: '100%',
      margin: '0 auto',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }}>
      <h2 style={{
        fontSize: 'var(--font-size-xl)',
        color: 'var(--color-gray-800)',
        marginBottom: 'var(--spacing-4)',
        textAlign: 'center'
      }}>
        Authenticate to Access Your Assignment
      </h2>
      
      {!emailSent ? (
        <>
          <p style={{ marginBottom: 'var(--spacing-4)', color: 'var(--color-gray-600)' }}>
            To confirm your identity and access your assignment, please enter your email address below. 
            We'll send you a secure link to continue.
          </p>
          
          <div style={{ marginBottom: 'var(--spacing-4)' }}>
            <label 
              htmlFor="authEmail"
              style={{
                display: 'block',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-gray-700)',
                marginBottom: 'var(--spacing-1)'
              }}
            >
              Your Email Address
            </label>
            <input
              id="authEmail"
              type="email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              placeholder="Enter your email"
              style={{
                width: '100%',
                padding: 'var(--spacing-2)',
                border: '1px solid var(--color-gray-300)',
                borderRadius: 'var(--border-radius-sm)',
                fontSize: 'var(--font-size-md)'
              }}
            />
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)', marginTop: 'var(--spacing-1)' }}>
              Please use the same email address that your teacher sent the assignment to.
            </p>
          </div>
          
          <button
            onClick={sendAuthenticationEmail}
            disabled={isAuthenticating}
            style={{
              width: '100%',
              padding: 'var(--spacing-3)',
              backgroundColor: 'var(--color-primary-600)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--border-radius-sm)',
              fontSize: 'var(--font-size-md)',
              fontWeight: 'bold',
              cursor: isAuthenticating ? 'not-allowed' : 'pointer',
              opacity: isAuthenticating ? 0.7 : 1
            }}
          >
            {isAuthenticating ? 'Sending...' : 'Send Authentication Link'}
          </button>
        </>
      ) : (
        <>
          <div style={{ 
            padding: 'var(--spacing-4)', 
            backgroundColor: 'var(--color-success-50)', 
            borderRadius: 'var(--border-radius-md)',
            marginBottom: 'var(--spacing-4)' 
          }}>
            <p style={{ color: 'var(--color-success-700)', marginBottom: 'var(--spacing-2)' }}>
              ✓ Authentication email sent!
            </p>
            <p style={{ color: 'var(--color-gray-700)' }}>
              We've sent an email to <strong>{authEmail}</strong>. 
              Please check your inbox and click the link to continue to your assignment.
            </p>
          </div>
          
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
            Don't see the email? Check your spam folder or try again.
          </p>
          
          <button
            onClick={() => setEmailSent(false)}
            style={{
              width: '100%',
              padding: 'var(--spacing-3)',
              backgroundColor: 'white',
              color: 'var(--color-gray-700)',
              border: '1px solid var(--color-gray-300)',
              borderRadius: 'var(--border-radius-sm)',
              fontSize: 'var(--font-size-md)',
              marginTop: 'var(--spacing-4)',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </>
      )}
    </div>
  );
  
  // Render student name form
  const renderStudentNameForm = () => (
    <div style={{
      backgroundColor: 'white',
      borderRadius: 'var(--border-radius-md)',
      padding: 'var(--spacing-6)',
      maxWidth: '500px',
      width: '100%',
      margin: '0 auto',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }}>
      <h2 style={{
        fontSize: 'var(--font-size-xl)',
        color: 'var(--color-gray-800)',
        marginBottom: 'var(--spacing-4)',
        textAlign: 'center'
      }}>
        Before You Start
      </h2>
      
      {assignment && (
        <div style={{ 
          marginBottom: 'var(--spacing-4)',
          backgroundColor: 'var(--color-info-50)',
          padding: 'var(--spacing-3)',
          borderRadius: 'var(--border-radius-sm)',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-info-700)'
        }}>
          <p>You're authenticated as: <strong>{assignment.studentEmail}</strong></p>
          <p style={{ marginTop: 'var(--spacing-2)' }}>This unique link was sent specifically to you.</p>
        </div>
      )}
      
      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <label 
          htmlFor="studentName"
          style={{
            display: 'block',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-gray-700)',
            marginBottom: 'var(--spacing-1)'
          }}
        >
          Your Name
        </label>
        <input
          id="studentName"
          type="text"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          placeholder="Enter your name"
          style={{
            width: '100%',
            padding: 'var(--spacing-2)',
            border: '1px solid var(--color-gray-300)',
            borderRadius: 'var(--border-radius-sm)',
            fontSize: 'var(--font-size-md)'
          }}
        />
      </div>
      
      <button
        onClick={handleStartGame}
        style={{
          width: '100%',
          padding: 'var(--spacing-3)',
          backgroundColor: 'var(--color-primary-600)',
          color: 'white',
          border: 'none',
          borderRadius: 'var(--border-radius-sm)',
          fontSize: 'var(--font-size-md)',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        Continue to Game
      </button>
    </div>
  );
  
  // Main render
  if (isAuthenticating) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>
        <p>Authenticating, please wait...</p>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>
        <p>Loading game...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: 'var(--spacing-8)',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <p style={{ color: 'var(--color-error-600)', marginBottom: 'var(--spacing-4)' }}>{error}</p>
        
        {/* Show authentication form if it's a permissions error */}
        {error.includes('Access denied') ? (
          renderAuthenticationForm()
        ) : (
          <button
            onClick={() => navigate('/')}
            style={{
              marginTop: 'var(--spacing-4)',
              padding: 'var(--spacing-2) var(--spacing-4)',
              backgroundColor: 'var(--color-primary-600)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--border-radius-sm)',
              cursor: 'pointer'
            }}
          >
            Go Home
          </button>
        )}
      </div>
    );
  }
  
  if (isPastDue()) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: 'var(--spacing-8)',
        color: 'var(--color-error-600)'
      }}>
        <p>This assignment is past due.</p>
        <p>Due date: {assignment && formatDate(assignment.deadline.toDate())}</p>
        <button
          onClick={() => navigate('/')}
          style={{
            marginTop: 'var(--spacing-4)',
            padding: 'var(--spacing-2) var(--spacing-4)',
            backgroundColor: 'var(--color-primary-600)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--border-radius-sm)',
            cursor: 'pointer'
          }}
        >
          Go Home
        </button>
      </div>
    );
  }
  
  if (isCompleted()) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: 'var(--spacing-8)',
        color: 'var(--color-success-600)'
      }}>
        <p>You have completed this assignment!</p>
        <p>Required attempts: {assignment && assignment.timesRequired}</p>
        <p>Your attempts: {assignment && assignment.completedCount}</p>
        <button
          onClick={() => navigate('/')}
          style={{
            marginTop: 'var(--spacing-4)',
            padding: 'var(--spacing-2) var(--spacing-4)',
            backgroundColor: 'var(--color-primary-600)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--border-radius-sm)',
            cursor: 'pointer'
          }}
        >
          Go Home
        </button>
      </div>
    );
  }
  
  return (
    <div style={{ 
      padding: 'var(--spacing-4)',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      {assignment && gameConfig ? (
        <div>
          <h1 style={{
            fontSize: 'var(--font-size-2xl)',
            color: 'var(--color-gray-800)',
            marginBottom: 'var(--spacing-4)'
          }}>
            {gameConfig.name}
          </h1>
          
          <div style={{
            marginBottom: 'var(--spacing-6)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-2)'
          }}>
            <p><strong>Due Date:</strong> {formatDate(assignment.deadline.toDate())}</p>
            <p><strong>Required Attempts:</strong> {assignment.timesRequired}</p>
            <p><strong>Completed Attempts:</strong> {assignment.completedCount || 0}</p>
          </div>
          
          {!isPlaying ? (
            !studentNameSubmitted ? renderStudentNameForm() : (
              <button
                onClick={handleStartGame}
                style={{
                  padding: 'var(--spacing-3) var(--spacing-6)',
                  backgroundColor: 'var(--color-primary-600)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: 'var(--font-size-lg)',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'block',
                  margin: '0 auto'
                }}
              >
                Start Game
              </button>
            )
          ) : (
            <div style={{ 
              backgroundColor: 'white',
              borderRadius: 'var(--border-radius-md)',
              padding: 'var(--spacing-4)',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}>
              {renderGame()}
            </div>
          )}
        </div>
      ) : (
        // If we don't have assignment and game data yet but no error occurred,
        // show the authentication form
        renderAuthenticationForm()
      )}
    </div>
  );
};

export default GameByToken; 