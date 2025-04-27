import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Box, Button, Heading, Text, Alert, AlertIcon, VStack, Code } from '@chakra-ui/react';

const SetAdminPage: React.FC = () => {
  const { currentUser, setCurrentUserAsAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const handleSetAdmin = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      if (!currentUser) {
        throw new Error('You must be logged in to perform this action');
      }
      
      await setCurrentUserAsAdmin();
      setSuccess(`User ${currentUser.email} has been set as admin. Please refresh the page to see changes.`);
    } catch (error) {
      setError(`Failed to set admin role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box maxW="800px" mx="auto" p={8}>
      <VStack spacing={6} align="stretch">
        <Heading>Set Current User as Admin</Heading>
        
        {currentUser ? (
          <>
            <Box p={4} borderWidth="1px" borderRadius="md">
              <Text>Current User: <Code>{currentUser.email}</Code></Text>
              <Text>User ID: <Code>{currentUser.uid}</Code></Text>
            </Box>
            
            <Text>
              Clicking the button below will set your account as an administrator.
              This will give you access to administrative features.
            </Text>
            
            <Button 
              colorScheme="blue" 
              onClick={handleSetAdmin} 
              isLoading={loading}
              loadingText="Setting admin role..."
            >
              Set as Admin
            </Button>
            
            {error && (
              <Alert status="error">
                <AlertIcon />
                {error}
              </Alert>
            )}
            
            {success && (
              <Alert status="success">
                <AlertIcon />
                {success}
              </Alert>
            )}
          </>
        ) : (
          <Alert status="warning">
            <AlertIcon />
            You must be logged in to use this page.
          </Alert>
        )}
      </VStack>
    </Box>
  );
};

export default SetAdminPage; 