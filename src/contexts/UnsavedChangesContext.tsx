import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UnsavedChangesContextType {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  promptBeforeLeaving: (message?: string, showSaveOption?: boolean) => Promise<boolean>;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextType>({
  hasUnsavedChanges: false,
  setHasUnsavedChanges: () => {},
  promptBeforeLeaving: async () => true
});

export const useUnsavedChangesContext = () => useContext(UnsavedChangesContext);

interface UnsavedChangesProviderProps {
  children: ReactNode;
}

export const UnsavedChangesProvider: React.FC<UnsavedChangesProviderProps> = ({ children }) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptResolve, setPromptResolve] = useState<((value: boolean) => void) | null>(null);
  const [promptMessage, setPromptMessage] = useState('You have unsaved changes. Are you sure you want to leave this page?');
  const [showSaveButton, setShowSaveButton] = useState(false);

  // Handle browser's beforeunload event
  useEffect(() => {
    if (hasUnsavedChanges) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = promptMessage;
        return promptMessage;
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [hasUnsavedChanges, promptMessage]);

  const promptBeforeLeaving = async (message?: string, showSaveOption: boolean = false): Promise<boolean> => {
    if (!hasUnsavedChanges) {
      return true; // No unsaved changes, proceed normally
    }

    if (message) {
      setPromptMessage(message);
    }
    
    setShowSaveButton(showSaveOption);
    setShowPrompt(true);
    
    return new Promise<boolean>((resolve) => {
      setPromptResolve(() => resolve);
    });
  };

  // Handle confirmed navigation with save
  const handleConfirm = () => {
    setShowPrompt(false);
    if (promptResolve) {
      promptResolve(true);
      setPromptResolve(null);
    }
  };

  // Handle cancel (stay on page)
  const handleCancel = () => {
    setShowPrompt(false);
    if (promptResolve) {
      promptResolve(false);
      setPromptResolve(null);
    }
  };

  // Handle navigation without saving
  const handleLeaveWithoutSaving = () => {
    setShowPrompt(false);
    setHasUnsavedChanges(false); // Clear the unsaved changes flag
    if (promptResolve) {
      promptResolve(true); // Proceed with navigation
      setPromptResolve(null);
    }
  };

  return (
    <UnsavedChangesContext.Provider
      value={{
        hasUnsavedChanges,
        setHasUnsavedChanges,
        promptBeforeLeaving
      }}
    >
      {children}
      
      {/* Prompt Dialog */}
      {showPrompt && (
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
              {promptMessage}
            </p>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'flex-end', 
              gap: 'var(--spacing-3)',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={handleCancel}
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
                onClick={handleLeaveWithoutSaving}
                style={{
                  padding: 'var(--spacing-2) var(--spacing-4)',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid var(--color-error-400)',
                  backgroundColor: 'white',
                  color: 'var(--color-error-600)',
                  cursor: 'pointer'
                }}
              >
                Leave Without Saving
              </button>
              {showSaveButton && (
                <button
                  onClick={handleConfirm}
                  style={{
                    padding: 'var(--spacing-2) var(--spacing-4)',
                    borderRadius: 'var(--border-radius-sm)',
                    border: 'none',
                    backgroundColor: 'var(--color-warning-600)',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Save & Leave
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </UnsavedChangesContext.Provider>
  );
}; 