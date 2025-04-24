import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

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
      {/* Type indicator */}
      <div style={{
        position: 'absolute',
        bottom: '2px',
        right: '2px',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: '50%',
        width: '18px',
        height: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px'
      }}>
        {type === 'sort-categories-egg' ? 'S' : 'W'}
      </div>
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
        Type: {type === 'sort-categories-egg' ? 'Categories' : 'Whack-a-Mole'}
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
    </div>
  ) : (
    <div style={{ position: 'relative' }}>
      <div style={containerStyles}>
        {renderThumbnail()}
        {renderInfo()}
      </div>
      {renderDeleteButton()}
    </div>
  );
};

export default GameItemDisplay; 