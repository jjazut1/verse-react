import { useState, useEffect, useRef, createContext, useContext, memo, useCallback } from 'react';
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
  IconButton,
  Flex,
  SimpleGrid,
  Stack,
  FormErrorMessage,
  Collapse
} from '@chakra-ui/react';
import { ChevronUpIcon, ChevronDownIcon, DeleteIcon, AddIcon } from '@chakra-ui/icons';
import { collection, addDoc, doc, getDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { serverTimestamp } from 'firebase/firestore';
import { useUnsavedChangesContext } from '../../contexts/UnsavedChangesContext';
import SlateEditor from '../../components/SlateEditor';
import { isEqual } from 'lodash';
import TemplateSync from '../../components/TemplateSync';
import EnhancedTemplateSync from '../../components/EnhancedTemplateSync';
import { createRoot } from 'react-dom/client';

// Create context for editor selection
interface EditorSelectionContextType {
  activeEditorId: string | null;
  setActiveEditorId: (id: string | null) => void;
  lastSelectionPath: [number, number] | null; // [categoryIndex, itemIndex] or null
  setLastSelectionPath: (path: [number, number] | null) => void;
}

const EditorSelectionContext = createContext<EditorSelectionContextType>({
  activeEditorId: null,
  setActiveEditorId: () => {},
  lastSelectionPath: null,
  setLastSelectionPath: () => {}
});

// Use the editor selection context
const useEditorSelection = () => useContext(EditorSelectionContext);

interface WordCategory {
  id?: string;
  title: string;
  words: string[];
  gameTime?: number;
  pointsPerHit?: number;
  penaltyPoints?: number;
  bonusPoints?: number;
  bonusThreshold?: number;
  speed?: number;
  instructions?: string;
  share?: boolean;
  categories?: Array<{
    title: string;
    words: string[];
  }>;
}

interface CategoryItem {
  id: string;
  content: any; // Rich text content for SlateEditor
}

interface Category {
  id: string;
  title: string;
  items: CategoryItem[];
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

// Convert WordCategory to Category (with rich text structure)
const convertWordCategoryToCategory = (wordCategory: WordCategory): Category => {
  return {
    id: Math.random().toString(36).substring(2, 9),
    title: wordCategory.title,
    items: wordCategory.words.map(word => ({
      id: Math.random().toString(36).substring(2, 9),
      content: word // Store as simple string
    }))
  };
};

// Convert Category to WordCategory format (for backward compatibility)
const convertCategoryToWordCategory = (category: Category): WordCategory => {
  return {
    title: category.title,
    words: category.items.map(item => {
      // Extract plain text from the rich text content
      if (typeof item.content === 'string') return item.content;
      
      try {
        // Extract text from Slate structure
        let text = '';
        const traverse = (nodes: any[]) => {
          for (const node of nodes) {
            if (typeof node.text === 'string') {
              text += node.text;
            } else if (node.children) {
              traverse(node.children);
            }
          }
        };
        
        traverse(Array.isArray(item.content) ? item.content : []);
        return text.trim();
      } catch (e) {
        console.error('Error extracting text from rich content:', e);
    return '';
  }
    }).filter(Boolean)
  };
};

// Utility function to generate a unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Delete an item from a category
const deleteItemFromCategory = (
  categories: Category[],
  categoryIndex: number,
  itemIndex: number
): Category[] => {
  return categories.map((category, catIdx) => {
    if (catIdx !== categoryIndex) return category;
    
    const newItems = [...category.items];
    newItems.splice(itemIndex, 1);
    
    return {
      ...category,
      items: newItems
    };
  });
};

// Add interface for the outlet context
interface OutletContextType {
  onError?: (message: string) => void;
}

// Create a wrapper component for SlateEditor that adds onFocus capability
const ItemEditor = ({ 
  value, 
  onChange, 
  placeholder, 
  onFocus, 
  editorId 
}: { 
  value: any; 
  onChange: (value: any) => void; 
  placeholder?: string; 
  onFocus?: (event: React.FocusEvent<HTMLDivElement>) => void;
  editorId: string;
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // Convert complex Slate objects to plain strings if needed
  const getEditorValue = () => {
    if (typeof value === 'string') {
    return value;
  }
  
    // If it's a Slate object, extract the text
    if (Array.isArray(value)) {
      try {
        let text = '';
        const traverse = (nodes: any[]) => {
          for (const node of nodes) {
            if (typeof node.text === 'string') {
              text += node.text;
            } else if (node.children) {
              traverse(node.children);
            }
          }
        };
        traverse(value);
        return text;
    } catch (e) {
        console.error('Error extracting text from Slate content:', e);
        return '';
      }
    }
    
    return '';
  };

  // Create a handler for SlateEditor's onChange
  const handleSlateChange = (newValue: string) => {
    // Pass the string directly to the parent component
    onChange(newValue);
  };

  useEffect(() => {
    if (wrapperRef.current) {
      const divElement = wrapperRef.current;
      // Add focus event listener to the div
      const handleFocus = (e: FocusEvent) => {
        if (onFocus && e.target instanceof HTMLDivElement) {
          onFocus(e as unknown as React.FocusEvent<HTMLDivElement>);
        }
      };
      
      divElement.addEventListener('focusin', handleFocus);
      
      return () => {
        divElement.removeEventListener('focusin', handleFocus);
      };
    }
  }, [onFocus]);

  return (
    <div 
      ref={wrapperRef} 
      className="item-editor-wrapper" 
      data-editor-id={editorId}
      style={{
        width: '100%'
      }}
    >
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <SlateEditor
          value={getEditorValue()}
          onChange={handleSlateChange}
          placeholder={placeholder}
          className="narrow-editor"
        />
      </div>
    </div>
  );
};

// Memoize the ItemEditor to improve performance
const MemoizedItemEditor = memo(ItemEditor, (prevProps, nextProps) => {
  // Compare props for equality (except complex objects like onChange function)
  if (prevProps.placeholder !== nextProps.placeholder) return false;
  if (prevProps.editorId !== nextProps.editorId) return false;
  
  // Deep compare content (this is the expensive part)
  try {
    return isEqual(prevProps.value, nextProps.value);
  } catch (e) {
    // If comparison fails, re-render to be safe
    return false;
  }
});

// Update createSlateContent to return a string instead of Slate objects
const createSlateContent = (text: any): string => {
  // Debug the input
  if (typeof text !== 'string') {
    console.log(`createSlateContent received non-string value:`, text, `type: ${typeof text}`);
    
    // If it's a Slate object, extract the text
    if (Array.isArray(text)) {
      try {
        let extractedText = '';
        const traverse = (nodes: any[]) => {
          for (const node of nodes) {
            if (typeof node.text === 'string') {
              extractedText += node.text;
            } else if (node.children) {
              traverse(node.children);
            }
          }
        };
        traverse(text);
        return extractedText;
      } catch (e) {
        console.error('Error extracting text from content array:', e);
      }
    }
  }
  
  // Convert to string directly
  return typeof text === 'string' ? text : String(text || '');
};

const WhackAMoleConfig = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { currentUser } = useAuth();
  const { onError } = useOutletContext<OutletContextType>();
  const { setHasUnsavedChanges } = useUnsavedChangesContext();

  // Editor selection state
  const [activeEditorId, setActiveEditorId] = useState<string | null>(null);
  const [lastSelectionPath, setLastSelectionPath] = useState<[number, number] | null>(null);
  // Track collapsed state for categories
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  // Track last added item for focus management
  const lastAddedItemRef = useRef<{categoryIndex: number, itemIndex: number, id: string | null}>({
    categoryIndex: 0, 
    itemIndex: 0,
    id: null
  });

  // Toggle collapse state for a category
  const toggleCategoryCollapse = (categoryId: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

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
  
  // Category management - updated to use new Category interface
  const [categories, setCategories] = useState<Category[]>([{
    id: generateId(),
    title: '',
    items: [{
      id: generateId(),
      content: '' // Use simple string
    }]
  }]);
  
  // Store initial form values for comparison
  const initialFormValuesRef = useRef({
    title: '',
    gameTime: 30,
    pointsPerHit: 10,
    penaltyPoints: 5,
    bonusPoints: 10,
    bonusThreshold: 3,
    gameSpeed: 2,
    instructions: '',
    shareConfig: false,
    categories: [] as Category[]
  });

  const [customTemplateId, setCustomTemplateId] = useState('');
  const [customGameTitle, setCustomGameTitle] = useState('');
  const [customTemplateError, setCustomTemplateError] = useState('');
  const [commonTemplates, setCommonTemplates] = useState([
    { id: 'pn24sw2vaDmdGjzcbkCb', title: 'short a v5' },
    // Add other common templates as needed
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
          console.log(`Loading template ${doc.id}:`, data); // Log the raw data
          
          // Create a consistent representation for the template
          let processedTemplate: WordCategory = {
            title: data.title || 'Untitled Template',
            words: [],
            gameTime: data.gameTime,
            pointsPerHit: data.pointsPerHit,
            penaltyPoints: data.penaltyPoints,
            bonusPoints: data.bonusPoints,
            bonusThreshold: data.bonusThreshold,
            speed: data.speed,
            instructions: data.instructions,
            share: data.share
          };
          
          // Handle both template formats: new (with categories) and old (with words)
          if (data.categories && Array.isArray(data.categories) && data.categories.length > 0) {
            // New format with categories field - preserve all categories
            processedTemplate.categories = data.categories.map(cat => ({
              title: cat.title || '',
              words: Array.isArray(cat.words) ? cat.words : []
            }));
            
            // For backwards compatibility, still set the words field with first category
            const firstCategory = data.categories[0];
            if (firstCategory && Array.isArray(firstCategory.words)) {
              processedTemplate.words = firstCategory.words;
            }
            console.log(`Using ${processedTemplate.categories.length} categories for template ${doc.id}`);
          } else if (data.words && Array.isArray(data.words)) {
            // Old format with words field
            processedTemplate.words = data.words;
            // Create a default category using these words
            processedTemplate.categories = [{
              title: data.title || 'Default Category',
              words: data.words
            }];
            console.log(`Using words field for template ${doc.id} (single category)`);
          }
          
          templates[doc.id] = processedTemplate;
          console.log(`Processed template ${doc.id}:`, processedTemplate);
        });
        
        // If we found templates in the database, use those
        if (Object.keys(templates).length > 0) {
          setDbTemplates(templates);
          console.log('Loaded word category templates from database:', templates);
        } else {
          // Otherwise use the default templates as fallback
          // Convert default templates to include categories
          const defaultTemplatesWithCategories = Object.entries(DEFAULT_WORD_CATEGORIES).reduce((acc, [key, template]) => {
            acc[key] = {
              ...template,
              categories: [{
                title: template.title,
                words: template.words
              }]
            };
            return acc;
          }, {} as Record<string, WordCategory>);
          
          setDbTemplates(defaultTemplatesWithCategories);
          console.log('No word category templates found in database, using defaults');
        }
      } catch (error) {
        console.error('Error fetching word category templates:', error);
        // Use default templates on error - convert to include categories
        const defaultTemplatesWithCategories = Object.entries(DEFAULT_WORD_CATEGORIES).reduce((acc, [key, template]) => {
          acc[key] = {
            ...template,
            categories: [{
              title: template.title,
              words: template.words
            }]
          };
          return acc;
        }, {} as Record<string, WordCategory>);
        
        setDbTemplates(defaultTemplatesWithCategories);
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
          const loadedTitle = data.title || '';
          const loadedGameTime = data.gameTime || 30;
          const loadedPointsPerHit = data.pointsPerHit || 10;
          const loadedPenaltyPoints = data.penaltyPoints || 5;
          const loadedBonusPoints = data.bonusPoints || 10;
          const loadedBonusThreshold = data.bonusThreshold || 3;
          const loadedGameSpeed = data.speed || 2;
          const loadedInstructions = data.instructions || '';
          const loadedShareConfig = data.share || false;
          
          setTitle(loadedTitle);
          setGameTime(loadedGameTime);
          setPointsPerHit(loadedPointsPerHit);
          setPenaltyPoints(loadedPenaltyPoints);
          setBonusPoints(loadedBonusPoints);
          setBonusThreshold(loadedBonusThreshold);
          setGameSpeed(loadedGameSpeed);
          setInstructions(loadedInstructions);
          setShareConfig(loadedShareConfig);
          
          // Handle categories
          let loadedWordCategories = [{ title: '', words: [] }];
          if (data.categories && Array.isArray(data.categories)) {
            loadedWordCategories = data.categories.map((cat: any) => ({
              title: cat.title || '',
              words: Array.isArray(cat.words) ? cat.words : [],
              gameTime: cat.gameTime,
              pointsPerHit: cat.pointsPerHit,
              penaltyPoints: cat.penaltyPoints,
              bonusPoints: cat.bonusPoints,
              bonusThreshold: cat.bonusThreshold,
              speed: cat.speed,
              instructions: cat.instructions,
              share: cat.share
            }));
            
            console.log("Loaded template with multiple categories:", loadedWordCategories);
            
            if (loadedWordCategories.length === 0) {
              loadedWordCategories = [{ title: '', words: [] }];
            }
          }
          
          // Convert word categories to our rich text format
          const loadedCategories = loadedWordCategories.map(wordCategory => 
            convertWordCategoryToCategory({
              title: wordCategory.title,
              words: wordCategory.words
            })
          );
          
          console.log("Converted to rich text categories:", loadedCategories);
          setCategories(loadedCategories);
          
          // Store initial values for unsaved changes detection
          initialFormValuesRef.current = {
            title: loadedTitle,
            gameTime: loadedGameTime,
            pointsPerHit: loadedPointsPerHit,
            penaltyPoints: loadedPenaltyPoints, 
            bonusPoints: loadedBonusPoints,
            bonusThreshold: loadedBonusThreshold,
            gameSpeed: loadedGameSpeed,
            instructions: loadedInstructions,
            shareConfig: loadedShareConfig,
            categories: JSON.parse(JSON.stringify(loadedCategories))
          };
          
          // Reset unsaved changes flag after loading
          setHasUnsavedChanges(false);
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
        navigate('/configure/whack-a-mole');
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplate();
  }, [templateId, currentUser, navigate, toast, onError, setHasUnsavedChanges]);
  
  // Check for form modifications
  useEffect(() => {
    // Skip this check during initial load or when saving
    if (isLoading) return;
    
    const currentValues = {
      title,
      gameTime,
      pointsPerHit,
      penaltyPoints,
      bonusPoints,
      bonusThreshold,
      gameSpeed,
      instructions,
      shareConfig,
      categories: JSON.parse(JSON.stringify(categories))
    };
    
    // Deep comparison between current and initial values
    const hasChanges = 
      currentValues.title !== initialFormValuesRef.current.title ||
      currentValues.gameTime !== initialFormValuesRef.current.gameTime ||
      currentValues.pointsPerHit !== initialFormValuesRef.current.pointsPerHit ||
      currentValues.penaltyPoints !== initialFormValuesRef.current.penaltyPoints ||
      currentValues.bonusPoints !== initialFormValuesRef.current.bonusPoints ||
      currentValues.bonusThreshold !== initialFormValuesRef.current.bonusThreshold ||
      currentValues.gameSpeed !== initialFormValuesRef.current.gameSpeed ||
      currentValues.instructions !== initialFormValuesRef.current.instructions ||
      currentValues.shareConfig !== initialFormValuesRef.current.shareConfig ||
      JSON.stringify(currentValues.categories) !== JSON.stringify(initialFormValuesRef.current.categories);
    
    setHasUnsavedChanges(hasChanges);
  }, [
    title, gameTime, pointsPerHit, penaltyPoints, bonusPoints, 
    bonusThreshold, gameSpeed, instructions, shareConfig, 
    categories, isLoading, setHasUnsavedChanges
  ]);

  // Handler for category selection
  const handleCategoryChange = (category: string) => {
    setGameCategory(category);
    
    // Check if template exists in either database templates or fallbacks
    const templateData = dbTemplates[category];
    
    if (templateData) {
      // If this is a new config or user confirms, update title and words
      if (!title || window.confirm("Do you want to replace the current title and words with this preset?")) {
        setTitle(templateData.title);
        
        // Update game configuration from template if available
        if (templateData.gameTime) setGameTime(templateData.gameTime);
        if (templateData.pointsPerHit) setPointsPerHit(templateData.pointsPerHit);
        if (templateData.penaltyPoints) setPenaltyPoints(templateData.penaltyPoints);
        if (templateData.bonusPoints) setBonusPoints(templateData.bonusPoints);
        if (templateData.bonusThreshold) setBonusThreshold(templateData.bonusThreshold);
        if (templateData.speed) setGameSpeed(templateData.speed);
        if (templateData.instructions) setInstructions(templateData.instructions);
        if (templateData.share !== undefined) setShareConfig(templateData.share);
        
        // Create new categories from the template
        const newCategories: Category[] = [];
        
        // Check for template data in "categories" array (new format)
        if (templateData.categories && Array.isArray(templateData.categories) && templateData.categories.length > 0) {
          // Process each category from the template
          templateData.categories.forEach(cat => {
            if (cat.words && Array.isArray(cat.words)) {
              newCategories.push({
                id: generateId(),
                title: cat.title || templateData.title,
                items: cat.words.map(word => ({
                  id: generateId(),
                  content: word // Store as simple string
                }))
              });
            }
          });
          
          console.log("Processing multiple categories from template", newCategories);
        }
        
        // If we don't have categories, or they're empty, use the words array (backward compatibility)
        if (newCategories.length === 0 && templateData.words && Array.isArray(templateData.words)) {
          newCategories.push({
            id: generateId(),
            title: templateData.title,
            items: templateData.words.map(word => ({
              id: generateId(),
              content: word // Store as simple string
            }))
          });
          
          console.log("Processing single category from template words array", newCategories);
        }
        
        // If we still don't have any categories, create at least one empty one
        if (newCategories.length === 0) {
          newCategories.push({
            id: generateId(),
            title: templateData.title || "",
            items: [{
              id: generateId(),
              content: "" // Use simple string
            }]
          });
        }
        
        // Update the categories state with the new categories
        setCategories(newCategories);
        
        console.log("Applied template with categories:", newCategories);
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

    // Validate categories
    if (categories.length === 0 || categories[0].items.length === 0) {
      toast({
        title: "Missing Words",
        description: "Please add at least one category with words.",
        status: "warning",
        duration: 5000,
      });
      return;
    }

    try {
      // Convert our rich text categories to the format expected by the database
      const categoriesForDb = categories.map(convertCategoryToWordCategory);
      
      console.log("Saving template with categories:", categoriesForDb);
      
      // Prepare the template data
      const templateData = {
        type: 'whack-a-mole',
        title: title.trim(),
        categories: categoriesForDb, // Use categories instead of words
        // For backward compatibility, also add the words array from the first category
        words: categoriesForDb[0]?.words || [],
        // Include all relevant configuration data
        gameTime,
        pointsPerHit,
        penaltyPoints,
        bonusPoints,
        bonusThreshold,
        speed: gameSpeed,
        instructions,
        share: shareConfig,
        userId: currentUser.uid,
        email: currentUser.email,
        createdAt: serverTimestamp()
      };

      // Save to the categoryTemplates collection
      const docRef = await addDoc(collection(db, 'categoryTemplates'), templateData);
      
      // Add the new template to the state with proper structure
      setDbTemplates({
        ...dbTemplates,
        [docRef.id]: {
          title: templateData.title,
          words: categoriesForDb[0]?.words || [], // For backwards compatibility
          categories: categoriesForDb, // Keep all categories
          // Include the additional properties for proper rendering
          gameTime: templateData.gameTime,
          pointsPerHit: templateData.pointsPerHit,
          penaltyPoints: templateData.penaltyPoints,
          bonusPoints: templateData.bonusPoints,
          bonusThreshold: templateData.bonusThreshold,
          speed: templateData.speed,
          instructions: templateData.instructions,
          share: templateData.share
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
      
      console.log("Saved template with categories:", templateData);
      
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
    setCategories([...categories, {
      id: generateId(),
      title: '',
      items: [{
        id: generateId(),
        content: '' // Use simple string
      }]
    }]);
  };

  const handleRemoveCategory = (index: number) => {
    const newCategories = [...categories];
    newCategories.splice(index, 1);
    setCategories(newCategories);
  };

  const handleCategoryTitleChange = (index: number, value: string) => {
    const newCategories = [...categories];
    newCategories[index].title = value;
    setCategories(newCategories);
  };

  const handleCategoryWordsChange = (index: number, value: string) => {
    const newCategories = [...categories];
    newCategories[index].items = value.split(',').map(word => ({
      id: generateId(),
      content: [{ type: 'paragraph', children: [{ text: word.trim() }] }]
    }));
    setCategories(newCategories);
  };

  // Handler functions for item management
  const handleItemContentChange = (categoryIndex: number, itemIndex: number, content: any) => {
    console.log(`Updating item content at category ${categoryIndex}, item ${itemIndex} with:`, content);
    
    const newCategories = [...categories];
    if (newCategories[categoryIndex] && newCategories[categoryIndex].items[itemIndex]) {
      // Store content as a simple string instead of a complex Slate object
      newCategories[categoryIndex].items[itemIndex].content = content;
      setCategories(newCategories);
    }
  };

  const handleAddItem = (categoryIndex: number) => {
    const newCategories = [...categories];
    if (newCategories[categoryIndex]) {
      const newItemId = generateId();
      newCategories[categoryIndex].items.push({
        id: newItemId,
        content: '' // Use simple string instead of Slate object
      });
      setCategories(newCategories);
      
      // Store information about the newly added item
      lastAddedItemRef.current = {
        categoryIndex,
        itemIndex: newCategories[categoryIndex].items.length - 1,
        id: newItemId
      };
      
      // Use setTimeout to focus the new item after the component has rendered
      setTimeout(() => {
        const { categoryIndex, itemIndex, id } = lastAddedItemRef.current;
        console.log(`Attempting to focus new item at category ${categoryIndex}, item ${itemIndex}, id ${id}`);
        
        const itemElement = document.querySelector(`[data-editor-id="${id}"]`);
        if (itemElement) {
          console.log('Found item element, focusing');
          // Find the actual editable element within the editor wrapper
          const editableElement = itemElement.querySelector('[contenteditable="true"]');
          if (editableElement) {
            (editableElement as HTMLElement).focus();
            // Set active editor ID and selection path
            setActiveEditorId(id);
            setLastSelectionPath([categoryIndex, itemIndex]);
          } else {
            console.log('Could not find editable element');
          }
        } else {
          console.log('Could not find item element with id:', id);
        }
      }, 100);
    }
  };

  const handleMoveItemUp = (categoryIndex: number, itemIndex: number) => {
    if (itemIndex <= 0) return;
    
    const newCategories = [...categories];
    const category = newCategories[categoryIndex];
    if (!category) return;
    
    const temp = category.items[itemIndex];
    category.items[itemIndex] = category.items[itemIndex - 1];
    category.items[itemIndex - 1] = temp;
    
    setCategories(newCategories);
  };

  const handleMoveItemDown = (categoryIndex: number, itemIndex: number) => {
    const newCategories = [...categories];
    const category = newCategories[categoryIndex];
    if (!category || itemIndex >= category.items.length - 1) return;
    
    const temp = category.items[itemIndex];
    category.items[itemIndex] = category.items[itemIndex + 1];
    category.items[itemIndex + 1] = temp;
    
    setCategories(newCategories);
  };

  // Get stable ID for the editor
  const getStableItemId = (categoryIndex: number, itemIndex: number) => {
    if (categories[categoryIndex] && categories[categoryIndex].items[itemIndex]) {
      return categories[categoryIndex].items[itemIndex].id;
    }
    return `item-${categoryIndex}-${itemIndex}`;
  };

  // Handle editor focus event
  const handleEditorFocus = (editorId: string) => (event: React.FocusEvent<HTMLDivElement>) => {
    setActiveEditorId(editorId);
    // Find the category and item index based on the editor ID
    for (let categoryIndex = 0; categoryIndex < categories.length; categoryIndex++) {
      const category = categories[categoryIndex];
      for (let itemIndex = 0; itemIndex < category.items.length; itemIndex++) {
        const item = category.items[itemIndex];
        if (item.id === editorId) {
          setLastSelectionPath([categoryIndex, itemIndex]);
          break;
        }
      }
    }
  };

  const handleDeleteItem = (categoryIndex: number, itemIndex: number) => {
    const updatedCategories = deleteItemFromCategory(categories, categoryIndex, itemIndex);
    
    // If this was the last item in the category, add a new empty item
    if (updatedCategories[categoryIndex] && updatedCategories[categoryIndex].items.length === 0) {
      updatedCategories[categoryIndex].items.push({
        id: generateId(),
        content: '' // Use simple string
      });
    }
    
    setCategories(updatedCategories);
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
    const validCategories = categories.filter(cat => 
      cat.title.trim() && cat.items.length > 0 && cat.items.some(item => {
        // Check if the item has content
        if (typeof item.content === 'string') return item.content.trim().length > 0;
        if (Array.isArray(item.content)) {
          // For Slate structure, check if there's text content
          let hasText = false;
          const traverse = (nodes: any[]) => {
            for (const node of nodes) {
              if (typeof node.text === 'string' && node.text.trim().length > 0) {
                hasText = true;
                break;
              } else if (node.children) {
                traverse(node.children);
                if (hasText) break;
              }
            }
          };
          traverse(item.content);
          return hasText;
        }
        return false;
      })
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
      // Convert our rich text categories to the format expected by the database
      const wordCategoriesForDb = validCategories.map(convertCategoryToWordCategory);

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
        categories: wordCategoriesForDb,
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

      // After successful save, reset the unsaved changes flag
      setHasUnsavedChanges(false);
      
      // Update initial values reference
      initialFormValuesRef.current = {
        title,
        gameTime,
        pointsPerHit,
        penaltyPoints,
        bonusPoints,
        bonusThreshold,
        gameSpeed,
        instructions,
        shareConfig,
        categories: JSON.parse(JSON.stringify(categories))
      };

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

  // Handling for updating categories
  const handleUpdateCategories = (updatedCategories: WordCategory[]) => {
    // Create new categories using the WordCategory data
    const updatedCategoriesForState = updatedCategories.map(cat => {
      return convertWordCategoryToCategory(cat);
    });
    
    setCategories(updatedCategoriesForState);
    setHasUnsavedChanges(true);
  };

  return (
    <EditorSelectionContext.Provider value={{
        activeEditorId,
        setActiveEditorId,
        lastSelectionPath,
        setLastSelectionPath
    }}>
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading size="md" mb={4}>Game Settings</Heading>
        
          <SimpleGrid columns={[1, null, 2]} spacing={6}>
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
                    maxW="400px"
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
                  maxW="400px"
            />
        </FormControl>

        <FormControl mb={4}>
          <FormLabel>Game Time (seconds)</FormLabel>
                <NumberInput
                  value={gameTime}
                  onChange={(_, value) => setGameTime(value)}
                  min={30}
                  max={300}
                  maxW="200px"
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
                maxW="300px"
              >
                <option value={1}>Slow (10-12 moles)</option>
                <option value={2}>Medium (14-16 moles)</option>
                <option value={3}>Fast (17-19 moles)</option>
          </Select>
          <FormHelperText>Controls how frequently moles appear during the game</FormHelperText>
        </FormControl>
          </SimpleGrid>

        <FormControl mb={4}>
          <FormLabel>Game Instructions</FormLabel>
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              placeholder="Enter custom instructions for players"
                rows={3}
                maxW="800px"
            />
            <FormHelperText>
              Custom instructions to show on the game start screen. If left empty, default instructions will be shown.
            </FormHelperText>
        </FormControl>
      </Box>

        <Box>
          <Heading size="md" mb={4}>Scoring</Heading>
        
          <SimpleGrid columns={[1, null, 2]} spacing={6}>
        <FormControl mb={4}>
          <FormLabel>Points Per Hit</FormLabel>
                <NumberInput
                  value={pointsPerHit}
                  onChange={(_, value) => setPointsPerHit(value)}
                  min={1}
                  maxW="200px"
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
                  maxW="200px"
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
                  maxW="200px"
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
                  maxW="200px"
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
          <FormHelperText>Number of consecutive correct hits needed to trigger bonus points</FormHelperText>
        </FormControl>
          </SimpleGrid>
      </Box>

        <Box>
          <Heading size="md" mb={4}>Word Categories</Heading>
        <Text mb={4}>
          Add categories of words that will appear on moles during the game.
        </Text>
        
          {categories.map((category, categoryIndex) => (
            <Box 
              key={category.id || categoryIndex} 
              p={0} 
              borderWidth="1px" 
              borderRadius="md" 
              mb={4}
              bg="gray.50"
            >
              <Flex 
                p={4} 
                justifyContent="space-between" 
                alignItems="center" 
                borderBottomWidth={collapsedCategories[category.id] ? '0px' : '1px'}
                borderBottomColor="gray.200"
                cursor="pointer"
                onClick={() => toggleCategoryCollapse(category.id)}
                bg={collapsedCategories[category.id] ? "gray.100" : "gray.50"}
                borderTopLeftRadius="md"
                borderTopRightRadius="md"
              >
                <Heading size="md">Category {categoryIndex + 1}</Heading>
                <HStack spacing={2}>
                  <IconButton
                    icon={<ChevronUpIcon />}
                    aria-label="Move category up"
                    size="sm"
                    isDisabled={categoryIndex === 0}
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent collapse toggle
                      const newCategories = [...categories];
                      const temp = newCategories[categoryIndex];
                      newCategories[categoryIndex] = newCategories[categoryIndex - 1];
                      newCategories[categoryIndex - 1] = temp;
                      setCategories(newCategories);
                    }}
                  />
                  <IconButton
                    icon={<ChevronDownIcon />}
                    aria-label="Move category down"
                    size="sm"
                    isDisabled={categoryIndex === categories.length - 1}
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent collapse toggle
                      const newCategories = [...categories];
                      const temp = newCategories[categoryIndex];
                      newCategories[categoryIndex] = newCategories[categoryIndex + 1];
                      newCategories[categoryIndex + 1] = temp;
                      setCategories(newCategories);
                    }}
                  />
                  {collapsedCategories[category.id] ? 
                    <ChevronDownIcon boxSize={6} /> : 
                    <ChevronUpIcon boxSize={6} />
                  }
                </HStack>
              </Flex>
              
              <Collapse in={!collapsedCategories[category.id]} animateOpacity>
                <Box p={4}>
            <FormControl mb={4}>
                    <FormLabel>Category Name</FormLabel>
                    <Input
                      value={category.title}
                      onChange={(e) => handleCategoryTitleChange(categoryIndex, e.target.value)}
                  placeholder="Category title"
                      maxW="400px"
                />
            </FormControl>
              
                  <Box mb={4}>
                    <FormLabel>Items</FormLabel>
                    <Text fontSize="sm" color="gray.600" mb={3}>
                      Enter items to be displayed on moles that players will hit. (Minimum 1 Item)
                    </Text>
                    
                    {category.items.map((item, itemIndex) => (
                      <Box 
                        key={item.id || `item-${categoryIndex}-${itemIndex}`}
                        mb={3}
                      >
                        <Flex align="center" maxW="750px">
                          <Text minW="30px" fontSize="md" mr={2}>{itemIndex + 1}.</Text>
                          <Box 
                            flexGrow={1} 
                            mr={2}
                            borderWidth="1px"
                            borderRadius="md"
                            borderColor="gray.200"
                            bg="white"
                            p={2}
                            maxW="400px"
                          >
                            <MemoizedItemEditor
                              value={item.content}
                              onChange={(content) => handleItemContentChange(categoryIndex, itemIndex, content)}
                              onFocus={handleEditorFocus(item.id)}
                              placeholder={`Enter word ${itemIndex + 1}`}
                              editorId={item.id}
                            />
                          </Box>
                          <Flex>
                            <IconButton
                              icon={<ChevronUpIcon />}
                              aria-label="Move item up"
                              size="sm"
                              isDisabled={itemIndex === 0}
                              onClick={() => handleMoveItemUp(categoryIndex, itemIndex)}
                              mr={1}
                            />
                            <IconButton
                              icon={<ChevronDownIcon />}
                              aria-label="Move item down"
                              size="sm"
                              isDisabled={itemIndex === category.items.length - 1}
                              onClick={() => handleMoveItemDown(categoryIndex, itemIndex)}
                              mr={1}
                            />
                            <IconButton
                              icon={<DeleteIcon />}
                              aria-label="Delete item"
                              size="sm"
                              colorScheme="red"
                              isDisabled={category.items.length <= 1}
                              onClick={() => handleDeleteItem(categoryIndex, itemIndex)}
                            />
                          </Flex>
                        </Flex>
                      </Box>
                    ))}
                    
                    <Flex justifyContent="space-between" mt={4} mb={2}>
              <Button 
                        leftIcon={<AddIcon />}
                        onClick={() => handleAddItem(categoryIndex)}
                size="sm" 
                        colorScheme="blue"
                        _hover={{ bg: 'blue.600' }}
                      >
                        Add Item
                      </Button>
                      
                      {categories.length > 1 && (
                        <Button 
                colorScheme="red" 
                          onClick={() => handleRemoveCategory(categoryIndex)}
                          size="sm"
                          variant="outline"
                          borderRadius="md"
                          _hover={{ bg: 'red.50' }}
              >
                Remove Category
              </Button>
            )}
                    </Flex>
                  </Box>
                </Box>
              </Collapse>
          </Box>
        ))}
        
          <Flex justify="space-between" mb={4}>
          <Button 
            colorScheme="blue" 
            onClick={handleAddCategory} 
            leftIcon={<AddIcon />}
              size="md"
              borderRadius="md"
              bg="blue.500"
              _hover={{ bg: 'blue.600' }}
              width="auto"
          >
          Add Category
        </Button>
            
            {categories.length > 1 && categories.some(cat => !collapsedCategories[cat.id]) && (
              <Button
                colorScheme="gray"
                onClick={() => {
                  const allCategoryIds = categories.map(cat => cat.id);
                  const newCollapsedState = allCategoryIds.reduce((acc, id) => {
                    acc[id] = true;
                    return acc;
                  }, {} as Record<string, boolean>);
                  setCollapsedCategories(newCollapsedState);
                }}
                size="md"
              >
                Collapse All
              </Button>
            )}
            
            {categories.length > 1 && categories.some(cat => collapsedCategories[cat.id]) && (
              <Button
                colorScheme="gray"
                onClick={() => {
                  const allCategoryIds = categories.map(cat => cat.id);
                  const newCollapsedState = allCategoryIds.reduce((acc, id) => {
                    acc[id] = false;
                    return acc;
                  }, {} as Record<string, boolean>);
                  setCollapsedCategories(newCollapsedState);
                }}
                size="md"
              >
                Expand All
              </Button>
            )}
          </Flex>
      </Box>

        <Box>
          <Heading size="md" mb={4}>Templates</Heading>
        <FormControl mb={4}>
          <Button 
            colorScheme="teal" 
            size="md" 
            onClick={handleSaveAsTemplate}
              isDisabled={!currentUser || categories.length === 0 || (categories[0]?.items.length || 0) === 0}
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

      {/* Developer Utility Section - only visible in development */}
      {import.meta.env.DEV && (
        <Box mt={8} p={4} borderWidth="1px" borderRadius="md" borderColor="gray.300">
          <Heading size="md" mb={4}>Developer Utilities</Heading>
          <Text mb={4} color="gray.600">
            These tools are only available in development mode and are used for debugging and fixing database issues.
          </Text>
          
          <Stack spacing={4}>
            <Box
              border="1px solid"
              borderColor="gray.200"
              borderRadius="md"
              p={4}
            >
              <Text fontWeight="bold" mb={4}>
                Current Template: {title || 'Untitled'}
              </Text>
              {templateId && (
                <EnhancedTemplateSync
                  templateId={templateId}
                  gameTitle={title}
                  gameType="whack-a-mole"
                  showDescription={true}
                />
              )}
            </Box>

            <Box
              border="1px solid"
              borderColor="gray.200"
              borderRadius="md"
              p={4}
            >
              <Text fontWeight="bold" mb={4}>
                Common Templates
              </Text>
              {commonTemplates.map((template) => (
                <Box key={template.id} mb={4}>
                  <Text mb={2}>{template.title}</Text>
                  <EnhancedTemplateSync
                    templateId={template.id}
                    gameTitle={template.title}
                    gameType="whack-a-mole"
                    variant="compact"
                  />
                </Box>
              ))}
            </Box>

            <Box
              border="1px solid"
              borderColor="gray.200"
              borderRadius="md"
              p={4}
            >
              <Text fontWeight="bold" mb={4}>
                Custom Template
              </Text>
              <FormControl isInvalid={Boolean(customTemplateError)}>
                <FormLabel htmlFor="customTemplateId">Template ID</FormLabel>
                <Input
                  id="customTemplateId"
                  value={customTemplateId}
                  onChange={(e) => setCustomTemplateId(e.target.value)}
                  placeholder="Enter template ID"
                />
                {customTemplateError && (
                  <FormErrorMessage>{customTemplateError}</FormErrorMessage>
                )}
              </FormControl>
              <FormControl mt={2}>
                <FormLabel htmlFor="customGameTitle">Game Title</FormLabel>
                <Input
                  id="customGameTitle"
                  value={customGameTitle}
                  onChange={(e) => setCustomGameTitle(e.target.value)}
                  placeholder="Enter game title"
                />
              </FormControl>
              {customTemplateId && customGameTitle && (
                <Box mt={4}>
                  <EnhancedTemplateSync
                    templateId={customTemplateId}
                    gameTitle={customGameTitle}
                    gameType="whack-a-mole"
                  />
                </Box>
              )}
            </Box>
          </Stack>
        </Box>
      )}
    </VStack>
    </EditorSelectionContext.Provider>
  );
};

export default WhackAMoleConfig; 