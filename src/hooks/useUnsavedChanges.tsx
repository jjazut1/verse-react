import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Custom hook to handle unsaved changes in form components
 * 
 * @param hasUnsavedChanges Boolean indicating if there are unsaved changes
 * @param navigationBlockMessage Message to show when trying to navigate away with unsaved changes
 * @returns Object with confirmation-related methods
 */
export function useUnsavedChanges(
  hasUnsavedChanges: boolean,
  navigationBlockMessage: string = 'You have unsaved changes. Are you sure you want to leave this page?'
) {
  const navigate = useNavigate();
  const location = useLocation();
  const [lastLocationKey, setLastLocationKey] = useState(location.key);
  const [showPrompt, setShowPrompt] = useState(false);
  const [blockedNavigationAction, setBlockedNavigationAction] = useState<{ 
    to: string | number, 
    isBack?: boolean 
  } | null>(null);

  // Handle browser's beforeunload event
  useEffect(() => {
    if (hasUnsavedChanges) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = navigationBlockMessage;
        return navigationBlockMessage;
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [hasUnsavedChanges, navigationBlockMessage]);

  // Handle internal navigation
  useEffect(() => {
    // If location changes and we have unsaved changes, show prompt
    if (location.key !== lastLocationKey && hasUnsavedChanges) {
      setShowPrompt(true);
      setBlockedNavigationAction({ to: -1, isBack: true }); // Default to going back
      setLastLocationKey(location.key);
    }
  }, [location, lastLocationKey, hasUnsavedChanges]);

  // Method to confirm navigation
  const confirmNavigation = () => {
    setShowPrompt(false);
    
    if (blockedNavigationAction) {
      if (typeof blockedNavigationAction.to === 'string') {
        navigate(blockedNavigationAction.to);
      } else if (blockedNavigationAction.isBack) {
        navigate(-1);
      } else {
        navigate(blockedNavigationAction.to as number);
      }
    }
    
    setBlockedNavigationAction(null);
  };

  // Method to cancel navigation
  const cancelNavigation = () => {
    setShowPrompt(false);
    setBlockedNavigationAction(null);
  };

  // Safe navigation method that checks for unsaved changes
  const safeNavigate = (to: string | number) => {
    if (hasUnsavedChanges) {
      setShowPrompt(true);
      setBlockedNavigationAction({ to, isBack: false });
    } else {
      if (typeof to === 'string') {
        navigate(to);
      } else {
        navigate(to);
      }
    }
  };

  return {
    showPrompt,
    confirmNavigation,
    cancelNavigation,
    safeNavigate
  };
} 