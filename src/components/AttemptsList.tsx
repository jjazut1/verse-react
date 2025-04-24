import React from 'react';
import { Attempt } from '../types';

interface AttemptsListProps {
  attempts: Attempt[];
  onClose: () => void;
}

const AttemptsList: React.FC<AttemptsListProps> = ({ attempts, onClose }) => {
  // Format date with time
  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Format duration in minutes and seconds
  const formatDuration = (durationInSeconds: number) => {
    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = durationInSeconds % 60;
    
    if (minutes === 0) {
      return `${seconds} sec`;
    }
    
    return `${minutes} min ${seconds} sec`;
  };
  
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: 'var(--border-radius-md)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      padding: 'var(--spacing-4)',
      maxWidth: '600px',
      width: '100%'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--spacing-4)',
        borderBottom: '1px solid var(--color-gray-200)',
        paddingBottom: 'var(--spacing-3)'
      }}>
        <h2 style={{
          fontSize: 'var(--font-size-xl)',
          color: 'var(--color-gray-800)',
          margin: 0
        }}>
          Attempt History
        </h2>
        <button
          onClick={onClose}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--color-gray-500)',
            cursor: 'pointer',
            fontSize: 'var(--font-size-xl)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '50%'
          }}
        >
          ×
        </button>
      </div>
      
      {attempts.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 'var(--spacing-6)',
          color: 'var(--color-gray-500)'
        }}>
          No attempts recorded yet.
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto auto',
            gap: 'var(--spacing-4)',
            fontWeight: 'bold',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-gray-700)',
            borderBottom: '1px solid var(--color-gray-200)',
            paddingBottom: 'var(--spacing-2)',
            marginBottom: 'var(--spacing-2)'
          }}>
            <div>Date & Time</div>
            <div>Duration</div>
            <div>Score</div>
          </div>
          
          <div style={{
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {attempts.map((attempt, index) => (
              <div 
                key={attempt.id || index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto',
                  gap: 'var(--spacing-4)',
                  padding: 'var(--spacing-2) 0',
                  borderBottom: '1px solid var(--color-gray-100)',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-gray-800)'
                }}
              >
                <div>{formatDateTime(attempt.timestamp.toDate())}</div>
                <div>{formatDuration(attempt.duration)}</div>
                <div>{attempt.score !== undefined ? attempt.score : 'N/A'}</div>
              </div>
            ))}
          </div>
        </>
      )}
      
      <div style={{
        marginTop: 'var(--spacing-4)',
        textAlign: 'right'
      }}>
        <button
          onClick={onClose}
          style={{
            backgroundColor: 'var(--color-primary-600)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--border-radius-sm)',
            padding: 'var(--spacing-2) var(--spacing-4)',
            cursor: 'pointer',
            fontSize: 'var(--font-size-sm)'
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default AttemptsList; 