import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAssignmentByToken, createAttempt, updateAssignment } from '../services/assignmentService';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Assignment } from '../types';
import { Timestamp } from 'firebase/firestore';

// Game components (import as needed)
import SortCategoriesEggRevealAdapter from '../components/games/sort-categories-egg-reveal/SortCategoriesEggRevealAdapter';
import WhackAMoleAdapter from '../components/games/whack-a-mole/WhackAMoleAdapter';

const AssignmentDetails: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameConfig, setGameConfig] = useState<any | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentNameSubmitted, setStudentNameSubmitted] = useState(false);
  
  // Load assignment when token is available
  useEffect(() => {
    if (token) {
      loadAssignment(token);
    }
  }, [token]);
  
  // Load the assignment using the token
  const loadAssignment = async (tokenValue: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const assignmentData = await getAssignmentByToken(tokenValue);
      
      if (!assignmentData) {
        setError('Assignment not found. The link may be invalid or expired.');
        setLoading(false);
        return;
      }
      
      setAssignment(assignmentData);
      
      // Load game config if assignment was found
      if (assignmentData.gameId) {
        try {
          const gameDoc = await getDoc(doc(db, 'games', assignmentData.gameId));
          
          if (gameDoc.exists()) {
            setGameConfig(gameDoc.data());
          } else {
            setError('Game not found. It may have been deleted.');
          }
        } catch (gameErr) {
          console.error('Error loading game config:', gameErr);
          setError('Failed to load game details. Please try again.');
        }
      }
    } catch (err) {
      console.error('Error loading assignment:', err);
      setError('Failed to load assignment. Please try again.');
    } finally {
      setLoading(false);
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
  const handleGameComplete = async (results: any) => {
    if (!assignment || !startTime) return;
    
    setIsSubmitting(true);
    
    try {
      const endTime = new Date();
      const durationInSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      
      // Use the assignment's studentEmail and the provided studentName
      await createAttempt(assignment.id || '', {
        duration: durationInSeconds,
        score: results.score,
        results: results,
        studentEmail: assignment.studentEmail, // Use the email from the assignment
        studentName: studentName || 'Unknown Student' // Use the name entered by the student or a default
      });
      
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
      
      setIsPlaying(false);
      setStartTime(null);
      
      // Reload assignment to get updated completion status
      if (token) {
        await loadAssignment(token);
      }
    } catch (err) {
      console.error('Error submitting attempt:', err);
      alert('Failed to save your progress. Please try again.');
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
    
    switch (assignment.gameType) {
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
  
  // Main render function
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'var(--spacing-6)' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--spacing-8)', color: 'var(--color-gray-500)' }}>
          Loading assignment...
        </div>
      ) : error ? (
        <div style={{ 
          backgroundColor: 'var(--color-error-100)', 
          color: 'var(--color-error-700)', 
          padding: 'var(--spacing-6)', 
          borderRadius: 'var(--border-radius-md)',
          textAlign: 'center',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--spacing-4)' }}>
            {error}
          </h2>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: 'var(--spacing-2) var(--spacing-4)',
              backgroundColor: 'var(--color-primary-600)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--border-radius-sm)',
              cursor: 'pointer'
            }}
          >
            Go to Home
          </button>
        </div>
      ) : assignment ? (
        isPlaying ? (
          // Game playing view
          <div>
            {renderGame()}
          </div>
        ) : (
          // Assignment details view
          <div style={{
            backgroundColor: 'white',
            borderRadius: 'var(--border-radius-md)',
            padding: 'var(--spacing-6)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
          }}>
            <h1 style={{ 
              fontSize: 'var(--font-size-2xl)',
              color: 'var(--color-gray-800)',
              marginBottom: 'var(--spacing-4)',
              textAlign: 'center'
            }}>
              {assignment.gameName}
            </h1>
            
            {isPastDue() && !isCompleted() && (
              <div style={{
                backgroundColor: 'var(--color-error-100)',
                color: 'var(--color-error-700)',
                padding: 'var(--spacing-3)',
                borderRadius: 'var(--border-radius-md)',
                marginBottom: 'var(--spacing-4)',
                textAlign: 'center',
                fontWeight: 'bold'
              }}>
                This assignment is past due. Please contact your teacher.
              </div>
            )}
            
            {isCompleted() && (
              <div style={{
                backgroundColor: 'var(--color-success-100)',
                color: 'var(--color-success-700)',
                padding: 'var(--spacing-3)',
                borderRadius: 'var(--border-radius-md)',
                marginBottom: 'var(--spacing-4)',
                textAlign: 'center',
                fontWeight: 'bold'
              }}>
                You have completed this assignment! Good job!
              </div>
            )}
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: 'var(--spacing-4)',
              marginBottom: 'var(--spacing-6)'
            }}>
              <div style={{
                padding: 'var(--spacing-3)',
                border: '1px solid var(--color-gray-200)',
                borderRadius: 'var(--border-radius-md)'
              }}>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
                  Assigned To
                </div>
                <div style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-gray-800)' }}>
                  {assignment.studentEmail}
                </div>
              </div>
              
              <div style={{
                padding: 'var(--spacing-3)',
                border: '1px solid var(--color-gray-200)',
                borderRadius: 'var(--border-radius-md)'
              }}>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
                  Due By
                </div>
                <div style={{ 
                  fontSize: 'var(--font-size-md)', 
                  color: isPastDue() && !isCompleted() ? 'var(--color-error-700)' : 'var(--color-gray-800)' 
                }}>
                  {formatDate(assignment.deadline.toDate())}
                </div>
              </div>
              
              <div style={{
                padding: 'var(--spacing-3)',
                border: '1px solid var(--color-gray-200)',
                borderRadius: 'var(--border-radius-md)'
              }}>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
                  Times to Complete
                </div>
                <div style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-gray-800)' }}>
                  {assignment.completedCount} / {assignment.timesRequired}
                </div>
              </div>
            </div>
            
            {!isPastDue() && !isCompleted() ? (
              studentNameSubmitted ? (
                <button
                  onClick={handleStartGame}
                  style={{
                    display: 'block',
                    width: '100%',
                    maxWidth: '300px',
                    margin: '0 auto',
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
                  Start Game
                </button>
              ) : (
                renderStudentNameForm()
              )
            ) : null}
          </div>
        )
      ) : null}
    </div>
  );
};

export default AssignmentDetails; 