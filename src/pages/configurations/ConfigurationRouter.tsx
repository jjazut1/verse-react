import { useEffect, useState } from 'react';
import { useParams, useNavigate, Outlet, Link as RouterLink, useLocation } from 'react-router-dom';
import { useToast, Box, Heading, Container, Spinner, Center, Tabs, TabList, Tab, Flex, Text, Alert, AlertIcon, AlertTitle, AlertDescription } from '@chakra-ui/react';
import { useAuth } from '../../contexts/AuthContext';

/**
 * ConfigurationRouter component
 * 
 * This component serves as a router for different game configuration pages.
 * It validates authentication, extracts game type from URL path, and renders
 * the appropriate configuration page through the Outlet component.
 */
const ConfigurationRouter = () => {
  const { templateId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [isNewConfig, setIsNewConfig] = useState<boolean>(false);

  // Extract game type from the path
  const getGameTypeFromPath = () => {
    const path = location.pathname;
    if (path.includes('whack-a-mole')) return 'whack-a-mole';
    if (path.includes('sort-categories-egg')) return 'sort-categories-egg';
    return null;
  };

  const gameType = getGameTypeFromPath();

  // Check if this is a new configuration without templateId
  useEffect(() => {
    // If we have a game type but no templateId, this is a new configuration
    if (gameType && !templateId) {
      setIsNewConfig(true);
      // Clear any errors if this is a new config
      setError(null);
    } else {
      setIsNewConfig(false);
    }
  }, [gameType, templateId]);

  // Check if user is authenticated
  useEffect(() => {
    if (!currentUser) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to access configuration pages.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      navigate('/');
    }
  }, [currentUser, navigate, toast]);

  // Validate game type
  useEffect(() => {
    if (!gameType && location.pathname !== '/configure') {
      toast({
        title: 'Missing Game Type',
        description: 'A game type is required to configure a game.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      navigate('/');
    }
  }, [gameType, navigate, toast, location.pathname]);

  // Clear error when route changes
  useEffect(() => {
    setError(null);
  }, [location.pathname]);

  // Custom error handler to prevent multiple error messages
  const handleError = (errorMessage: string) => {
    // Only set the error if this is not a new configuration without a templateId
    if (!(gameType && !templateId)) {
      setError(errorMessage);
    }
  };

  // If still loading authentication or at base configure path, show loading spinner
  if (!currentUser || (location.pathname === '/configure' && !gameType)) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  // Determine which tab should be active based on the current path
  const getActiveIndex = () => {
    if (!gameType) return 0;
    if (gameType === 'whack-a-mole') return 0;
    if (gameType === 'sort-categories-egg') return 1;
    return 0;
  };

  // Handle tab change
  const handleTabChange = (index: number) => {
    if (index === 0) navigate('/configure/whack-a-mole');
    if (index === 1) navigate('/configure/sort-categories-egg');
  };

  // Display configuration page title and content
  return (
    <Container maxW="container.xl" py={8}>
      <Box mb={8}>
        <Heading mb={6}>Game Configuration</Heading>
        
        <Tabs index={getActiveIndex()} onChange={handleTabChange} variant="enclosed" colorScheme="blue">
          <TabList>
            <Tab>Whack-a-Mole</Tab>
            <Tab>Sort Categories Egg</Tab>
          </TabList>
        </Tabs>
      </Box>
      
      {/* Show error if one exists and this is not a new config */}
      {error && !isNewConfig && (
        <Alert status="error" mb={6}>
          <AlertIcon />
          <AlertTitle>Error:</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Child routes will be rendered here */}
      <Outlet context={{ onError: handleError }} />
    </Container>
  );
};

export default ConfigurationRouter; 