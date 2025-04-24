import React, { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { createAssignment } from '../services/assignmentService';
import { useAuth } from '../contexts/AuthContext';

// Define GameObject interface based on Home.tsx's interface
interface GameObject {
  id: string;
  title: string;
  type: string;
  thumbnail?: string;
  userId?: string;
  share?: boolean;
  categories?: any[];
  eggQty?: number;
}

interface AssignGameFormProps {
  game: GameObject;
  onSuccess: () => void;
  onCancel: () => void;
}

const AssignGameForm: React.FC<AssignGameFormProps> = ({ 
  game, 
  onSuccess, 
  onCancel 
}) => {
  const { currentUser } = useAuth();
  const [studentEmail, setStudentEmail] = useState('');
  const [deadline, setDeadline] = useState('');
  const [timesRequired, setTimesRequired] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!currentUser) {
    return (
      <div style={{ 
        padding: 'var(--spacing-4)', 
        textAlign: 'center', 
        color: 'var(--color-gray-500)' 
      }}>
        You must be logged in to assign games.
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!studentEmail || !deadline) {
      setError('Please fill out all required fields');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Calculate deadline timestamp (end of day)
      const deadlineDate = new Date(deadline);
      deadlineDate.setHours(23, 59, 59, 999);
      
      await createAssignment({
        teacherId: currentUser.uid,
        studentEmail,
        gameId: game.id || '',
        gameName: game.title,
        gameType: game.type,
        deadline: Timestamp.fromDate(deadlineDate),
        timesRequired,
      });
      
      setShowSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      console.error('Error assigning game:', err);
      setError('Failed to create assignment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0];
  
  // If showing success message
  if (showSuccess) {
    return (
      <div style={{
        padding: 'var(--spacing-4)',
        textAlign: 'center',
        backgroundColor: 'white',
        borderRadius: 'var(--border-radius-md)',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ color: 'var(--color-success-500)', fontSize: 'var(--font-size-xl)', marginBottom: 'var(--spacing-2)' }}>
          ✓
        </div>
        <div style={{ color: 'var(--color-gray-800)', fontSize: 'var(--font-size-md)' }}>
          Game successfully assigned to {studentEmail}!
        </div>
        <div style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--spacing-2)' }}>
          An email with instructions has been sent to the student.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: 'var(--spacing-4)',
      backgroundColor: 'white',
      borderRadius: 'var(--border-radius-md)',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }}>
      <h2 style={{ 
        fontSize: 'var(--font-size-xl)',
        color: 'var(--color-gray-800)',
        marginBottom: 'var(--spacing-4)',
        textAlign: 'center'
      }}>
        Assign Game to Student
      </h2>
      
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{
            backgroundColor: 'var(--color-error-100)',
            color: 'var(--color-error-700)',
            padding: 'var(--spacing-2)',
            borderRadius: 'var(--border-radius-sm)',
            marginBottom: 'var(--spacing-4)'
          }}>
            {error}
          </div>
        )}
        
        <div style={{ marginBottom: 'var(--spacing-4)' }}>
          <div style={{ 
            fontSize: 'var(--font-size-md)',
            fontWeight: 'bold',
            color: 'var(--color-gray-800)',
            marginBottom: 'var(--spacing-2)'
          }}>
            Game: {game.title}
          </div>
          <div style={{ 
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-gray-600)',
          }}>
            Type: {game.type === 'sort-categories-egg' ? 'Categories' : 'Whack-a-Mole'}
          </div>
        </div>
        
        <div style={{ marginBottom: 'var(--spacing-4)' }}>
          <label 
            htmlFor="studentEmail"
            style={{
              display: 'block',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-gray-700)',
              marginBottom: 'var(--spacing-1)'
            }}
          >
            Student Email *
          </label>
          <input
            id="studentEmail"
            type="email"
            value={studentEmail}
            onChange={(e) => setStudentEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: 'var(--spacing-2)',
              border: '1px solid var(--color-gray-300)',
              borderRadius: 'var(--border-radius-sm)',
              fontSize: 'var(--font-size-md)'
            }}
            placeholder="student@example.com"
          />
        </div>
        
        <div style={{ marginBottom: 'var(--spacing-4)' }}>
          <label 
            htmlFor="deadline"
            style={{
              display: 'block',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-gray-700)',
              marginBottom: 'var(--spacing-1)'
            }}
          >
            Deadline *
          </label>
          <input
            id="deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            min={today}
            required
            style={{
              width: '100%',
              padding: 'var(--spacing-2)',
              border: '1px solid var(--color-gray-300)',
              borderRadius: 'var(--border-radius-sm)',
              fontSize: 'var(--font-size-md)'
            }}
          />
        </div>
        
        <div style={{ marginBottom: 'var(--spacing-4)' }}>
          <label 
            htmlFor="timesRequired"
            style={{
              display: 'block',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-gray-700)',
              marginBottom: 'var(--spacing-1)'
            }}
          >
            Number of Times to Complete
          </label>
          <select
            id="timesRequired"
            value={timesRequired}
            onChange={(e) => setTimesRequired(Number(e.target.value))}
            style={{
              width: '100%',
              padding: 'var(--spacing-2)',
              border: '1px solid var(--color-gray-300)',
              borderRadius: 'var(--border-radius-sm)',
              fontSize: 'var(--font-size-md)'
            }}
          >
            {[1, 2, 3, 4, 5].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 'var(--spacing-4)'
        }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: 'var(--spacing-2) var(--spacing-4)',
              backgroundColor: 'white',
              border: '1px solid var(--color-gray-300)',
              borderRadius: 'var(--border-radius-sm)',
              cursor: 'pointer',
              color: 'var(--color-gray-700)'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: 'var(--spacing-2) var(--spacing-4)',
              backgroundColor: 'var(--color-primary-600)',
              border: 'none',
              borderRadius: 'var(--border-radius-sm)',
              cursor: loading ? 'not-allowed' : 'pointer',
              color: 'white',
              fontWeight: 'bold',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Assigning...' : 'Assign Game'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssignGameForm; 