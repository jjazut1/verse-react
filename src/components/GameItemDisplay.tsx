import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AssignGameForm from './AssignGameForm';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { regenerateThumbnail } from '../utils/regenerateThumbnails';

interface GameItemDisplayProps {
  title: string;
  type: string;
  thumbnail?: string;
  id?: string;
  isPlayable?: boolean;
  onClick?: () => void;
  isOwner?: boolean;
  onDelete?: () => void;
}

// Helper function to get background color based on game type
function getBackgroundColorByType(type: string): string {
  const colors: Record<string, string> = {
    'sort-categories-egg': '#f0e6ff', // Light purple
    'whack-a-mole': '#e6fff0',  // Light green
    'default': 'var(--color-primary-100)'
  };
  
  return colors[type] || colors.default;
}

// Helper function to get icon based on game type
function getIconByType(type: string): string {
  switch (type) {
    case 'sort-categories-egg':
      return '🥚';
    case 'whack-a-mole':
      return '🔨';
    default:
      return '';
  }
}

const GameItemDisplay: React.FC<GameItemDisplayProps> = ({ 
  title, 
  type, 
  thumbnail, 
  id, 
  isPlayable, 
  onClick, 
  isOwner, 
  onDelete 
}) => {
  const { isTeacher, currentUser } = useAuth();
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  // Check if user is an admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!currentUser) {
        setIsAdmin(false);
        return;
      }
      
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
    };
    
    checkAdminStatus();
  }, [currentUser]);
  
  // The icon to show when no thumbnail is available
  const gameIcon = getIconByType(type) || title.charAt(0);
  // Background color for the thumbnail placeholder
  const bgColor = getBackgroundColorByType(type);
  
  const handleRegenerateThumbnail = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!id) return;
    
    setIsRegenerating(true);
    try {
      const success = await regenerateThumbnail(id);
      if (success) {
        // Show a temporary success indicator
        const thumbnailEl = document.querySelector(`[data-game-id="${id}"] .game-thumbnail`);
        if (thumbnailEl) {
          thumbnailEl.classList.add('thumbnail-regenerated');
          setTimeout(() => {
            thumbnailEl.classList.remove('thumbnail-regenerated');
          }, 2000);
        }
        // Force refresh the thumbnail by reloading the page
        window.location.reload();
      } else {
        console.error('Failed to regenerate thumbnail');
      }
    } catch (error) {
      console.error('Error regenerating thumbnail:', error);
    } finally {
      setIsRegenerating(false);
    }
  };
  
  const renderThumbnail = () => (
    <div 
      className="game-thumbnail"
      style={{
      width: '60px',
      height: '60px',
      backgroundColor: bgColor,
      borderRadius: 'var(--border-radius-md)',
      marginRight: 'var(--spacing-3)',
      overflow: 'hidden',
      flexShrink: 0,
      position: 'relative'
      }}
    >
      {thumbnail ? (
        <img 
          src={thumbnail} 
          alt={title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      ) : (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-primary-700)',
          fontSize: 'var(--font-size-xl)'
        }}>
          {gameIcon}
        </div>
      )}
    </div>
  );
  
  const renderInfo = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--spacing-1)',
      flex: 1
    }}>
      <h3 style={{
        fontSize: 'var(--font-size-md)',
        color: 'var(--color-gray-800)',
        margin: 0
      }}>
        {title}
      </h3>
      <span style={{
        fontSize: 'var(--font-size-sm)',
        color: 'var(--color-gray-600)',
      }}>
        Type: {type}
      </span>
    </div>
  );

  const containerStyles = {
    display: 'flex',
    alignItems: 'center',
    padding: 'var(--spacing-3)',
    backgroundColor: 'white',
    borderRadius: 'var(--border-radius-md)',
    margin: 'var(--spacing-2) 0',
    border: '1px solid var(--color-gray-200)',
    cursor: isPlayable || onClick ? 'pointer' : 'default',
    transition: 'all 0.2s ease-in-out',
    textDecoration: 'none',
    color: 'inherit',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  };

  const renderDeleteButton = () => (
    isOwner && onDelete && (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete();
        }}
        style={{
          position: 'absolute',
          top: '50%',
          right: '16px',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-gray-500)',
          padding: 'var(--spacing-1)',
          borderRadius: 'var(--border-radius-sm)',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10
        }}
        aria-label="Delete"
        title="Delete"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
        </svg>
      </button>
    )
  );

  const renderAssignButton = () => {
    if (!isTeacher || !id) return null;
    
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowAssignForm(true);
        }}
        style={{
          position: 'absolute',
          top: '50%',
          right: isOwner ? '48px' : '16px',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-primary-600)',
          padding: 'var(--spacing-1)',
          borderRadius: 'var(--border-radius-sm)',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10
        }}
        aria-label="Assign"
        title="Assign to Student"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM7 10H9V17H7V10ZM11 7H13V17H11V7ZM15 13H17V17H15V13Z" fill="currentColor"/>
        </svg>
      </button>
    );
  };

  const renderRegenerateButton = () => {
    if (!isAdmin || !id) return null;
    
    return (
      <button
        onClick={handleRegenerateThumbnail}
        disabled={isRegenerating}
        style={{
          position: 'absolute',
          top: '50%',
          right: isOwner ? '80px' : (isTeacher ? '48px' : '16px'),
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: isRegenerating ? 'default' : 'pointer',
          color: isRegenerating ? 'var(--color-gray-400)' : 'var(--color-blue-600)',
          padding: 'var(--spacing-1)',
          borderRadius: 'var(--border-radius-sm)',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10
        }}
        aria-label="Regenerate thumbnail"
        title="Regenerate thumbnail"
      >
        {isRegenerating ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="loading-spinner">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="currentColor"/>
            <path d="M12 2V4C16.41 4 20 7.59 20 12H22C22 6.48 17.52 2 12 2Z" fill="currentColor"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4C7.58 4 4.01 7.58 4.01 12C4.01 16.42 7.58 20 12 20C15.73 20 18.84 17.45 19.73 14H17.65C16.83 16.33 14.61 18 12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6C13.66 6 15.14 6.69 16.22 7.78L13 11H20V4L17.65 6.35Z" fill="currentColor"/>
          </svg>
        )}
      </button>
    );
  };

  if (onClick) {
    return (
      <div style={{ position: 'relative' }} data-game-id={id}>
        <div 
          style={containerStyles} 
          onClick={onClick}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
          }}
        >
          {renderThumbnail()}
          {renderInfo()}
        </div>
        {renderDeleteButton()}
        {renderAssignButton()}
        {renderRegenerateButton()}
        
        {/* Assignment Form Modal */}
        {showAssignForm && (
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
            padding: 'var(--spacing-4)'
          }}>
            <AssignGameForm
              game={{ id: id || '', title, type, thumbnail }}
              onSuccess={() => setShowAssignForm(false)}
              onCancel={() => setShowAssignForm(false)}
            />
          </div>
        )}
      </div>
    );
  }

  return isPlayable && id ? (
    <div style={{ position: 'relative' }} data-game-id={id}>
      <RouterLink 
        to={`/game/${id}`} 
        style={containerStyles}
        onMouseOver={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
        }}
      >
        {renderThumbnail()}
        {renderInfo()}
      </RouterLink>
      {renderDeleteButton()}
      {renderAssignButton()}
      {renderRegenerateButton()}
      
      {/* Assignment Form Modal */}
      {showAssignForm && (
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
          padding: 'var(--spacing-4)'
        }}>
          <AssignGameForm
            game={{ id: id || '', title, type, thumbnail }}
            onSuccess={() => setShowAssignForm(false)}
            onCancel={() => setShowAssignForm(false)}
          />
        </div>
      )}
    </div>
  ) : (
    <div style={{ position: 'relative' }} data-game-id={id}>
      <div style={containerStyles}>
        {renderThumbnail()}
        {renderInfo()}
      </div>
      {renderDeleteButton()}
      {renderAssignButton()}
      {renderRegenerateButton()}
      
      {/* Assignment Form Modal */}
      {showAssignForm && (
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
          padding: 'var(--spacing-4)'
        }}>
          <AssignGameForm
            game={{ id: id || '', title, type, thumbnail }}
            onSuccess={() => setShowAssignForm(false)}
            onCancel={() => setShowAssignForm(false)}
          />
        </div>
      )}
    </div>
  );
};

export default GameItemDisplay; 