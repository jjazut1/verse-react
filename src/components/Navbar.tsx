import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUnsavedChangesContext } from '../contexts/UnsavedChangesContext';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

const Navbar = () => {
  const { currentUser, isTeacher, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { hasUnsavedChanges, promptBeforeLeaving } = useUnsavedChangesContext();
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Check if user is an admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!currentUser) {
        setIsAdmin(false);
        return;
      }
      
      try {
        // Check if user has admin role in users collection
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
  
  const navLinkStyle = (path: string) => ({
    color: 'white',
    fontWeight: 'bold',
    textDecoration: 'none',
    transition: 'opacity 0.2s ease-in-out',
    padding: 'var(--spacing-2) var(--spacing-3)',
    borderRadius: 'var(--border-radius-sm)',
    backgroundColor: location.pathname === path ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
  });

  const buttonStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    padding: 'var(--spacing-2) var(--spacing-4)',
    border: 'none',
    borderRadius: 'var(--border-radius-md)',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'opacity 0.2s ease-in-out',
  };
  
  // Handle navigation with unsaved changes check
  const handleNavClick = async (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    // Don't check if navigating to current page
    if (location.pathname === path) return;
    
    // Don't check if no unsaved changes
    if (!hasUnsavedChanges) return;
    
    e.preventDefault();
    
    const canProceed = await promptBeforeLeaving();
    
    if (canProceed) {
      navigate(path);
    }
  };
  
  // Handle logout with unsaved changes check
  const handleLogout = async () => {
    if (hasUnsavedChanges) {
      const canProceed = await promptBeforeLeaving('You have unsaved changes. Are you sure you want to log out?');
      if (!canProceed) return;
    }
    
    await logout();
  };

  return (
    <nav style={{ backgroundColor: 'var(--color-primary-500)', padding: 'var(--spacing-4)' }}>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between' 
      }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
          <RouterLink 
            to="/" 
            style={navLinkStyle('/')}
            onClick={(e) => handleNavClick(e, '/')}
            onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
          >
            Home
          </RouterLink>
          {isTeacher && (
            <>
              <RouterLink 
                to="/teacher" 
                style={navLinkStyle('/teacher')}
                onClick={(e) => handleNavClick(e, '/teacher')}
                onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
              >
                Teacher Dashboard
              </RouterLink>
              <RouterLink 
                to="/assignments" 
                style={navLinkStyle('/assignments')}
                onClick={(e) => handleNavClick(e, '/assignments')}
                onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
              >
                Assignments
              </RouterLink>
            </>
          )}
          {isAdmin && (
            <RouterLink 
              to="/admin" 
              style={{
                ...navLinkStyle('/admin'),
                color: '#FFD700' // Gold color for admin link
              }}
              onClick={(e) => handleNavClick(e, '/admin')}
              onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
            >
              Admin
            </RouterLink>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: 'var(--spacing-4)', alignItems: 'center' }}>
          {currentUser ? (
            <>
              <div style={{ color: 'white' }}>{currentUser.email}</div>
              <button
                onClick={handleLogout}
                style={buttonStyle}
                onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
              >
                Logout
              </button>
            </>
          ) : (
            <RouterLink
              to="/login"
              style={{
                ...buttonStyle,
                textDecoration: 'none',
                display: 'inline-block',
                backgroundColor: location.pathname === '/login' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.2)'
              }}
              onClick={(e) => handleNavClick(e, '/login')}
              onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
            >
              Login / Sign Up
            </RouterLink>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 