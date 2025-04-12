import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const navLinkStyle = {
  color: 'white',
  fontWeight: 'bold',
  textDecoration: 'none',
  transition: 'opacity 0.2s ease-in-out',
};

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

const Navbar = () => {
  const { currentUser, isTeacher, loginWithGoogle, logout } = useAuth();

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
            style={navLinkStyle}
            onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
          >
            Home
          </RouterLink>
          <RouterLink 
            to="/games" 
            style={navLinkStyle}
            onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
          >
            Games
          </RouterLink>
          {isTeacher && (
            <RouterLink 
              to="/teacher" 
              style={navLinkStyle}
              onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
            >
              Teacher Dashboard
            </RouterLink>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: 'var(--spacing-4)', alignItems: 'center' }}>
          {currentUser ? (
            <>
              <div style={{ color: 'white' }}>{currentUser.email}</div>
              <button
                onClick={logout}
                style={buttonStyle}
                onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
              >
                Logout
              </button>
            </>
          ) : (
            <button
              onClick={loginWithGoogle}
              style={buttonStyle}
              onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
            >
              Login with Google
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 