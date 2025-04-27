import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AssignGameForm from './AssignGameForm';

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
  const { isTeacher } = useAuth();
  const [showAssignForm, setShowAssignForm] = useState(false);
  
  // The icon to show when no thumbnail is available
  const gameIcon = getIconByType(type) || title.charAt(0);
  // Background color for the thumbnail placeholder
  const bgColor = getBackgroundColorByType(type);
  
  const renderThumbnail = () => (
    <div style={{
      width: '60px',
      height: '60px',
      backgroundColor: bgColor,
      borderRadius: 'var(--border-radius-md)',
      marginRight: 'var(--spacing-3)',
      overflow: 'hidden',
      flexShrink: 0,
      position: 'relative'
    }}>
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

  if (onClick) {
    return (
      <div style={{ position: 'relative' }}>
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
    <div style={{ position: 'relative' }}>
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
    <div style={{ position: 'relative' }}>
      <div style={containerStyles}>
        {renderThumbnail()}
        {renderInfo()}
      </div>
      {renderDeleteButton()}
      {renderAssignButton()}
      
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