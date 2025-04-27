import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { regenerateAllThumbnails } from '../utils/regenerateThumbnails';
import { 
  Button, 
  useToast, 
  Box, 
  VStack, 
  Heading, 
  Text, 
  Tabs, 
  TabList, 
  TabPanels, 
  Tab, 
  TabPanel,
  Spinner,
  Center,
  Divider
} from '@chakra-ui/react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import UserManagement from '../components/admin/UserManagement';

const AdminPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  
  // Check if user is an admin
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    const checkAdminStatus = async () => {
      try {
        // Check if user has admin role in users collection
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        const isAdmin = userDoc.exists() && userDoc.data().role === 'admin';
        
        if (!isAdmin) {
          toast({
            title: "Access Denied",
            description: "You do not have permission to access the admin page.",
            status: "error",
            duration: 5000,
          });
          navigate('/');
          return;
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error checking admin status:', error);
        toast({
          title: "Error",
          description: "An error occurred while checking permissions.",
          status: "error",
          duration: 5000,
        });
        navigate('/');
      }
    };
    
    checkAdminStatus();
  }, [currentUser, navigate, toast]);
  
  const handleRegenerateAllThumbnails = async () => {
    try {
      setIsLoading(true);
      const result = await regenerateAllThumbnails();
      toast({
        title: "Thumbnails Regenerated",
        description: `Successfully regenerated ${result.success} thumbnails. ${result.failed} failed.`,
        status: "success",
        duration: 5000,
      });
    } catch (error) {
      console.error('Error regenerating thumbnails:', error);
      toast({
        title: "Error",
        description: "Failed to regenerate thumbnails.",
        status: "error", 
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  if (loading) {
    return (
      <Center minHeight="80vh">
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text>Loading admin dashboard...</Text>
        </VStack>
      </Center>
    );
  }
  
  return (
    <Box maxW="1200px" mx="auto" p={6}>
      <VStack align="stretch" spacing={6}>
        <Heading as="h1" size="xl" mb={2}>Admin Dashboard</Heading>
        <Text color="gray.600">Manage users, system settings, and maintenance tasks.</Text>
        
        <Divider my={2} />
        
        <Tabs variant="enclosed" colorScheme="blue">
          <TabList>
            <Tab>User Management</Tab>
            <Tab>System Settings</Tab>
            <Tab>Maintenance</Tab>
          </TabList>
          
          <TabPanels>
            {/* User Management Panel */}
            <TabPanel>
              <Box mb={4} p={4} borderWidth="1px" borderRadius="md" bg="blue.50">
                <Heading size="sm" mb={2}>Role Hierarchy</Heading>
                <Text>
                  <strong>Admin:</strong> Has full system access including user management and all teacher privileges.
                </Text>
                <Text>
                  <strong>Teacher:</strong> Can create and manage assignments and educational content.
                </Text>
                <Text>
                  <strong>User:</strong> Basic access to use the platform and complete assignments.
                </Text>
              </Box>
              <UserManagement />
            </TabPanel>
            
            {/* System Settings Panel */}
            <TabPanel>
              <Box p={4} borderWidth="1px" borderRadius="md" bg="white">
                <Heading size="md" mb={4}>System Settings</Heading>
                <Text mb={4}>System configuration and settings will be added here.</Text>
              </Box>
            </TabPanel>
            
            {/* Maintenance Panel */}
            <TabPanel>
              <Box p={4} borderWidth="1px" borderRadius="md" bg="white">
                <Heading size="md" mb={4}>Maintenance Tasks</Heading>
                <Text mb={4}>Perform system maintenance and optimization tasks.</Text>
                
                <Button
                  colorScheme="blue"
                  onClick={handleRegenerateAllThumbnails}
                  isLoading={isLoading}
                  loadingText="Regenerating..."
                  mb={4}
                >
                  Regenerate All Thumbnails
                </Button>
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Box>
  );
};

export default AdminPage; 