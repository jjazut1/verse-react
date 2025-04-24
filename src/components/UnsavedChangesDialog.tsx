import React from 'react';

interface UnsavedChangesDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  message?: string;
}

/**
 * Dialog component for prompting users about unsaved changes
 */
const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  message = 'You have unsaved changes. Are you sure you want to leave this page?'
}) => {
  if (!isOpen) return null;

  return (
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
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: 'var(--spacing-6)',
        borderRadius: 'var(--border-radius-md)',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ 
          fontSize: 'var(--font-size-xl)', 
          marginBottom: 'var(--spacing-4)',
          color: 'var(--color-warning-700)'
        }}>
          Unsaved Changes
        </h2>
        
        <p style={{ marginBottom: 'var(--spacing-6)' }}>
          {message}
        </p>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: 'var(--spacing-3)'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: 'var(--spacing-2) var(--spacing-4)',
              borderRadius: 'var(--border-radius-sm)',
              border: '1px solid var(--color-gray-300)',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            Stay on This Page
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: 'var(--spacing-2) var(--spacing-4)',
              borderRadius: 'var(--border-radius-sm)',
              border: 'none',
              backgroundColor: 'var(--color-warning-600)',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Leave Page
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnsavedChangesDialog; 