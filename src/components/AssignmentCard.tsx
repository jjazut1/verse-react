import React from 'react';
import { Assignment } from '../types';
import { deleteAssignment } from '../services/assignmentService';

interface AssignmentCardProps {
  assignment: Assignment;
  onDelete: () => void;
  onViewAttempts: () => void;
}

const AssignmentCard: React.FC<AssignmentCardProps> = ({ 
  assignment, 
  onDelete,
  onViewAttempts
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  
  // Format date to display in user-friendly format
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };
  
  // Get status color based on assignment status
  const getStatusColor = () => {
    switch (assignment.status) {
      case 'assigned':
        return 'var(--color-gray-500)';
      case 'started':
        return 'var(--color-primary-600)';
      case 'completed':
        return 'var(--color-success-600)';
      default:
        return 'var(--color-gray-500)';
    }
  };
  
  // Check if assignment is past due
  const isPastDue = () => {
    const now = new Date();
    return assignment.deadline.toDate() < now && assignment.status !== 'completed';
  };
  
  // Handle delete button click
  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete the assignment for ${assignment.studentEmail}?`)) {
      try {
        setIsDeleting(true);
        await deleteAssignment(assignment.id || '');
        onDelete();
      } catch (error) {
        console.error('Error deleting assignment:', error);
        alert('Failed to delete assignment. Please try again.');
      } finally {
        setIsDeleting(false);
      }
    }
  };
  
  // Get the assignment link
  const getAssignmentLink = () => {
    return `${window.location.origin}/assignment/${assignment.linkToken}`;
  };
  
  // Copy link to clipboard
  const copyLinkToClipboard = () => {
    navigator.clipboard.writeText(getAssignmentLink())
      .then(() => {
        alert('Assignment link copied to clipboard!');
      })
      .catch((error) => {
        console.error('Error copying link:', error);
        alert('Failed to copy link. Please try again.');
      });
  };
  
  return (
    <div style={{
      border: '1px solid var(--color-gray-200)',
      borderRadius: 'var(--border-radius-md)',
      padding: 'var(--spacing-4)',
      marginBottom: 'var(--spacing-4)',
      backgroundColor: 'white',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      position: 'relative'
    }}>
      {/* Status indicator */}
      <div style={{
        position: 'absolute',
        top: 'var(--spacing-4)',
        right: 'var(--spacing-4)',
        display: 'inline-block',
        padding: 'var(--spacing-1) var(--spacing-2)',
        borderRadius: 'var(--border-radius-sm)',
        backgroundColor: isPastDue() ? 'var(--color-error-100)' : 'var(--color-gray-100)',
        color: isPastDue() ? 'var(--color-error-700)' : getStatusColor(),
        fontSize: 'var(--font-size-sm)',
        fontWeight: 'bold',
      }}>
        {isPastDue() ? 'OVERDUE' : assignment.status.toUpperCase()}
      </div>
      
      {/* Game info */}
      <div style={{
        fontSize: 'var(--font-size-xl)',
        fontWeight: 'bold',
        marginBottom: 'var(--spacing-2)',
        color: 'var(--color-gray-800)'
      }}>
        {assignment.gameName}
      </div>
      
      <div style={{
        fontSize: 'var(--font-size-sm)',
        color: 'var(--color-gray-600)',
        marginBottom: 'var(--spacing-3)'
      }}>
        Type: {assignment.gameType === 'sort-categories-egg' ? 'Categories' : 'Whack-a-Mole'}
      </div>
      
      {/* Assignment details */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 'var(--spacing-4)',
        marginBottom: 'var(--spacing-4)'
      }}>
        <div>
          <div style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-gray-500)',
            marginBottom: 'var(--spacing-1)'
          }}>
            Student
          </div>
          <div style={{
            fontSize: 'var(--font-size-md)',
            color: 'var(--color-gray-800)'
          }}>
            {assignment.studentEmail}
          </div>
        </div>
        
        <div>
          <div style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-gray-500)',
            marginBottom: 'var(--spacing-1)'
          }}>
            Deadline
          </div>
          <div style={{
            fontSize: 'var(--font-size-md)',
            color: isPastDue() ? 'var(--color-error-700)' : 'var(--color-gray-800)'
          }}>
            {formatDate(assignment.deadline.toDate())}
          </div>
        </div>
        
        <div>
          <div style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-gray-500)',
            marginBottom: 'var(--spacing-1)'
          }}>
            Completed
          </div>
          <div style={{
            fontSize: 'var(--font-size-md)',
            color: 'var(--color-gray-800)'
          }}>
            {assignment.completedCount} / {assignment.timesRequired}
          </div>
        </div>
        
        <div>
          <div style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-gray-500)',
            marginBottom: 'var(--spacing-1)'
          }}>
            Last Attempt
          </div>
          <div style={{
            fontSize: 'var(--font-size-md)',
            color: 'var(--color-gray-800)'
          }}>
            {assignment.lastCompletedAt ? formatDate(assignment.lastCompletedAt.toDate()) : 'N/A'}
          </div>
        </div>
      </div>
      
      {/* Action buttons */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        borderTop: '1px solid var(--color-gray-200)',
        paddingTop: 'var(--spacing-3)'
      }}>
        <div>
          <button
            onClick={copyLinkToClipboard}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--color-primary-600)',
              cursor: 'pointer',
              padding: 'var(--spacing-1) var(--spacing-2)',
              fontSize: 'var(--font-size-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-1)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 5H6C4.89543 5 4 5.89543 4 7V19C4 20.1046 4.89543 21 6 21H16C17.1046 21 18 20.1046 18 19V18M8 5C8 6.10457 8.89543 7 10 7H12C13.1046 7 14 6.10457 14 5M8 5C8 3.89543 8.89543 3 10 3H12C13.1046 3 14 3.89543 14 5M14 5H16C17.1046 5 18 5.89543 18 7V10M20 14H10M10 14L13 11M10 14L13 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Copy Link
          </button>
        </div>
        
        <div style={{
          display: 'flex',
          gap: 'var(--spacing-2)'
        }}>
          <button
            onClick={onViewAttempts}
            style={{
              backgroundColor: 'var(--color-primary-600)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--border-radius-sm)',
              padding: 'var(--spacing-1) var(--spacing-3)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-sm)'
            }}
          >
            View Attempts
          </button>
          
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            style={{
              backgroundColor: isDeleting ? 'var(--color-gray-400)' : 'var(--color-error-600)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--border-radius-sm)',
              padding: 'var(--spacing-1) var(--spacing-3)',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              fontSize: 'var(--font-size-sm)'
            }}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignmentCard; 