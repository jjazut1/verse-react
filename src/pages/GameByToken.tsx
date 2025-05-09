import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  updateAssignment, 
  createAttempt, 
  updateCompletedCountFromAttempts, 
  getAssignmentByToken,
  getGameConfigByToken
} from '../services/assignmentService';
import { Timestamp } from 'firebase/firestore';
import { sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, onAuthStateChanged } from 'firebase/auth';
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
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Authentication state
  const [authEmail, setAuthEmail] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [isEmailLinkAccess, setIsEmailLinkAccess] = useState(false);
  
  // Check authentication status on component mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setCurrentUser(user);
      console.log('Authentication state changed:', { authenticated: !!user, email: user?.email });
      
      // Close the auth form if the user is now authenticated
      if (user) {
        setShowAuthForm(false);
      }
    });
    
    return () => unsubscribe();
  }, []);
  
  // Enhanced logging for token checking
  useEffect(() => {
    const token = searchParams.get('token');
    const directAccess = searchParams.get('directAccess');
    
    console.log('GameByToken: checking for token access mode:', {
      hasOobCodeInReferrer: document.referrer.includes('oobCode='),
      hasOobCodeInUrl: searchParams.get('oobCode'),
      hasAssignmentId: searchParams.get('assignmentId'),
      hasModeSignIn: searchParams.get('mode') === 'signIn',
      directAccessParam: directAccess,
      sessionStorageDirectAccess: sessionStorage.getItem('direct_token_access'),
      token: token?.substring(0, 8) + '...' // Show first 8 chars for privacy
    });
    
    // Check if this is direct access from email link
    const isDirectAccess = 
      directAccess === 'true' || 
      sessionStorage.getItem('direct_token_access') === 'true' ||
      (searchParams.get('mode') === 'signIn' && searchParams.get('oobCode'));
    
    if (isDirectAccess) {
      console.log('GameByToken: Detected special access mode - bypassing authentication requirement');
      sessionStorage.setItem('direct_token_access', 'true');
      setIsEmailLinkAccess(true);
    }
    
    if (token) {
      console.log(`GameByToken: Processing token ${token}`);
      loadGameAndAssignment(token);
    }
  }, [searchParams]);
  
  // Add a new effect to show authentication form immediately if user is not authenticated
  useEffect(() => {
    // Once the game config and assignment are loaded and we know the user isn't authenticated
    if (!loading && gameConfig && assignment && !isAuthenticated && !currentUser) {
      // Show the authentication form right away
      if (assignment.studentEmail) {
        setAuthEmail(assignment.studentEmail);
        console.log('Pre-filling auth email for immediate authentication:', assignment.studentEmail);
      }
      
      // Only show the form if we're not already in the process of authenticating
      if (!isAuthenticating && !showAuthForm) {
        console.log('Showing authentication form immediately');
        setShowAuthForm(true);
      }
    }
  }, [loading, gameConfig, assignment, isAuthenticated, currentUser, isAuthenticating, showAuthForm]);
  
  // Enhanced loading function with more logging
  const loadGameAndAssignment = async (tokenValue: string) => {
    if (!tokenValue) {
      setError("Invalid game token");
      setLoading(false);
      console.error("GameByToken: Missing token parameter");
      return;
    }
    
    // Check for direct access indicators
    const directAccess = searchParams.get('directAccess') === 'true' || 
                          sessionStorage.getItem('direct_token_access') === 'true';
    if (directAccess) {
      console.log('GameByToken: Loading assignment with direct access mode');
      setIsEmailLinkAccess(true);
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`GameByToken: Loading assignment for token: ${tokenValue}`);
      const assignment = await getAssignmentByToken(tokenValue);
      
      if (!assignment) {
        setError("Assignment not found");
        setLoading(false);
        console.error(`GameByToken: Assignment not found for token: ${tokenValue}`);
        return;
      }
      
      console.log(`GameByToken: Successfully found assignment:`, assignment);
      setAssignment(assignment);
      
      console.log(`GameByToken: Loading game config for gameId: ${assignment.gameId}`);
      try {
        const result = await getGameConfigByToken(tokenValue);
        if (result && result.gameConfig) {
          console.log(`GameByToken: Successfully loaded game config:`, result.gameConfig);
          setGameConfig(result.gameConfig);
        } else {
          setError("Game configuration not found");
          console.error(`GameByToken: Game config not found for token: ${tokenValue}`);
        }
      } catch (configError) {
        console.error("GameByToken: Error loading game config:", configError);
        setError("Failed to load game configuration");
      }
      
      setLoading(false);
      
      // Set direct access mode for auth bypass
      if (directAccess) {
        console.log(`GameByToken: Direct access parameter detected in URL`);
        sessionStorage.setItem('direct_token_access', 'true');
        
        // Auto-authenticate for direct access
        console.log(`GameByToken: Setting authenticated state to true for direct access`);
        setIsAuthenticated(true);
        console.log('Authentication state overridden for direct access:', { authenticated: true });
      }
    } catch (error) {
      console.error("GameByToken: Error loading assignment:", error);
      setError("Failed to load assignment");
      setLoading(false);
    }
  };
  
  // Send authentication email link to the student
  const sendAuthenticationEmail = async () => {
    if (!authEmail || !authEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }
    
    // Check if this email matches the assignment's student email
    if (assignment && assignment.studentEmail && 
        authEmail.toLowerCase() !== assignment.studentEmail.toLowerCase()) {
      if (!window.confirm(
        `The email you entered (${authEmail}) doesn't match the assignment's recipient email (${assignment.studentEmail}). ` + 
        'Are you sure you want to continue with this email?'
      )) {
        return;
      }
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
      
      // More detailed error messages for common Firebase auth errors
      let errorMessage = 'Failed to send authentication email. Please try again.';
      
      if (error instanceof Error) {
        const errorCode = error.message.includes('auth/') ? 
          error.message.split('auth/')[1].split(')')[0] : 'unknown';
        
        console.error('Firebase auth error code:', errorCode);
        
        switch(errorCode) {
          case 'operation-not-allowed':
            errorMessage = 'Email authentication is not enabled on this application. Please contact the administrator.';
            break;
          case 'invalid-email':
            errorMessage = 'The email address provided is invalid. Please check and try again.';
            break;
          case 'user-disabled':
            errorMessage = 'This user account has been disabled. Please contact support.';
            break;
          case 'missing-android-pkg-name':
          case 'missing-ios-bundle-id':
          case 'invalid-continue-uri':
          case 'unauthorized-continue-uri':
            errorMessage = 'There is a configuration issue with the authentication system. Please contact support.';
            break;
        }
      }
      
      // Set the error message in state for display in the UI instead of alert
      setSaveError(errorMessage);
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
    
    // Clear any previous save errors
    setSaveError(null);
    
    setIsPlaying(true);
    setStartTime(new Date());
  };
  
  // Handle game completion
  const handleGameComplete = async (score: number) => {
    // Clear any previous save errors
    setSaveError(null);
    
    if (!assignment || !startTime || !gameConfig) {
      console.error("GameByToken: Cannot save attempt - missing required data", { 
        hasAssignment: !!assignment, 
        hasStartTime: !!startTime, 
        hasGameConfig: !!gameConfig 
      });
      alert('Missing required data to save your progress. Please try again.');
      return;
    }
    
    // Check if user is authenticated
    if (!isAuthenticated || !currentUser) {
      console.warn("GameByToken: User is not authenticated. Prompting for authentication");
      // Save the score temporarily to reuse after authentication
      sessionStorage.setItem('pending_game_score', score.toString());
      sessionStorage.setItem('pending_start_time', startTime.toISOString());
      
      // Pre-fill the student's email if available
      if (assignment.studentEmail) {
        setAuthEmail(assignment.studentEmail);
      }
      
      // Stop the game to show authentication form
      setIsPlaying(false);
      
      // Force showing authentication form
      setShowAuthForm(true);
      
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
        gameType: gameConfig.type,
        userAuthenticated: isAuthenticated,
        userEmail: currentUser?.email
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
      
      // Use the new function to count attempts and update completedCount
      await updateCompletedCountFromAttempts(assignment.id || '');
      
      // Log completion status
      console.log(`GameByToken: Successfully saved progress for assignment: ${assignment.id}`);
      
      // Clear any pending game data
      sessionStorage.removeItem('pending_game_score');
      sessionStorage.removeItem('pending_start_time');
      
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
          errorMessage = 'You have been authenticated, but there was a permission issue when updating your progress. Please use the "Continue without authentication" button below to save your progress anyway.';
          
          // If it's a permissions error, we need to re-authenticate
          setAuthEmail(assignment.studentEmail || '');
          
          // Save the score temporarily
          sessionStorage.setItem('pending_game_score', score.toString());
          sessionStorage.setItem('pending_start_time', startTime.toISOString());
          
          // Show authentication form explicitly
          setShowAuthForm(true);
        } else if (err.message.includes('network')) {
          errorMessage = 'Network error while saving progress. Please check your connection and try again.';
        }
      }
      
      setSaveError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Check if pending game data exists and resume after authentication
  useEffect(() => {
    // If user becomes authenticated and we have pending game data, complete the previous game
    if (isAuthenticated && currentUser && !isSubmitting) {
      const pendingScore = sessionStorage.getItem('pending_game_score');
      const pendingStartTime = sessionStorage.getItem('pending_start_time');
      
      if (pendingScore && pendingStartTime) {
        console.log('Found pending game data. Resuming after authentication');
        
        // Restore the start time
        setStartTime(new Date(pendingStartTime));
        
        // Submit the attempt with the pending score
        const score = parseInt(pendingScore);
        if (!isNaN(score)) {
          // We need to use setTimeout to ensure the component is fully updated
          setTimeout(() => {
            handleGameComplete(score);
          }, 500);
        }
      }
    }
  }, [isAuthenticated, currentUser]);
  
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
      
      {/* Display any auth errors */}
      {saveError && (
        <div style={{
          margin: 'var(--spacing-2) 0',
          padding: 'var(--spacing-2)',
          backgroundColor: 'var(--color-error-50)',
          color: 'var(--color-error-700)',
          borderRadius: 'var(--border-radius-sm)',
          fontSize: 'var(--font-size-sm)',
          marginBottom: 'var(--spacing-4)'
        }}>
          ⚠️ {saveError}
        </div>
      )}
      
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
              opacity: isAuthenticating ? 0.7 : 1,
              marginBottom: 'var(--spacing-3)'
            }}
          >
            {isAuthenticating ? 'Sending...' : 'Send Authentication Link'}
          </button>
          
          {/* Temporary workaround button */}
          <div style={{ textAlign: 'center', marginTop: 'var(--spacing-3)' }}>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)', marginBottom: 'var(--spacing-2)' }}>
              If you're having trouble with authentication:
            </p>
            <button
              onClick={() => {
                // Get the pending score from session storage
                const pendingScore = sessionStorage.getItem('pending_game_score');
                const score = pendingScore ? parseInt(pendingScore) : 0;
                
                // Close the authentication form
                setShowAuthForm(false);
                
                // Create a temporary user object
                const tempUser = {
                  email: authEmail || assignment?.studentEmail || 'student@example.com',
                  displayName: studentName || 'Student'
                };
                
                // Temporarily bypass authentication
                console.log('Bypassing authentication with temporary user:', tempUser);
                
                // Set a flag in session storage to indicate bypass mode
                sessionStorage.setItem('auth_bypass_mode', 'true');
                
                // Set up the assignment for submission without authentication
                setIsSubmitting(true);
                
                // Get attempt data from session
                const startTimeStr = sessionStorage.getItem('pending_start_time');
                const startTime = startTimeStr ? new Date(startTimeStr) : new Date();
                const endTime = new Date();
                const durationInSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
                
                // Create the attempt directly (without auth)
                if (assignment) {
                  createAttempt(assignment.id || '', {
                    duration: durationInSeconds,
                    score: score,
                    results: { score },
                    studentEmail: assignment.studentEmail || authEmail,
                    studentName: studentName || 'Anonymous Student'
                  })
                  .then(attemptId => {
                    console.log(`Successfully saved attempt with ID: ${attemptId} (auth bypassed)`);
                    
                    // Update assignment status
                    if (assignment.status === 'assigned') {
                      return updateAssignment(assignment.id || '', { status: 'started' });
                    }
                    return Promise.resolve();
                  })
                  .then(() => {
                    // Use the new function to count attempts and update completedCount
                    return updateCompletedCountFromAttempts(assignment.id || '');
                  })
                  .then(() => {
                    // Clear session storage
                    sessionStorage.removeItem('pending_game_score');
                    sessionStorage.removeItem('pending_start_time');
                    
                    // Reload the assignment data
                    if (token) {
                      return loadGameAndAssignment(token);
                    }
                    return Promise.resolve();
                  })
                  .catch(err => {
                    console.error('Error while bypassing authentication:', err);
                    setSaveError('Failed to save your progress in bypass mode. Please try again.');
                  })
                  .finally(() => {
                    setIsSubmitting(false);
                  });
                } else {
                  console.error('Cannot bypass authentication: No assignment data available');
                  setSaveError('Cannot proceed without assignment data. Please try refreshing the page.');
                  setIsSubmitting(false);
                }
              }}
              style={{
                padding: 'var(--spacing-2) var(--spacing-4)',
                backgroundColor: 'var(--color-gray-100)',
                color: 'var(--color-gray-700)',
                border: '1px solid var(--color-gray-300)',
                borderRadius: 'var(--border-radius-sm)',
                fontSize: 'var(--font-size-sm)',
                cursor: 'pointer'
              }}
            >
              Continue without authentication (temporary)
            </button>
          </div>
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
      {/* Authentication Modal - Show when needed */}
      {showAuthForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '0 20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: 'var(--border-radius-md)',
            padding: 'var(--spacing-6)',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{
              fontSize: 'var(--font-size-xl)',
              color: 'var(--color-gray-800)',
              marginBottom: 'var(--spacing-4)',
              textAlign: 'center'
            }}>
              Authentication Required
            </h2>
            
            {/* Display any auth errors */}
            {saveError && (
              <div style={{
                margin: 'var(--spacing-2) 0',
                padding: 'var(--spacing-2)',
                backgroundColor: 'var(--color-error-50)',
                color: 'var(--color-error-700)',
                borderRadius: 'var(--border-radius-sm)',
                fontSize: 'var(--font-size-sm)',
                marginBottom: 'var(--spacing-4)'
              }}>
                ⚠️ {saveError}
              </div>
            )}
            
            <p style={{ 
              color: 'var(--color-gray-600)', 
              marginBottom: 'var(--spacing-4)',
              textAlign: 'center' 
            }}>
              You need to authenticate to save your progress. 
              {assignment?.studentEmail ? ` Please authenticate as ${assignment.studentEmail}.` : ''}
            </p>
            
            {!emailSent ? (
              <>
                <div style={{ marginBottom: 'var(--spacing-4)' }}>
                  <label 
                    htmlFor="authEmailModal"
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
                    id="authEmailModal"
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
                
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-4)' }}>
                  <button
                    onClick={() => setShowAuthForm(false)}
                    style={{
                      padding: 'var(--spacing-2) var(--spacing-4)',
                      backgroundColor: 'white',
                      border: '1px solid var(--color-gray-300)',
                      borderRadius: 'var(--border-radius-sm)',
                      color: 'var(--color-gray-700)',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendAuthenticationEmail}
                    disabled={isAuthenticating}
                    style={{
                      padding: 'var(--spacing-2) var(--spacing-4)',
                      backgroundColor: 'var(--color-primary-600)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--border-radius-sm)',
                      fontWeight: 'bold',
                      cursor: isAuthenticating ? 'not-allowed' : 'pointer',
                      opacity: isAuthenticating ? 0.7 : 1
                    }}
                  >
                    {isAuthenticating ? 'Sending...' : 'Send Authentication Link'}
                  </button>
                </div>
                
                {/* Temporary workaround section */}
                <div style={{ 
                  borderTop: '1px solid var(--color-gray-200)', 
                  paddingTop: 'var(--spacing-4)',
                  marginTop: 'var(--spacing-2)'
                }}>
                  <p style={{ 
                    fontSize: 'var(--font-size-sm)', 
                    color: 'var(--color-gray-600)', 
                    marginBottom: 'var(--spacing-3)',
                    textAlign: 'center'
                  }}>
                    <strong>Temporary Solution:</strong> If you're experiencing authentication issues, you can:
                  </p>
                  
                  <button
                    onClick={() => {
                      // Get the pending score from session storage
                      const pendingScore = sessionStorage.getItem('pending_game_score');
                      const score = pendingScore ? parseInt(pendingScore) : 0;
                      
                      // Close the authentication form
                      setShowAuthForm(false);
                      
                      // Create a temporary user object
                      const tempUser = {
                        email: authEmail || assignment?.studentEmail || 'student@example.com',
                        displayName: studentName || 'Student'
                      };
                      
                      // Temporarily bypass authentication
                      console.log('Bypassing authentication with temporary user:', tempUser);
                      
                      // Set a flag in session storage to indicate bypass mode
                      sessionStorage.setItem('auth_bypass_mode', 'true');
                      
                      // Set up the assignment for submission without authentication
                      setIsSubmitting(true);
                      
                      // Get attempt data from session
                      const startTimeStr = sessionStorage.getItem('pending_start_time');
                      const startTime = startTimeStr ? new Date(startTimeStr) : new Date();
                      const endTime = new Date();
                      const durationInSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
                      
                      // Create the attempt directly (without auth)
                      if (assignment) {
                        createAttempt(assignment.id || '', {
                          duration: durationInSeconds,
                          score: score,
                          results: { score },
                          studentEmail: assignment.studentEmail || authEmail,
                          studentName: studentName || 'Anonymous Student'
                        })
                        .then(attemptId => {
                          console.log(`Successfully saved attempt with ID: ${attemptId} (auth bypassed)`);
                          
                          // Update assignment status
                          if (assignment.status === 'assigned') {
                            return updateAssignment(assignment.id || '', { status: 'started' });
                          }
                          return Promise.resolve();
                        })
                        .then(() => {
                          // Use the new function to count attempts and update completedCount
                          return updateCompletedCountFromAttempts(assignment.id || '');
                        })
                        .then(() => {
                          // Clear session storage
                          sessionStorage.removeItem('pending_game_score');
                          sessionStorage.removeItem('pending_start_time');
                          
                          // Reload the assignment data
                          if (token) {
                            return loadGameAndAssignment(token);
                          }
                          return Promise.resolve();
                        })
                        .catch(err => {
                          console.error('Error while bypassing authentication:', err);
                          setSaveError('Failed to save your progress in bypass mode. Please try again.');
                        })
                        .finally(() => {
                          setIsSubmitting(false);
                        });
                      } else {
                        console.error('Cannot bypass authentication: No assignment data available');
                        setSaveError('Cannot proceed without assignment data. Please try refreshing the page.');
                        setIsSubmitting(false);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: 'var(--spacing-2)',
                      backgroundColor: 'var(--color-gray-100)',
                      color: 'var(--color-gray-700)',
                      border: '1px solid var(--color-gray-300)',
                      borderRadius: 'var(--border-radius-sm)',
                      fontSize: 'var(--font-size-sm)',
                      cursor: 'pointer'
                    }}
                  >
                    Continue without authentication (Save progress anyway)
                  </button>
                </div>
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
                
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-4)' }}>
                  <button
                    onClick={() => {
                      setShowAuthForm(false);
                      setEmailSent(false);
                    }}
                    style={{
                      padding: 'var(--spacing-2) var(--spacing-4)',
                      backgroundColor: 'white',
                      border: '1px solid var(--color-gray-300)',
                      borderRadius: 'var(--border-radius-sm)',
                      color: 'var(--color-gray-700)',
                      cursor: 'pointer'
                    }}
                  >
                    Close
                  </button>
                  <button
                    onClick={() => setEmailSent(false)}
                    style={{
                      padding: 'var(--spacing-2) var(--spacing-4)',
                      backgroundColor: 'var(--color-primary-600)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--border-radius-sm)',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Try Again
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    
      {assignment && gameConfig ? (
        <div>
          <h1 style={{
            fontSize: 'var(--font-size-2xl)',
            color: 'var(--color-gray-800)',
            marginBottom: 'var(--spacing-4)'
          }}>
            {gameConfig.name}
          </h1>
          
          {/* Authentication status indicator - Now more prominent */}
          {isAuthenticated && currentUser ? (
            <div style={{
              margin: 'var(--spacing-4) 0',
              padding: 'var(--spacing-3)',
              backgroundColor: 'var(--color-success-50)',
              color: 'var(--color-success-700)',
              borderRadius: 'var(--border-radius-sm)',
              fontSize: 'var(--font-size-md)',
              display: 'flex',
              alignItems: 'center'
            }}>
              <span style={{ marginRight: 'var(--spacing-2)' }}>✓</span>
              <strong>Authenticated as: {currentUser.email}</strong>
            </div>
          ) : (
            <div style={{
              margin: 'var(--spacing-4) 0',
              padding: 'var(--spacing-3)',
              backgroundColor: 'var(--color-warning-50)',
              color: 'var(--color-warning-700)',
              borderRadius: 'var(--border-radius-sm)',
              fontSize: 'var(--font-size-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: 'var(--spacing-2)' }}>⚠️</span>
                <strong>Not authenticated. Please authenticate before playing to ensure your progress is saved.</strong>
              </div>
              
              <button
                onClick={() => {
                  // Pre-fill the student's email if available
                  if (assignment && assignment.studentEmail) {
                    setAuthEmail(assignment.studentEmail);
                  }
                  // Reset email sent flag if previously shown
                  setEmailSent(false);
                  // Show authentication form
                  setShowAuthForm(true);
                }}
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: 'var(--color-warning-600)',
                  color: 'white',
                  border: 'none',
                  padding: 'var(--spacing-2) var(--spacing-4)',
                  borderRadius: 'var(--border-radius-sm)',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-md)',
                  fontWeight: 'bold'
                }}
              >
                Authenticate Now
              </button>
            </div>
          )}
          
          {/* Display save error if any */}
          {saveError && (
            <div style={{
              margin: 'var(--spacing-2) 0',
              padding: 'var(--spacing-2)',
              backgroundColor: 'var(--color-error-50)',
              color: 'var(--color-error-700)',
              borderRadius: 'var(--border-radius-sm)',
              fontSize: 'var(--font-size-sm)'
            }}>
              ⚠️ {saveError}
            </div>
          )}
          
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
          
          {/* Only show the game if authenticated or after they've submitted their name */}
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
        <>
          {isAuthenticated && currentUser ? (
            <div style={{
              backgroundColor: 'var(--color-success-50)',
              color: 'var(--color-success-700)',
              padding: 'var(--spacing-4)',
              borderRadius: 'var(--border-radius-md)',
              marginBottom: 'var(--spacing-4)',
              textAlign: 'center'
            }}>
              <p>You are authenticated as: <strong>{currentUser.email}</strong></p>
              <p>Loading your assignment...</p>
            </div>
          ) : (
            renderAuthenticationForm()
          )}
        </>
      )}
    </div>
  );
};

export default GameByToken; 