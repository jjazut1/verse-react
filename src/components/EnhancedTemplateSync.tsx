import React, { useState } from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  Flex,
  Badge,
  useToast,
  Tooltip,
  Collapse
} from '@chakra-ui/react';
import { CheckIcon, RepeatIcon, WarningIcon, InfoIcon } from '@chakra-ui/icons';
import {
  syncTemplateWithGameConfig,
  syncSortCategoriesEggTemplate,
  syncWhackAMoleTemplate,
} from '../utils/updateTemplates';

interface EnhancedTemplateSyncProps {
  templateId: string;
  gameTitle: string;
  gameType?: 'whack-a-mole' | 'sort-categories-egg';
  variant?: 'standard' | 'compact';
  showDescription?: boolean;
}

const EnhancedTemplateSync: React.FC<EnhancedTemplateSyncProps> = ({
  templateId,
  gameTitle,
  gameType,
  variant = 'standard',
  showDescription = false,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const toast = useToast();

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    setShowDetails(false);
    
    try {
      let syncFn;
      
      if (gameType === 'whack-a-mole') {
        syncFn = syncWhackAMoleTemplate;
      } else if (gameType === 'sort-categories-egg') {
        syncFn = syncSortCategoriesEggTemplate;
      } else {
        syncFn = syncTemplateWithGameConfig;
      }
      
      const result = await syncFn(templateId, gameTitle);
      
      setSyncResult({
        success: true,
        message: 'Template synced successfully!',
        details: JSON.stringify(result, null, 2)
      });
      
      toast({
        title: 'Sync Successful',
        description: `Template "${gameTitle}" has been synced successfully`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Sync error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setSyncResult({
        success: false,
        message: 'Failed to sync template',
        details: errorMessage
      });
      
      toast({
        title: 'Sync Failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const isCompact = variant === 'compact';

  return (
    <Box 
      p={isCompact ? 2 : 3} 
      borderRadius="md" 
      bg={syncResult?.success ? "green.50" : syncResult?.success === false ? "red.50" : "gray.50"}
      borderWidth="1px"
      borderColor={syncResult?.success ? "green.200" : syncResult?.success === false ? "red.200" : "gray.200"}
      transition="all 0.2s"
    >
      {showDescription && (
        <Text fontSize="sm" mb={2} color="gray.600">
          Sync this template with the current game configuration.
        </Text>
      )}
      
      <Flex direction="column" gap={2}>
        <Flex justify="space-between" align="center">
          <Flex align="center" gap={2}>
            {!isCompact && (
              <Heading size="xs" fontWeight="medium">
                Template ID: 
              </Heading>
            )}
            <Tooltip label={`Full ID: ${templateId}`} placement="top">
              <Text fontSize={isCompact ? "xs" : "sm"} fontFamily="mono">
                {templateId.length > 10 
                  ? `${templateId.slice(0, 6)}...${templateId.slice(-4)}` 
                  : templateId}
              </Text>
            </Tooltip>
          </Flex>
          
          <Button
            size={isCompact ? "xs" : "sm"}
            colorScheme={syncResult?.success ? "green" : "blue"}
            variant={syncResult?.success ? "solid" : "outline"}
            onClick={handleSync}
            isLoading={isSyncing}
            loadingText="Syncing"
            leftIcon={syncResult?.success ? <CheckIcon /> : <RepeatIcon />}
            disabled={isSyncing}
          >
            {syncResult?.success ? "Synced" : "Sync Template"}
          </Button>
        </Flex>
        
        {syncResult && (
          <Box mt={1}>
            <Flex 
              align="center" 
              gap={1}
              onClick={() => setShowDetails(!showDetails)}
              cursor="pointer"
            >
              {syncResult.success ? (
                <Badge colorScheme="green" variant="subtle">
                  <Flex align="center" gap={1}>
                    <CheckIcon boxSize={3} />
                    <Text fontSize="xs">{syncResult.message}</Text>
                  </Flex>
                </Badge>
              ) : (
                <Badge colorScheme="red" variant="subtle">
                  <Flex align="center" gap={1}>
                    <WarningIcon boxSize={3} />
                    <Text fontSize="xs">{syncResult.message}</Text>
                  </Flex>
                </Badge>
              )}
              <InfoIcon boxSize={3} color="gray.500" />
            </Flex>
            
            <Collapse in={showDetails} animateOpacity>
              <Box 
                mt={2} 
                p={2} 
                bg="gray.100" 
                borderRadius="sm" 
                fontSize="xs" 
                fontFamily="mono"
                maxH="100px"
                overflow="auto"
              >
                {syncResult.details}
              </Box>
            </Collapse>
          </Box>
        )}
      </Flex>
    </Box>
  );
};

export default EnhancedTemplateSync; 