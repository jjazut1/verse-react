import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Check if user is an admin
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    // Add your admin check logic here
    // For example: check currentUser.role === 'admin'
    const checkAdminStatus = async () => {
      // This is a placeholder - implement your actual admin check
      // const isAdmin = await checkIfUserIsAdmin(currentUser.uid);
      const isAdmin = true; // Temporary placeholder
      
      if (!isAdmin) {
        navigate('/');
      }
      
      setLoading(false);
    };
    
    checkAdminStatus();
  }, [currentUser, navigate]);
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '80vh'
      }}>
        <p>Loading...</p>
      </div>
    );
  }
  
  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: 'var(--spacing-6)'
    }}>
      <h1 style={{ 
        fontSize: 'var(--font-size-3xl)',
        color: 'var(--color-gray-800)',
        marginBottom: 'var(--spacing-6)'
      }}>
        Admin Dashboard
      </h1>
      
      <div style={{ 
        backgroundColor: 'white',
        padding: 'var(--spacing-6)',
        borderRadius: 'var(--border-radius-md)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <p>Welcome to the Admin Dashboard!</p>
        <p>This is a placeholder. Implement your admin features here.</p>
      </div>
    </div>
  );
};

export default AdminPage; 