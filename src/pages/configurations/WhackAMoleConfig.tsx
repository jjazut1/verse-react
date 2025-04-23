import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import {
  VStack,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  Textarea,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
  Switch,
  Button,
  Heading,
  Box,
  Divider,
  useToast,
  Text,
  HStack,
  Spinner,
} from '@chakra-ui/react';
import { collection, addDoc, doc, getDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { serverTimestamp } from 'firebase/firestore';

interface WordCategory {
  title: string;
  words: string[];
}

// Default word categories that can be used as fallback if database fetch fails
const DEFAULT_WORD_CATEGORIES: Record<string, WordCategory> = {
  short_a: {
    title: "Short 'a' Words",
    words: ['had', 'ran', 'and', 'man', 'can', 'at', 'am', 'an', 'last', 'past', 'fast', 'ask', 'land', 'hand', 'stand']
  },
  short_e: {
    title: "Short 'e' Words",
    words: ['men', 'set', 'let', 'get', 'red', 'end', 'yet', 'yes', 'met', 'ten', 'bed', 'went', 'send', 'sent', 'left']
  },
  short_i: {
    title: "Short 'i' Words",
    words: ['sit', 'him', 'hid', 'did', 'six', 'fix', 'in', 'if', 'it', 'trip', 'milk']
  },
  short_o: {
    title: "Short 'o' Words",
    words: ['top', 'got', 'box', 'not', 'on', 'dog', 'lot', 'drop', 'spot', 'hot', 'stop', 'lost', 'soft', 'from']
  },
  short_u: {
    title: "Short 'u' Words",
    words: ['bug', 'run', 'fun', 'sun', 'cut', 'but', 'up', 'must', 'jump', 'just']
  },
  sh_words: {
    title: "Words with 'sh'",
    words: ['ship', 'shop', 'shut', 'wish', 'dish', 'fish', 'rush']
  },
  ch_words: {
    title: "Words with 'ch'",
    words: ['such', 'much', 'lunch', 'chum', 'chip', 'chap', 'bunch', 'hunch', 'munch', 'punch']
  },
  th_words: {
    title: "Words with 'th'",
    words: ['that', 'than', 'with', 'them', 'then', 'thin', 'thing', 'thank', 'the', 'this']
  },
  wh_words: {
    title: "Words with 'wh'",
    words: ['when', 'which', 'whiz', 'whim', 'whip']
  }
};

// Add interface for the outlet context
interface OutletContextType {
  onError?: (message: string) => void;
}

const WhackAMoleConfig = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { currentUser } = useAuth();
  const { onError } = useOutletContext<OutletContextType>();

  // Form state
  const [title, setTitle] = useState('');
  const [gameTime, setGameTime] = useState(30);
  const [pointsPerHit, setPointsPerHit] = useState(10);
  const [penaltyPoints, setPenaltyPoints] = useState(5);
  const [bonusPoints, setBonusPoints] = useState(10);
  const [bonusThreshold, setBonusThreshold] = useState(3);
  const [gameSpeed, setGameSpeed] = useState(2);
  const [instructions, setInstructions] = useState('');
  const [shareConfig, setShareConfig] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [gameCategory, setGameCategory] = useState('');
  
  // Category templates state
  const [dbTemplates, setDbTemplates] = useState<Record<string, WordCategory>>({});
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  
  // Category management
  const [wordCategories, setWordCategories] = useState<{ title: string; words: string[] }[]>([
    { title: '', words: [] }
  ]);

  // Load category templates from database
  useEffect(() => {
    const fetchCategoryTemplates = async () => {
      setLoadingTemplates(true);
      try {
        // Query the categoryTemplates collection for 'whack-a-mole' type templates
        const templatesQuery = query(
          collection(db, 'categoryTemplates'),
          where('type', '==', 'whack-a-mole')
        );
        
        const querySnapshot = await getDocs(templatesQuery);
        const templates: Record<string, WordCategory> = {};
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          templates[doc.id] = {
            title: data.title || 'Untitled Template',
            words: Array.isArray(data.words) ? data.words : []
          };
        });
        
        // If we found templates in the database, use those
        if (Object.keys(templates).length > 0) {
          setDbTemplates(templates);
          console.log('Loaded word category templates from database:', templates);
        } else {
          // Otherwise use the default templates as fallback
          setDbTemplates(DEFAULT_WORD_CATEGORIES);
          console.log('No word category templates found in database, using defaults');
        }
      } catch (error) {
        console.error('Error fetching word category templates:', error);
        // Use default templates on error
        setDbTemplates(DEFAULT_WORD_CATEGORIES);
        toast({
          title: 'Error loading templates',
          description: 'Using default word categories instead.',
          status: 'warning',
          duration: 3000,
        });
      } finally {
        setLoadingTemplates(false);
      }
    };
    
    fetchCategoryTemplates();
  }, [toast]);

  // Load existing configuration if templateId is provided
  useEffect(() => {
    const loadTemplate = async () => {
      // If no templateId, this is a new configuration - no need to load anything
      if (!templateId) return;
      
      setIsLoading(true);
      try {
        const docRef = doc(db, 'userGameConfigs', templateId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Check if the user has permission to edit this config
          if (data.userId !== currentUser?.uid) {
            // If not the owner, create a copy instead of editing
            setIsEditing(false);
            toast({
              title: "Creating a copy",
              description: "You're not the owner of this configuration, so you'll create a copy instead.",
              status: "info",
              duration: 5000,
            });
          } else {
            setIsEditing(true);
          }

          // Populate form fields
          setTitle(data.title || '');
          setGameTime(data.gameTime || 30);
          setPointsPerHit(data.pointsPerHit || 10);
          setPenaltyPoints(data.penaltyPoints || 5);
          setBonusPoints(data.bonusPoints || 10);
          setBonusThreshold(data.bonusThreshold || 3);
          setGameSpeed(data.speed || 2);
          setInstructions(data.instructions || '');
          setShareConfig(data.share || false);
          
          // Handle categories
          if (data.categories && Array.isArray(data.categories)) {
            const loadedCategories = data.categories.map((cat: any) => ({
              title: cat.title || '',
              words: Array.isArray(cat.words) ? cat.words : []
            }));
            setWordCategories(loadedCategories.length > 0 ? loadedCategories : [{title: '', words: []}]);
          }
        } else {
          // Use the parent's error handler if available, otherwise fall back to toast
          if (onError) {
            onError("The requested configuration could not be found.");
          } else {
            toast({
              title: "Configuration not found",
              description: "The requested configuration could not be found.",
              status: "error",
              duration: 5000,
            });
          }
          navigate('/configure/whack-a-mole');
        }
      } catch (error) {
        console.error("Error loading configuration:", error);
        // Use the parent's error handler if available, otherwise fall back to toast
        if (onError) {
          onError("Failed to load the configuration.");
        } else {
          toast({
            title: "Error",
            description: "Failed to load the configuration.",
            status: "error",
            duration: 5000,
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplate();
  }, [templateId, currentUser, navigate, toast, onError]);

  // Handler for category selection
  const handleCategoryChange = (category: string) => {
    setGameCategory(category);
    
    // Check if template exists in either database templates or fallbacks
    const templateData = dbTemplates[category];
    
    if (templateData) {
      // If this is a new config or user confirms, update title and words
      if (!title || window.confirm("Do you want to replace the current title and words with this preset?")) {
        setTitle(templateData.title);
        
        // Update the first category or add if none exist
        if (wordCategories.length === 0) {
          setWordCategories([{ 
            title: templateData.title, 
            words: [...templateData.words] 
          }]);
        } else {
          const newCategories = [...wordCategories];
          newCategories[0] = { 
            title: templateData.title, 
            words: [...templateData.words] 
          };
          setWordCategories(newCategories);
        }
      }
    }
  };

  // Save the current word category as a template in the database
  const handleSaveAsTemplate = async () => {
    if (!currentUser) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to save templates.",
        status: "error",
        duration: 5000,
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Missing Title",
        description: "Please enter a title for your template.",
        status: "warning",
        duration: 5000,
      });
      return;
    }

    // Get words from the first category
    if (wordCategories.length === 0 || wordCategories[0].words.length === 0) {
      toast({
        title: "Missing Words",
        description: "Please add at least one category with words.",
        status: "warning",
        duration: 5000,
      });
      return;
    }

    const firstCategory = wordCategories[0];
    
    try {
      // Prepare the template data
      const templateData = {
        type: 'whack-a-mole',
        title: firstCategory.title || title,
        words: firstCategory.words,
        userId: currentUser.uid,
        createdAt: serverTimestamp()
      };

      // Save to the categoryTemplates collection
      const docRef = await addDoc(collection(db, 'categoryTemplates'), templateData);
      
      // Add the new template to the state
      setDbTemplates({
        ...dbTemplates,
        [docRef.id]: {
          title: templateData.title,
          words: templateData.words
        }
      });
      
      toast({
        title: "Template Saved",
        description: "Your word category template has been saved for future use.",
        status: "success",
        duration: 3000,
      });
      
      // Set the game category to the new template
      setGameCategory(docRef.id);
      
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        title: "Error",
        description: "Failed to save the template. Please try again.",
        status: "error",
        duration: 5000,
      });
    }
  };

  // Category management handlers
  const handleAddCategory = () => {
    setWordCategories([...wordCategories, { title: '', words: [] }]);
  };

  const handleRemoveCategory = (index: number) => {
    const newCategories = [...wordCategories];
    newCategories.splice(index, 1);
    setWordCategories(newCategories);
  };

  const handleCategoryTitleChange = (index: number, value: string) => {
    const newCategories = [...wordCategories];
    newCategories[index].title = value;
    setWordCategories(newCategories);
  };

  const handleCategoryWordsChange = (index: number, value: string) => {
    const newCategories = [...wordCategories];
    newCategories[index].words = value.split(',').map(word => word.trim()).filter(Boolean);
    setWordCategories(newCategories);
  };

  // Form submission handler
  const handleSaveConfig = async () => {
    if (!currentUser) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to save configurations.",
        status: "error",
        duration: 5000,
      });
      return;
    }

    // Validate form
    if (!title.trim()) {
      toast({
        title: "Missing Title",
        description: "Please enter a title for your configuration.",
        status: "warning",
        duration: 5000,
      });
      return;
    }

    // Validate categories
    const validCategories = wordCategories.filter(cat => 
      cat.title.trim() && cat.words.length > 0
    );

    if (validCategories.length === 0) {
      toast({
        title: "Missing Categories",
        description: "Please add at least one category with words.",
        status: "warning",
        duration: 5000,
      });
      return;
    }

    setIsLoading(true);

    try {
      // Prepare the configuration data
      const configData = {
        type: 'whack-a-mole',
        title: title.trim(),
        gameTime,
        pointsPerHit,
        penaltyPoints,
        bonusPoints,
        bonusThreshold,
        speed: gameSpeed,
        instructions,
        categories: validCategories,
        share: shareConfig,
        userId: currentUser.uid,
        email: currentUser.email,
        createdAt: serverTimestamp()
      };

      let configId;

      if (isEditing && templateId) {
        // Update existing document
        await updateDoc(doc(db, 'userGameConfigs', templateId), {
          ...configData,
          updatedAt: serverTimestamp()
        });
        configId = templateId;
        toast({
          title: "Configuration Updated",
          description: "Your game configuration has been updated successfully.",
          status: "success",
          duration: 5000,
        });
      } else {
        // Create new document
        const docRef = await addDoc(collection(db, 'userGameConfigs'), configData);
        configId = docRef.id;
        toast({
          title: "Configuration Created",
          description: "Your game configuration has been created successfully.",
          status: "success",
          duration: 5000,
        });
      }

      // Navigate to the game with the new/updated configuration
      navigate(`/game/${configId}`);
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast({
        title: "Error",
        description: "Failed to save the configuration. Please try again.",
        status: "error",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <Heading size="md" mb={4}>Game Settings</Heading>
        
        <FormControl mb={4}>
          <FormLabel>Word Category Template</FormLabel>
          {loadingTemplates ? (
            <HStack>
              <Spinner size="sm" />
              <Text>Loading templates...</Text>
            </HStack>
          ) : (
            <>
              <Select
                value={gameCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                placeholder="Select a word category (optional)"
              >
                {Object.entries(dbTemplates).map(([key, template]) => (
                  <option key={key} value={key}>
                    {template.title}
                  </option>
                ))}
              </Select>
              <FormHelperText>
                Select a preset word category to quickly populate your game
              </FormHelperText>
            </>
          )}
        </FormControl>

        <FormControl mb={4}>
          <FormLabel>Configuration Title</FormLabel>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a title for this game"
          />
        </FormControl>

        <FormControl mb={4}>
          <FormLabel>Game Time (seconds)</FormLabel>
          <NumberInput
            value={gameTime}
            onChange={(_, value) => setGameTime(value)}
            min={30}
            max={300}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </FormControl>

        <FormControl mb={4}>
          <FormLabel>Game Speed</FormLabel>
          <Select
            value={gameSpeed}
            onChange={(e) => setGameSpeed(Number(e.target.value))}
          >
            <option value={1}>Slow (10-12 moles)</option>
            <option value={2}>Medium (14-16 moles)</option>
            <option value={3}>Fast (17-19 moles)</option>
          </Select>
          <FormHelperText>Controls how frequently moles appear during the game</FormHelperText>
        </FormControl>

        <FormControl mb={4}>
          <FormLabel>Game Instructions</FormLabel>
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Enter custom instructions for players"
            rows={3}
          />
          <FormHelperText>
            Custom instructions to show on the game start screen. If left empty, default instructions will be shown.
          </FormHelperText>
        </FormControl>
      </Box>

      <Box>
        <Heading size="md" mb={4}>Scoring</Heading>
        
        <FormControl mb={4}>
          <FormLabel>Points Per Hit</FormLabel>
          <NumberInput
            value={pointsPerHit}
            onChange={(_, value) => setPointsPerHit(value)}
            min={1}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </FormControl>

        <FormControl mb={4}>
          <FormLabel>Penalty Points</FormLabel>
          <NumberInput
            value={penaltyPoints}
            onChange={(_, value) => setPenaltyPoints(value)}
            min={0}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
          <FormHelperText>Points deducted for missing a correct word</FormHelperText>
        </FormControl>

        <FormControl mb={4}>
          <FormLabel>Bonus Points</FormLabel>
          <NumberInput
            value={bonusPoints}
            onChange={(_, value) => setBonusPoints(value)}
            min={0}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </FormControl>

        <FormControl mb={4}>
          <FormLabel>Bonus Threshold</FormLabel>
          <NumberInput
            value={bonusThreshold}
            onChange={(_, value) => setBonusThreshold(value)}
            min={1}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
          <FormHelperText>Number of consecutive correct hits needed to trigger bonus points</FormHelperText>
        </FormControl>
      </Box>

      <Box>
        <Heading size="md" mb={4}>Word Categories</Heading>
        <Text mb={4}>
          Add categories of words that will appear on moles during the game.
        </Text>
        
        {wordCategories.map((category, index) => (
          <Box key={index} p={4} borderWidth="1px" borderRadius="md" mb={4}>
            <FormControl mb={4}>
              <FormLabel>Category {index + 1} Title</FormLabel>
              <Input
                value={category.title}
                onChange={(e) => handleCategoryTitleChange(index, e.target.value)}
                placeholder="Category title"
              />
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>Words (comma-separated)</FormLabel>
              <Textarea
                value={category.words.join(', ')}
                onChange={(e) => handleCategoryWordsChange(index, e.target.value)}
                placeholder="word1, word2, word3"
                rows={3}
              />
              <FormHelperText>
                Enter words separated by commas. These will appear on moles in the game.
              </FormHelperText>
            </FormControl>
            
            {wordCategories.length > 1 && (
              <Button 
                size="sm" 
                colorScheme="red" 
                onClick={() => handleRemoveCategory(index)}
              >
                Remove Category
              </Button>
            )}
          </Box>
        ))}
        
        <Button colorScheme="blue" onClick={handleAddCategory} mb={4}>
          Add Category
        </Button>
      </Box>

      <Box>
        <Heading size="md" mb={4}>Templates</Heading>
        <FormControl mb={4}>
          <Button 
            colorScheme="teal" 
            size="md" 
            onClick={handleSaveAsTemplate}
            isDisabled={!currentUser || wordCategories.length === 0 || (wordCategories[0]?.words.length || 0) === 0}
            mb={2}
            width="100%"
          >
            Save as Word Template
          </Button>
          <FormHelperText>
            Save your current word category as a reusable template for future games
          </FormHelperText>
        </FormControl>
      </Box>

      <Box>
        <Heading size="md" mb={4}>Sharing</Heading>
        <FormControl display="flex" alignItems="center" mb={4}>
          <FormLabel mb="0">Share Configuration</FormLabel>
          <Switch
            isChecked={shareConfig}
            onChange={(e) => setShareConfig(e.target.checked)}
          />
          <FormHelperText ml={2}>
            When enabled, other users can see and use this configuration
          </FormHelperText>
        </FormControl>
      </Box>

      <Divider my={4} />
      
      <Button 
        colorScheme="green" 
        size="lg" 
        onClick={handleSaveConfig} 
        isLoading={isLoading}
        loadingText="Saving..."
      >
        {isEditing ? "Update Configuration" : "Save Configuration"}
      </Button>
    </VStack>
  );
};

export default WhackAMoleConfig; 