import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
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
  Switch,
  Button,
  Heading,
  Box,
  Divider,
  useToast,
  Text,
  HStack,
  IconButton,
  Flex,
  ButtonGroup,
  Tooltip,
  Spinner,
  Select,
} from '@chakra-ui/react';
import { collection, addDoc, doc, getDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { serverTimestamp } from 'firebase/firestore';
import { AddIcon, ChevronUpIcon, ChevronDownIcon, DeleteIcon } from '@chakra-ui/icons';
import { FaUndo, FaRedo } from 'react-icons/fa';
import SlateEditor from '../../components/SlateEditor';
import { MAX_ITEMS_PER_CATEGORY, MIN_ITEMS_PER_CATEGORY, MAX_CATEGORIES, MIN_CATEGORIES } from '../../constants/game';
import isEqual from 'lodash/isEqual';

interface CategoryTemplate {
  title: string;
  categories: Array<{ name: string; items: string[] }>;
  eggQty?: number;
}

interface Category {
  name: string;
  items: string[];
}

// Default categories to use as fallback if database fetch fails
const DEFAULT_CATEGORIES: Record<string, CategoryTemplate> = {
  animals: {
    title: "Animals",
    categories: [
      { name: "Mammals", items: ["dog", "cat", "elephant", "lion", "monkey", "tiger", "bear", "giraffe", "zebra", "kangaroo"] },
      { name: "Birds", items: ["eagle", "sparrow", "penguin", "ostrich", "owl", "parrot", "crow", "chicken", "duck", "flamingo"] },
      { name: "Reptiles", items: ["snake", "lizard", "turtle", "crocodile", "alligator", "iguana", "chameleon", "gecko", "cobra", "python"] }
    ],
    eggQty: 12
  },
  colors: {
    title: "Colors",
    categories: [
      { name: "Warm Colors", items: ["red", "orange", "yellow", "pink", "brown", "maroon", "coral", "gold", "amber", "peach"] },
      { name: "Cool Colors", items: ["blue", "green", "purple", "indigo", "violet", "teal", "cyan", "navy", "mint", "turquoise"] }
    ],
    eggQty: 10
  },
  food: {
    title: "Food",
    categories: [
      { name: "Fruits", items: ["apple", "banana", "orange", "grape", "strawberry", "pear", "watermelon", "kiwi", "mango", "peach"] },
      { name: "Vegetables", items: ["carrot", "tomato", "lettuce", "potato", "onion", "broccoli", "cucumber", "spinach", "pepper", "corn"] },
      { name: "Grains", items: ["rice", "wheat", "oats", "barley", "quinoa", "corn", "millet", "rye", "buckwheat", "pasta"] }
    ],
    eggQty: 15
  }
};

// Add interface for the outlet context
interface OutletContextType {
  onError?: (message: string) => void;
}

// Create a selection context to track the active editor across component tree
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
  setLastSelectionPath: () => {},
});

// Add additional CSS for category headers at the top of the file with other styles
const styles = `
  /* Global Apple-style design */
  .apple-container {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    max-width: 800px;
    margin: 0 auto;
  }
  
  /* Section styling */
  .apple-section {
    background-color: white;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    padding: 20px;
    margin-bottom: 24px;
    border: 1px solid #E2E8F0;
    transition: all 0.2s ease;
  }

  .apple-section:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
  
  /* Section header */
  .apple-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    border-bottom: 1px solid #E2E8F0;
    padding-bottom: 12px;
  }
  
  /* Input fields */
  .apple-input {
    border-radius: 8px !important;
    border-color: #E2E8F0 !important;
    background-color: #F9FAFC !important;
    transition: all 0.2s ease !important;
  }
  
  .apple-input:focus-within {
    border-color: #007AFF !important;
    box-shadow: 0 0 0 1px #007AFF !important;
    background-color: white !important;
  }
  
  /* Buttons */
  .apple-button {
    border-radius: 8px !important;
    font-weight: 500 !important;
    transition: all 0.2s ease !important;
  }
  
  .apple-button-primary {
    background-color: #007AFF !important;
    color: white !important;
  }
  
  .apple-button-primary:hover {
    background-color: #0063CC !important;
    transform: translateY(-1px) !important;
  }
  
  .apple-button-primary:active {
    transform: translateY(0) scale(0.98) !important;
  }
  
  .apple-button-secondary {
    background-color: #F1F5F9 !important;
    color: #1E293B !important;
    border: 1px solid #E2E8F0 !important;
  }
  
  .apple-button-secondary:hover {
    background-color: #E2E8F0 !important;
    transform: translateY(-1px) !important;
  }
  
  .apple-button-secondary:active {
    transform: translateY(0) scale(0.98) !important;
  }

  .empty-input:before {
    content: attr(data-placeholder);
    color: #CBD5E0;
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
  }
  
  /* Add styling for active category */
  .category-box {
    transition: all 0.2s ease;
    border: 1px solid #E2E8F0;
  }
  
  .category-box:focus-within {
    border-color: #007AFF;
    box-shadow: 0 0 0 1px #007AFF;
    background-color: #F7FAFF;
  }

  /* Category header styling */
  .category-header {
    background-color: #f5f7fa;
    margin: -16px -16px 16px -16px;
    padding: 12px 16px;
    border-top-left-radius: 7px;
    border-top-right-radius: 7px;
    border-bottom: 1px solid #E2E8F0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .category-box:focus-within .category-header {
    background-color: #EBF5FF;
    border-bottom-color: #C5E0FF;
  }

  /* Category order buttons */
  .order-buttons {
    display: flex;
    gap: 4px;
  }

  /* Add styling for select dropdowns */
  .apple-select {
    appearance: none;
    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
    background-repeat: no-repeat;
    background-position: right 0.7rem center;
    background-size: 1rem;
    padding-right: 2.5rem !important;
  }
  
  .apple-select:focus {
    box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.3) !important;
    border-color: #007AFF !important;
    outline: none;
  }
  
  .apple-select option {
    font-weight: normal;
    font-size: 14px;
    padding: 8px;
  }
`;

// Update the appleStyleButton to match our new styling
const appleStyleButton = {
  className: "apple-button apple-button-secondary",
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '4px 8px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '500',
  backgroundColor: 'white',
  border: '1px solid #d1d5db',
  color: '#374151',
  transition: 'all 0.2s ease',
  _hover: {
    backgroundColor: '#f9fafb',
    borderColor: '#9ca3af',
    transform: 'translateY(-1px)'
  },
  _active: {
    backgroundColor: '#f3f4f6',
    transform: 'scale(0.98)',
  }
}

const appleStyleIconButton = {
  ...appleStyleButton,
  className: "apple-button",
  width: '32px',
  height: '32px',
  padding: '0',
  minWidth: 'auto',
}

const appleStyleDangerButton = {
  ...appleStyleButton,
  className: "apple-button",
  backgroundColor: 'white',
  color: '#DC2626',
  borderColor: '#FECACA',
  _hover: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    transform: 'translateY(-1px)'
  }
}

// Move the delete handler outside the component to avoid HMR issues
const deleteItemFromCategory = (
  categories: Category[],
  categoryIndex: number,
  itemIndex: number
): Category[] => {
  console.log(`=== Starting delete operation ===`);
  console.log(`Target: Item #${itemIndex + 1} (array index: ${itemIndex}) in Category #${categoryIndex + 1} (array index: ${categoryIndex})`);
  
  // Create a new copy of categories
  const newCategories = [...categories];
  const category = {...newCategories[categoryIndex]};
  const items = [...category.items];
  
  console.log('Current items before deletion:', items);
  console.log(`Removing item at index ${itemIndex}:`, items[itemIndex]);
  
  // Remove the item
  items.splice(itemIndex, 1);
  
  // Add empty item if needed
  if (items.length === 0) {
    console.log('Adding empty item to maintain structure');
    items.push('');
  }
  
  console.log('Items after deletion:', items);
  
  // Update the category with new items
  category.items = items;
  newCategories[categoryIndex] = category;
  
  console.log('=== Delete operation completed ===');
  return newCategories;
};

// Define a custom interface for the ref
interface SlateEditorRef extends HTMLDivElement {
  focus: () => boolean;
  undo: () => void;
  redo: () => void;
}

// Helper function to debug item content
const debugItemContent = (itemContent: string) => {
  console.log('Item content inspection:');
  console.log('- String length:', itemContent.length);
  console.log('- Is empty string:', itemContent === '');
  console.log('- After trim length:', itemContent.trim().length);
  console.log('- Character codes:', Array.from(itemContent).map(c => c.charCodeAt(0)));
  console.log('- Content as JSON:', JSON.stringify(itemContent));
  return itemContent && itemContent.trim().length > 0;
};

const SortCategoriesEggConfig = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { currentUser } = useAuth();
  const { onError } = useOutletContext<OutletContextType>();

  // Form state
  const [title, setTitle] = useState('');
  const [eggQty, setEggQty] = useState(6);
  const [shareConfig, setShareConfig] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [templateKey, setTemplateKey] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Category templates state
  const [dbTemplates, setDbTemplates] = useState<Record<string, CategoryTemplate>>({});
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  
  // Category management
  const [categories, setCategories] = useState<Category[]>([
    { name: '', items: [''] }
  ]);

  // Get a deep copy of the initial categories for history
  const initialCategories = JSON.parse(JSON.stringify([{ name: '', items: [''] }]));

  // History state for undo/redo
  const [history, setHistory] = useState<{
    past: Category[][];
    present: Category[];
    future: Category[][];
  }>({
    past: [],
    present: initialCategories,
    future: []
  });

  // Flag to prevent adding to history when programmatically changing categories
  const skipNextHistoryRef = useRef(false);

  // Update history present state when categories change
  useEffect(() => {
    if (skipNextHistoryRef.current) {
      skipNextHistoryRef.current = false;
      return;
    }

    // Update present in history if it's different from current categories
    if (!isEqual(history.present, categories)) {
      setHistory(prev => ({
        past: [...prev.past, prev.present],
        present: JSON.parse(JSON.stringify(categories)), // Deep copy
        future: []
      }));
    }
  }, [categories]);

  // Keep a ref to all rendered editors for direct access to undo/redo methods
  const editorRefsMap = useRef<Map<string, React.RefObject<SlateEditorRef>>>(new Map());
  
  // Create refs for editors
  useEffect(() => {
    // Clean up old refs that are no longer needed
    const validKeys = new Set<string>();
    
    // Create refs for all category names
    categories.forEach((_, categoryIndex) => {
      const nameKey = `name-${categoryIndex}`;
      validKeys.add(nameKey);
      
      if (!editorRefsMap.current.has(nameKey)) {
        editorRefsMap.current.set(nameKey, React.createRef<SlateEditorRef>());
      }
      
      // Create refs for all items
      categories[categoryIndex].items.forEach((_, itemIndex) => {
        const itemKey = `item-${categoryIndex}-${itemIndex}`;
        validKeys.add(itemKey);
        
        if (!editorRefsMap.current.has(itemKey)) {
          editorRefsMap.current.set(itemKey, React.createRef<SlateEditorRef>());
        }
      });
    });
    
    // Remove refs for editors that no longer exist
    const keysToRemove: string[] = [];
    editorRefsMap.current.forEach((_, key) => {
      if (!validKeys.has(key)) {
        keysToRemove.push(key);
      }
    });
    
    keysToRemove.forEach(key => {
      editorRefsMap.current.delete(key);
    });
  }, [categories]);

  // Replace the method we're using to track the last item
  const lastItemInfoRef = useRef<{categoryIndex: number, itemIndex: number}>({categoryIndex: 0, itemIndex: 0});

  // Add a useRef to track item IDs
  const itemIdsRef = useRef<Record<string, string>>({});
  const nextIdRef = useRef(1);

  // Add category ID tracking similar to item IDs
  const categoryIdsRef = useRef<Record<number, string>>({});
  const nextCategoryIdRef = useRef(1);

  // Check if user is an admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!currentUser || !currentUser.email) {
        console.log('No current user or email');
        return;
      }
      
      try {
        // Normalize the email to lowercase for comparison
        const userEmail = currentUser.email.toLowerCase();
        console.log('Checking admin status for:', userEmail);
        
        // Check if user exists in adminUsers collection
        const adminUsersRef = collection(db, 'adminUsers');
        const q = query(adminUsersRef, where('email', '==', userEmail));
        const querySnapshot = await getDocs(q);
        
        console.log('Admin query result count:', querySnapshot.size);
        
        if (!querySnapshot.empty) {
          const adminData = querySnapshot.docs[0].data();
          console.log('Admin data found:', adminData);
          // If they have a role of admin, set isAdmin to true
          if (adminData.role === 'admin') {
            console.log('User is an admin!');
            setIsAdmin(true);
          } else {
            console.log('User found but role is not admin:', adminData.role);
          }
        } else {
          // Let's also try a more general query to see what admin emails exist
          const allAdminsSnapshot = await getDocs(collection(db, 'adminUsers'));
          console.log('All admin users:');
          allAdminsSnapshot.forEach(doc => {
            console.log('- Email:', doc.data().email, 'Role:', doc.data().role);
          });
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };
    
    checkAdminStatus();
  }, [currentUser]);

  // Load category templates from database
  useEffect(() => {
    const fetchCategoryTemplates = async () => {
      setLoadingTemplates(true);
      try {
        // Query the categoryTemplates collection for 'sort-categories-egg' type templates
        const templatesQuery = query(
          collection(db, 'categoryTemplates'),
          where('type', '==', 'sort-categories-egg')
        );
        
        const querySnapshot = await getDocs(templatesQuery);
        const templates: Record<string, CategoryTemplate> = {};
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          templates[doc.id] = {
            title: data.title || 'Untitled Template',
            categories: Array.isArray(data.categories) ? data.categories : [],
            eggQty: data.eggQty || 6
          };
        });
        
        // If we found templates in the database, use those
        if (Object.keys(templates).length > 0) {
          setDbTemplates(templates);
          
          // Auto-select if there's only one template or if we have a URL fragment
          const fragment = window.location.hash.replace('#', '');
          
          // Check if we should auto-select a template
          if (Object.keys(templates).length === 1) {
            // If there's only one template, select it
            const templateId = Object.keys(templates)[0];
            setTemplateKey(templateId);
            applyTemplate(templates[templateId]);
          } else if (fragment && templates[fragment]) {
            // If URL contains a fragment matching a template ID, select it
            setTemplateKey(fragment);
            applyTemplate(templates[fragment]);
          }
        } else {
          // Otherwise use the default templates as fallback
          setDbTemplates(DEFAULT_CATEGORIES);
        }
      } catch (error) {
        console.error('Error fetching category templates:', error);
        // Use default templates on error
        setDbTemplates(DEFAULT_CATEGORIES);
        toast({
          title: 'Error loading templates',
          description: 'Using default templates instead.',
          status: 'warning',
          duration: 3000,
        });
      } finally {
        setLoadingTemplates(false);
      }
    };
    
    fetchCategoryTemplates();
  }, [toast]);
  
  // Helper function to apply a template to the form
  const applyTemplate = (templateData: CategoryTemplate) => {
    if (!templateData) return;
    
    // Set the title and eggQty
    setTitle(templateData.title || 'Untitled Template');
    setEggQty(templateData.eggQty || 6);
    
    // Ensure categories is properly formatted
    const sanitizedCategories = (templateData.categories || []).map(cat => ({
      name: cat?.name || '',
      items: Array.isArray(cat?.items) ? 
        // Filter out null/undefined items and ensure strings
        cat.items.filter(Boolean).map(item => item) : 
        [''] // Default to empty array with one empty string
    }));
    
    // If there are no categories, add a default empty one
    if (sanitizedCategories.length === 0) {
      sanitizedCategories.push({ name: '', items: [''] } as Category);
    }
    
    setCategories(sanitizedCategories);
  };

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
          setEggQty(data.eggQty || 6);
          setShareConfig(data.share || false);
          
          // Handle categories
          if (data.categories && Array.isArray(data.categories)) {
            const loadedCategories = data.categories.map((cat: string) => ({
              name: cat || '',
              items: [cat]
            }));
            setCategories(loadedCategories);
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
          navigate('/configure/sort-categories-egg');
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

  // Handler for template selection
  const handleTemplateChange = (template: string) => {
    setTemplateKey(template);
    
    // Check if template exists in either database templates or fallbacks
    const templateData = dbTemplates[template];
    
    if (templateData) {
      // If this is a new config or user confirms, update title and categories
      if (!title || window.confirm("Do you want to replace the current title and categories with this preset?")) {
        // Apply the template data to the form
        applyTemplate(templateData);
        
        // Update URL fragment to save the selected template for later
        window.location.hash = template;
      }
    }
  };

  // Save the current configuration as a template in the database
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

    // Process categories to filter out empty items
    const processedCategories = categories.map(category => {
      console.log(`Category "${category.name}": item count before filtering:`, category.items.length);
      const filtered = {
        name: (category.name || '').trim(),
        items: Array.isArray(category.items) 
          ? category.items.filter(item => {
              console.log(`Checking item in category "${category.name}":`);
              const isValid = debugItemContent(item);
              if (!isValid) console.log(`  - Found empty item in category "${category.name}"`);
              return isValid;
            })
          : []
      };
      console.log(`Category "${category.name}": item count after filtering:`, filtered.items.length);
      return filtered;
    });

    console.log("Processed categories:", processedCategories);

    if (processedCategories.length === 0) {
      console.log("Error: No categories found after processing");
      toast({
        title: "Missing Categories",
        description: "Please add at least one category with items.",
        status: "warning",
        duration: 5000,
      });
      return;
    }

    // Validate each category has at least 3 items
    const categoriesWithTooFewItems = processedCategories.filter(cat => {
      const hasTooFew = cat.items.length < 3;
      if (hasTooFew) {
        console.log(`Category "${cat.name}" has too few items: ${cat.items.length}`);
      }
      return hasTooFew;
    });
    
    if (categoriesWithTooFewItems.length > 0) {
      console.log("Categories with too few items:", categoriesWithTooFewItems);
      toast({
        title: "Not Enough Items",
        description: "Each category must have at least 3 items.",
        status: "warning",
        duration: 5000,
      });
      return;
    }

    try {
      // Prepare the template data
      const templateData = {
        type: 'sort-categories-egg',
        title: title.trim(),
        categories: processedCategories,
        eggQty: eggQty,
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
          categories: processedCategories,
          eggQty: eggQty
        }
      });
      
      toast({
        title: "Template Saved",
        description: "Your template has been saved and will be available for future use.",
        status: "success",
        duration: 3000,
      });
      
      // Set the template key to the new template
      setTemplateKey(docRef.id);
      
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
    // Check for maximum limit (10 categories)
    if (categories.length >= 10) {
      toast({
        title: "Maximum Categories Reached",
        description: "You cannot add more than 10 categories.",
        status: "warning",
        duration: 3000,
      });
      return;
    }
    
    setCategories(prevCategories => {
      const newIndex = prevCategories.length;
      // Preemptively generate stable ID for the new category
      getStableCategoryId(newIndex);
      return [...prevCategories, { name: '', items: [''] }];
    });
  };

  const handleRemoveCategory = (index: number) => {
    // Safety check
    if (index < 0 || index >= categories.length) {
      return;
    }
    
    // Check for minimum limit (2 categories)
    if (categories.length <= 2) {
      toast({
        title: "Minimum Categories Required",
        description: "You must have at least 2 categories.",
        status: "warning",
        duration: 3000,
      });
      return;
    }
    
    setCategories(prevCategories => {
      // Create a new array to avoid mutation
      const updatedCategories = [...prevCategories];
      
      // Before removing the category, we need to adjust the IDs
      // Get all existing category IDs
      const existingIds = {...categoryIdsRef.current};
      
      // Remove the category
      updatedCategories.splice(index, 1);
      
      // Adjust reference IDs for all categories after the removed one
      for (let i = index; i < prevCategories.length - 1; i++) {
        categoryIdsRef.current[i] = existingIds[i+1];
      }
      
      // Remove the last ID since we've shifted all down
      delete categoryIdsRef.current[prevCategories.length - 1];
      
      // Ensure there's at least one category
      if (updatedCategories.length === 0) {
        updatedCategories.push({ name: '', items: [''] });
      }
      
      return updatedCategories;
    });
  };

  const handleCategoryNameChange = (index: number, value: string) => {
    console.log('Changing category name at index:', index, 'to:', value);
    
    setCategories(prevCategories => {
      // Safety check
      if (index < 0 || index >= prevCategories.length) {
        console.warn('Invalid category index:', index);
        return prevCategories;
      }
      
      // Create a new array and copy all categories
      const updatedCategories = [...prevCategories];
      
      // Create a new category object with the updated name but the same items
      updatedCategories[index] = {
        ...updatedCategories[index],
        name: value
      };
      
      // Log the state update for debugging
      console.log('Category before update:', prevCategories[index]);
      console.log('Category after update:', updatedCategories[index]);
      
      return updatedCategories;
    });
  };

  // Track active editor and selection state
  const [activeEditorId, setActiveEditorId] = useState<string | null>(null);
  const [lastSelectionPath, setLastSelectionPath] = useState<[number, number] | null>(null);
  
  // Force focus to remain in the correct editor when switching
  useEffect(() => {
    if (lastSelectionPath && activeEditorId) {
      // Find the editor that should have focus based on lastSelectionPath
      const [categoryIndex, itemIndex] = lastSelectionPath;
      
      // Get the element with the correct data-editor-id
      const editorElements = document.querySelectorAll(`[data-editor-id]`);
      editorElements.forEach(el => {
        const editorId = el.getAttribute('data-editor-id');
        const editorCategoryIndex = el.closest('[data-category-index]')?.getAttribute('data-category-index');
        const editorItemIndex = el.closest('[data-item-index]')?.getAttribute('data-item-index');
        
        // Check if this is the editor that should have focus
        if (editorCategoryIndex === categoryIndex.toString() && 
            editorItemIndex === itemIndex.toString() &&
            editorId !== activeEditorId) {
          // Focus this editor
          (el as HTMLElement).focus();
          console.log(`Focusing editor for category ${categoryIndex}, item ${itemIndex}`);
        }
      });
    }
  }, [lastSelectionPath, activeEditorId]);

  // Wrap the handleItemChange function to also track selection
  const handleItemChange = (categoryIndex: number, itemIndex: number, value: string) => {
    // Update the last selection path when an item is edited
    setLastSelectionPath([categoryIndex, itemIndex]);
    
    // Call the original function
    const updatedCategories = [...categories];
    updatedCategories[categoryIndex].items[itemIndex] = value;
    setCategories(updatedCategories);
    console.log(`Changing item in category ${categoryIndex}, index ${itemIndex} to: ${value}`);
  };

  // Update handleAddItem to use our reference approach
  const handleAddItem = (categoryIndex: number) => {
    console.log('Adding new item to category:', categoryIndex);
    const category = categories[categoryIndex];
    if (category.items.length >= MAX_ITEMS_PER_CATEGORY) {
      toast({
        title: 'Maximum items reached',
        description: `You can only add up to ${MAX_ITEMS_PER_CATEGORY} items per category.`,
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setCategories(prevCategories => {
      const newCategories = [...prevCategories];
      const category = { ...newCategories[categoryIndex] };
      category.items = [...category.items, ''];
      newCategories[categoryIndex] = category;
      
      // Track the new item's position
      lastItemInfoRef.current = {
        categoryIndex,
        itemIndex: category.items.length - 1
      };
      
      return newCategories;
    });

    // Use setTimeout to ensure DOM is updated before attempting to focus
    setTimeout(() => {
      console.log('Attempting to focus new item at:', lastItemInfoRef.current);
      
      // First try to find the editor by using our refs map
      const itemKey = `item-${lastItemInfoRef.current.categoryIndex}-${lastItemInfoRef.current.itemIndex}`;
      const editorRef = editorRefsMap.current.get(itemKey);
      
      if (editorRef && editorRef.current) {
        console.log('Found editor ref, using imperative focus method');
        // Use the imperative focus method we added to SlateEditor
        // This will both focus the editor AND set cursor to the beginning
        editorRef.current.focus();
        return;
      }
      
      // Fallback to DOM approach if no ref is found
      const categoryContainer = document.querySelectorAll('.category-box')[lastItemInfoRef.current.categoryIndex];
      if (categoryContainer) {
        const editors = categoryContainer.querySelectorAll('.slate-editor');
        // The editor index would be (items count + 1) since there's one editor for the category name
        const lastEditorIndex = lastItemInfoRef.current.itemIndex + 1;
        const lastEditor = editors[lastEditorIndex];
        
        if (lastEditor) {
          console.log('Found last editor via DOM, focusing');
          
          // Get the Slate editor instance if possible
          const slateEditorInstance = (lastEditor as any).__reactFiber$?.return?.stateNode;
          if (slateEditorInstance && typeof slateEditorInstance.focus === 'function') {
            slateEditorInstance.focus();
            return;
          }
          
          // Fallback to standard DOM focus which doesn't position cursor
          (lastEditor as HTMLElement).click();
          (lastEditor as HTMLElement).focus();
          
          // Try to manually set cursor to beginning using Selection API
          try {
            const textNode = lastEditor.querySelector('[data-slate-string="true"]');
            if (textNode) {
              const range = document.createRange();
              const selection = window.getSelection();
              range.setStart(textNode, 0);
              range.collapse(true);
              selection?.removeAllRanges();
              selection?.addRange(range);
              console.log('Manually set cursor to beginning of text');
            }
          } catch (err) {
            console.error('Error setting cursor position:', err);
          }
        } else {
          console.log('Last editor not found, trying last editor in container');
          const lastAvailableEditor = editors[editors.length - 1];
          if (lastAvailableEditor) {
            (lastAvailableEditor as HTMLElement).click();
            (lastAvailableEditor as HTMLElement).focus();
          }
        }
      } else {
        console.log('Category container not found');
      }
    }, 200); // Increase timeout to ensure components are fully rendered
  };

  // Update handleDeleteItem to maintain stable references after deletion
  const handleDeleteItem = (categoryIndex: number, itemIndex: number) => {
    setCategories(prevCategories => {
      // Validate indices
      if (categoryIndex < 0 || categoryIndex >= prevCategories.length) {
        return prevCategories;
      }

      const category = prevCategories[categoryIndex];
      if (!category || itemIndex < 0 || itemIndex >= category.items.length) {
        return prevCategories;
      }

      // Create new arrays to avoid mutation
      const newCategories = [...prevCategories];
      const newItems = [...category.items];
      
      // Remove the item
      newItems.splice(itemIndex, 1);
      
      // Update IDs for all items after the removed one
      for (let i = itemIndex; i < newItems.length; i++) {
        // Get the old key
        const oldKey = `${categoryIndex}-${i + 1}`;
        // Get the new key
        const newKey = `${categoryIndex}-${i}`;
        
        // Move the ID from the old key to the new key
        if (itemIdsRef.current[oldKey]) {
          itemIdsRef.current[newKey] = itemIdsRef.current[oldKey];
          delete itemIdsRef.current[oldKey];
        }
      }
      
      // Create new category object with updated items
      const updatedCategory = {
        ...category,
        items: newItems
      };
      
      // Update the specific category in the array
      newCategories[categoryIndex] = updatedCategory;
      
      return newCategories;
    });
  };

  const handleMoveItemUp = (categoryIndex: number, itemIndex: number) => {
    console.log(`Moving item up: category ${categoryIndex}, item ${itemIndex}`);
    
    if (itemIndex <= 0) {
      console.log('Already at the top, cannot move up');
      return; // Already at the top
    }
    
    setCategories(prevCategories => {
      // Create deep copies to ensure React detects the changes
      const newCategories = [...prevCategories];
      const category = { ...newCategories[categoryIndex] };
      const items = [...category.items];
      
      // Log before swap
      console.log('Before swap:', items[itemIndex - 1], items[itemIndex]);
      
      // Swap items
      const temp = items[itemIndex - 1];
      items[itemIndex - 1] = items[itemIndex];
      items[itemIndex] = temp;
      
      // Log after swap
      console.log('After swap:', items[itemIndex - 1], items[itemIndex]);
      
      // Also swap the stable IDs to maintain references
      const key1 = `${categoryIndex}-${itemIndex}`;
      const key2 = `${categoryIndex}-${itemIndex - 1}`;
      
      if (itemIdsRef.current[key1] && itemIdsRef.current[key2]) {
        const tempId = itemIdsRef.current[key1];
        itemIdsRef.current[key1] = itemIdsRef.current[key2];
        itemIdsRef.current[key2] = tempId;
      }
      
      // Create a new category object to ensure React detects the change
      const updatedCategory = {
        ...category,
        items: items
      };
      
      // Update the categories array with the new category
      newCategories[categoryIndex] = updatedCategory;
      
      console.log('Updated categories after moving up:', newCategories);
      return newCategories;
    });
  };

  const handleMoveItemDown = (categoryIndex: number, itemIndex: number) => {
    console.log(`Moving item down: category ${categoryIndex}, item ${itemIndex}`);
    
    setCategories(prevCategories => {
      if (itemIndex >= prevCategories[categoryIndex].items.length - 1) {
        console.log('Already at the bottom, cannot move down');
        return prevCategories; // Already at the bottom
      }
      
      // Create deep copies to ensure React detects the changes
      const newCategories = [...prevCategories];
      const category = { ...newCategories[categoryIndex] };
      const items = [...category.items];
      
      // Log before swap
      console.log('Before swap:', items[itemIndex], items[itemIndex + 1]);
      
      // Swap items
      const temp = items[itemIndex];
      items[itemIndex] = items[itemIndex + 1];
      items[itemIndex + 1] = temp;
      
      // Log after swap
      console.log('After swap:', items[itemIndex], items[itemIndex + 1]);
      
      // Also swap the stable IDs to maintain references
      const key1 = `${categoryIndex}-${itemIndex}`;
      const key2 = `${categoryIndex}-${itemIndex + 1}`;
      
      if (itemIdsRef.current[key1] && itemIdsRef.current[key2]) {
        const tempId = itemIdsRef.current[key1];
        itemIdsRef.current[key1] = itemIdsRef.current[key2];
        itemIdsRef.current[key2] = tempId;
      }
      
      // Create a new category object to ensure React detects the change
      const updatedCategory = {
        ...category,
        items: items
      };
      
      // Update the categories array with the new category
      newCategories[categoryIndex] = updatedCategory;
      
      console.log('Updated categories after moving down:', newCategories);
      return newCategories;
    });
  };

  // Calculate total items to ensure we have enough for the egg quantity
  const totalItems = categories.reduce((sum: number, category: Category) => {
    // Check if items exists and is an array before filtering
    if (!category.items || !Array.isArray(category.items)) {
      return sum;
    }
    // Only count non-empty items
    const validItems = category.items.filter((item: string) => item && item.trim().length > 0);
    return sum + validItems.length;
  }, 0);

  // Helper function to get a stable ID for a category
  const getStableCategoryId = (categoryIndex: number) => {
    if (!categoryIdsRef.current[categoryIndex]) {
      categoryIdsRef.current[categoryIndex] = `category-${nextCategoryIdRef.current++}`;
    }
    
    return categoryIdsRef.current[categoryIndex];
  };

  // Add handlers for moving categories up and down
  const handleMoveCategoryUp = (categoryIndex: number) => {
    console.log(`Moving category up: index ${categoryIndex}`);
    
    if (categoryIndex <= 0) {
      console.log('Already at the top, cannot move up');
      return; // Already at the top
    }
    
    setCategories(prevCategories => {
      // Create deep copies to ensure React detects the changes
      const newCategories = [...prevCategories];
      
      // Log before swap
      console.log('Before swap:', newCategories[categoryIndex - 1].name, newCategories[categoryIndex].name);
      
      // Swap categories
      const temp = newCategories[categoryIndex - 1];
      newCategories[categoryIndex - 1] = newCategories[categoryIndex];
      newCategories[categoryIndex] = temp;
      
      // Log after swap
      console.log('After swap:', newCategories[categoryIndex - 1].name, newCategories[categoryIndex].name);
      
      // Also swap the stable IDs to maintain references
      if (categoryIdsRef.current[categoryIndex] && categoryIdsRef.current[categoryIndex - 1]) {
        const tempId = categoryIdsRef.current[categoryIndex];
        categoryIdsRef.current[categoryIndex] = categoryIdsRef.current[categoryIndex - 1];
        categoryIdsRef.current[categoryIndex - 1] = tempId;
      }
      
      console.log('Updated categories after moving up:', newCategories.map(c => c.name));
      return newCategories;
    });
  };

  const handleMoveCategoryDown = (categoryIndex: number) => {
    console.log(`Moving category down: index ${categoryIndex}`);
    
    setCategories(prevCategories => {
      if (categoryIndex >= prevCategories.length - 1) {
        console.log('Already at the bottom, cannot move down');
        return prevCategories; // Already at the bottom
      }
      
      // Create deep copies to ensure React detects the changes
      const newCategories = [...prevCategories];
      
      // Log before swap
      console.log('Before swap:', newCategories[categoryIndex].name, newCategories[categoryIndex + 1].name);
      
      // Swap categories
      const temp = newCategories[categoryIndex];
      newCategories[categoryIndex] = newCategories[categoryIndex + 1];
      newCategories[categoryIndex + 1] = temp;
      
      // Log after swap
      console.log('After swap:', newCategories[categoryIndex].name, newCategories[categoryIndex + 1].name);
      
      // Also swap the stable IDs to maintain references
      if (categoryIdsRef.current[categoryIndex] && categoryIdsRef.current[categoryIndex + 1]) {
        const tempId = categoryIdsRef.current[categoryIndex];
        categoryIdsRef.current[categoryIndex] = categoryIdsRef.current[categoryIndex + 1];
        categoryIdsRef.current[categoryIndex + 1] = tempId;
      }
      
      console.log('Updated categories after moving down:', newCategories.map(c => c.name));
      return newCategories;
    });
  };

  // Add ref to track the currently focused editor
  const activeEditorRef = useRef<HTMLDivElement | null>(null);

  // Handler to track when a SlateEditor gets focus
  const handleEditorFocus = (editorElement: HTMLDivElement) => {
    console.log("Editor focused:", editorElement);
    activeEditorRef.current = editorElement;
  };

  // Handler to track when a SlateEditor loses focus
  const handleEditorBlur = () => {
    // Use a timeout to avoid immediate clearing in case focus moves to another editor
    setTimeout(() => {
      // Only clear if focus isn't in another editor
      if (!document.activeElement?.closest('.slate-editor')) {
        console.log("Editor blur - clearing active editor");
        activeEditorRef.current = null;
      }
    }, 100);
  };

  // Update handleUndo to use direct method
  const handleUndo = useCallback(() => {
    // Check if we have a focused editor element
    const activeElement = document.activeElement;
    
    if (activeElement?.closest('.slate-editor')) {
      // Find which editor is active based on DOM hierarchy
      let editorFound = false;
      
      // Try all editor refs
      editorRefsMap.current.forEach((ref, key) => {
        if (ref.current && ref.current.contains(activeElement)) {
          console.log(`Found active editor with key ${key}, calling its undo method`);
          ref.current.undo();
          editorFound = true;
        }
      });
      
      // Fall back to dispatching event if we couldn't find the specific editor
      if (!editorFound && activeElement) {
        console.log("No specific editor ref found, dispatching event to active element");
        const event = new KeyboardEvent('keydown', {
          key: 'z',
          code: 'KeyZ',
          ctrlKey: true,
          metaKey: true,
          bubbles: true
        });
        activeElement.dispatchEvent(event);
      }
      
      return;
    }

    // Otherwise perform global undo for category structure
    if (history.past.length === 0) return;

    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, history.past.length - 1);
    
    skipNextHistoryRef.current = true;
    
    setHistory({
      past: newPast,
      present: previous,
      future: [history.present, ...history.future]
    });
    
    setCategories(previous);
    
    // Show toast notification for undo action
    toast({
      title: "Action Undone",
      description: `Undid last change (${history.past.length - 1} more can be undone)`,
      status: "info",
      duration: 2000,
      isClosable: true,
      position: "bottom-right"
    });
    
    console.log('Undo: Restored previous state');
  }, [history, setCategories, toast]);

  // Update handleRedo to use direct method
  const handleRedo = useCallback(() => {
    // Check if we have a focused editor element
    const activeElement = document.activeElement;
    
    if (activeElement?.closest('.slate-editor')) {
      // Find which editor is active based on DOM hierarchy
      let editorFound = false;
      
      // Try all editor refs
      editorRefsMap.current.forEach((ref, key) => {
        if (ref.current && ref.current.contains(activeElement)) {
          console.log(`Found active editor with key ${key}, calling its redo method`);
          ref.current.redo();
          editorFound = true;
        }
      });
      
      // Fall back to dispatching event if we couldn't find the specific editor
      if (!editorFound && activeElement) {
        console.log("No specific editor ref found, dispatching event to active element");
        const event = new KeyboardEvent('keydown', {
          key: 'z',
          code: 'KeyZ',
          ctrlKey: true,
          metaKey: true,
          shiftKey: true,
          bubbles: true
        });
        activeElement.dispatchEvent(event);
      }
      
      return;
    }

    // Otherwise perform global redo for category structure
    if (history.future.length === 0) return;
    
    const next = history.future[0];
    const newFuture = history.future.slice(1);
    
    skipNextHistoryRef.current = true;
    
    setHistory({
      past: [...history.past, history.present],
      present: next,
      future: newFuture
    });
    
    setCategories(next);

    // Show toast notification for redo action
    toast({
      title: "Action Redone",
      description: `Redid last undone change (${history.future.length - 1} more can be redone)`,
      status: "info",
      duration: 2000,
      isClosable: true,
      position: "bottom-right"
    });
    
    console.log('Redo: Restored next state');
  }, [history, setCategories, toast]);

  // Helper function to get a stable ID for an item
  const getStableItemId = (categoryIndex: number, itemIndex: number) => {
    const key = `${categoryIndex}-${itemIndex}`;
    
    if (!itemIdsRef.current[key]) {
      itemIdsRef.current[key] = `item-${nextIdRef.current++}`;
    }
    
    return itemIdsRef.current[key];
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

    // Process categories to filter out empty items
    const processedCategories = categories.map(category => {
      console.log(`Category "${category.name}": item count before filtering:`, category.items.length);
      const filtered = {
        name: (category.name || '').trim(),
        items: Array.isArray(category.items) 
          ? category.items.filter(item => {
              console.log(`Checking item in category "${category.name}":`);
              const isValid = debugItemContent(item);
              if (!isValid) console.log(`  - Found empty item in category "${category.name}"`);
              return isValid;
            })
          : []
      };
      console.log(`Category "${category.name}": item count after filtering:`, filtered.items.length);
      return filtered;
    });

    console.log("Processed categories for saving:", processedCategories);

    // Validate categories
    const validCategories = processedCategories.filter(cat => {
      const isValid = cat.name && cat.items.length > 0;
      if (!isValid) console.log(`Category "${cat.name}" is invalid: has_name=${!!cat.name}, item_count=${cat.items.length}`);
      return isValid;
    });

    console.log("Valid categories after filtering:", validCategories);

    if (validCategories.length === 0) {
      toast({
        title: "Missing Categories",
        description: "Please add at least one category with items.",
        status: "warning",
        duration: 5000,
      });
      return;
    }
    
    // Check if there are at least 2 valid categories
    if (validCategories.length < 2) {
      toast({
        title: "Not Enough Categories",
        description: "You must have at least 2 categories with names and items.",
        status: "warning",
        duration: 5000,
      });
      return;
    }
    
    // Check if there are too many categories
    if (validCategories.length > 10) {
      toast({
        title: "Too Many Categories",
        description: "You cannot have more than 10 categories.",
        status: "warning",
        duration: 5000,
      });
      return;
    }

    // Check if each category has at least 3 items
    const categoriesWithTooFewItems = validCategories.filter(cat => {
      const hasTooFew = cat.items.length < 3;
      if (hasTooFew) {
        console.log(`Category "${cat.name}" has too few items: ${cat.items.length}`);
      }
      return hasTooFew;
    });
    
    if (categoriesWithTooFewItems.length > 0) {
      console.log("Categories with too few items:", categoriesWithTooFewItems);
      toast({
        title: "Not Enough Items",
        description: "Each category must have at least 3 items.",
        status: "warning",
        duration: 5000,
      });
      return;
    }

    // Check if we have enough items for the eggs
    if (totalItems < eggQty) {
      toast({
        title: "Not Enough Items",
        description: `You need at least ${eggQty} items total (current: ${totalItems}) to fill the eggs.`,
        status: "warning",
        duration: 5000,
      });
      return;
    }

    setIsLoading(true);

    try {
      // Prepare the configuration data
      const configData = {
        type: 'sort-categories-egg',
        title: title.trim(),
        eggQty,
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

  // Add keyboard shortcut for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only respond to keyboard shortcuts if not editing in a text field
      const target = e.target as HTMLElement;
      const isTextField = target.tagName === 'INPUT' || 
                         target.tagName === 'TEXTAREA' || 
                         target.classList.contains('slate-editor') ||
                         !!target.closest('.slate-editor');
      
      // If in a text field or editor, don't intercept the shortcut - let the editor handle it
      if (isTextField) return;
      
      // Check for Ctrl+Z (undo) and Ctrl+Y (redo)
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          handleUndo();
        } else if (e.key === 'y') {
          e.preventDefault();
          handleRedo();
        }
      }
    };
    
    // Add event listener
    document.addEventListener('keydown', handleKeyDown);
    
    // Remove event listener on cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUndo, handleRedo]);

  // Inject CSS styles
  useEffect(() => {
    // Create style element
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    // Clean up on unmount
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  // Wrap the component with the context provider
  return (
    <EditorSelectionContext.Provider 
      value={{ 
        activeEditorId, 
        setActiveEditorId,
        lastSelectionPath,
        setLastSelectionPath
      }}
    >
      <VStack spacing={6} align="stretch" className="apple-container">
        <Box className="apple-section">
          <div className="apple-section-header">
            <Heading size="md">Game Settings</Heading>
          </div>
          
          <FormControl mb={4}>
            <FormLabel>Category Template</FormLabel>
            {loadingTemplates ? (
              <HStack>
                <Spinner size="sm" />
                <Text>Loading templates...</Text>
              </HStack>
            ) : (
              <Box>
                <select 
                  className="chakra-select apple-input"
                  value={templateKey}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    borderWidth: '1px',
                    borderColor: 'inherit'
                  }}
                >
                  <option value="">Select a template (optional)</option>
                  {Object.entries(dbTemplates).map(([key, template]) => (
                    <option key={key} value={key}>
                      {template.title}
                    </option>
                  ))}
                </select>
              </Box>
            )}
            <FormHelperText>
              Select a preset template to quickly populate the game with common categories
            </FormHelperText>
          </FormControl>

          <FormControl mb={4}>
            <FormLabel>Configuration Title</FormLabel>
            <Input
              className="apple-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for this game configuration"
            />
          </FormControl>

          <FormControl mb={4}>
            <FormLabel>Number of Eggs</FormLabel>
            <Select
              value={eggQty.toString()}
              onChange={(e) => setEggQty(parseInt(e.target.value, 10))}
              className="apple-select"
              width="120px"
            >
              {[...Array(11)].map((_, i) => (
                <option key={i + 2} value={(i + 2).toString()}>
                  {i + 2} {i + 2 === 1 ? 'Egg' : 'Eggs'}
                </option>
              ))}
            </Select>
            <FormHelperText>
              Number of eggs in the game (must have at least this many items total)
            </FormHelperText>
          </FormControl>
        </Box>

        <Box className="apple-section">
          <Flex justify="space-between" align="center" mb={4} className="apple-section-header">
            <Heading size="md">Categories</Heading>
            <HStack spacing={2}>
              <Tooltip 
                label={
                  editorRefsMap.current.has('name-0') && document.activeElement?.closest('.slate-editor')
                    ? `Undo Text Change (Ctrl+Z)`
                    : `Undo Category Change (Ctrl+Z) - ${history.past.length} actions available`
                } 
                openDelay={500}
              >
                <IconButton
                  aria-label="Undo last change"
                  icon={<FaUndo />}
                  size="sm"
                  onClick={handleUndo}
                  isDisabled={
                    !editorRefsMap.current.has('name-0') && history.past.length === 0
                  }
                  colorScheme={
                    editorRefsMap.current.has('name-0') ? "teal" : 
                    (history.past.length > 0 ? "blue" : "gray")
                  }
                  variant="outline"
                  className="apple-button"
                />
              </Tooltip>
              <Tooltip 
                label={
                  editorRefsMap.current.has('name-0') && document.activeElement?.closest('.slate-editor')
                    ? `Redo Text Change (Ctrl+Y)`
                    : `Redo Category Change (Ctrl+Y) - ${history.future.length} actions available`
                } 
                openDelay={500}
              >
                <IconButton
                  aria-label="Redo last change"
                  icon={<FaRedo />}
                  size="sm"
                  onClick={handleRedo}
                  isDisabled={
                    !editorRefsMap.current.has('name-0') && history.future.length === 0
                  }
                  colorScheme={
                    editorRefsMap.current.has('name-0') ? "teal" : 
                    (history.future.length > 0 ? "blue" : "gray")
                  }
                  variant="outline"
                  className="apple-button"
                />
              </Tooltip>
            </HStack>
          </Flex>
          
          <Text mb={4}>
            Add categories and items. Players will need to sort the eggs into the correct categories. (Minimum 2, Maximum 10 Categories)
          </Text>

          {categories.map((category, categoryIndex) => (
            <Box 
              key={getStableCategoryId(categoryIndex)} 
              p={4} 
              borderWidth="1px" 
              borderRadius="md" 
              mb={4}
              className="category-box"
            >
              <Flex 
                justify="space-between" 
                align="center" 
                mb={3}
                className="category-header"
              >
                <Heading size="sm">Category {categoryIndex + 1}</Heading>
                <HStack spacing={1} className="order-buttons">
                  <IconButton
                    aria-label="Move category up"
                    icon={<ChevronUpIcon boxSize={4} />}
                    size="sm"
                    variant="ghost"
                    isDisabled={categoryIndex === 0}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleMoveCategoryUp(categoryIndex);
                    }}
                    sx={appleStyleIconButton}
                    className="apple-button"
                    data-testid={`icon-button-move-category-up-${categoryIndex}`}
                  />
                  <IconButton
                    aria-label="Move category down"
                    icon={<ChevronDownIcon boxSize={4} />}
                    size="sm"
                    variant="ghost"
                    isDisabled={categoryIndex === categories.length - 1}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleMoveCategoryDown(categoryIndex);
                    }}
                    sx={appleStyleIconButton}
                    className="apple-button"
                    data-testid={`icon-button-move-category-down-${categoryIndex}`}
                  />
                </HStack>
              </Flex>

              <FormControl mb={4}>
                <FormLabel>Category Name</FormLabel>
                <div 
                  onFocus={(e) => handleEditorFocus(e.currentTarget)}
                  onBlur={handleEditorBlur}
                >
                  <SlateEditor
                    ref={(node) => {
                      const nameKey = `name-${categoryIndex}`;
                      const editorRef = editorRefsMap.current.get(nameKey);
                      if (editorRef && node) {
                        // Use a safer approach to associate the node with the ref
                        // by creating a new ref and copying only what we need
                        const newRef = React.createRef<SlateEditorRef>();
                        (newRef as any).current = node;
                        editorRefsMap.current.set(nameKey, newRef);
                      }
                    }}
                    value={category.name}
                    onChange={(value) => handleCategoryNameChange(categoryIndex, value)}
                    placeholder="Enter a category name"
                  />
                </div>
              </FormControl>
              
              <FormControl mb={4}>
                <FormLabel>Items</FormLabel>
                <FormHelperText mb={2}>
                  Enter items to be displayed on eggs that players will sort. (Minimum 3, Maximum 50 Items)
                </FormHelperText>
                
                {category.items.map((item, itemIndex) => (
                  <Flex 
                    key={getStableItemId(categoryIndex, itemIndex)} 
                    direction="column" 
                    mb={2}
                  >
                    <Flex align="center">
                      <Text mr={2} fontWeight="bold" width="25px" color="gray.500">
                        {itemIndex + 1}.
                      </Text>
                      <Box mr={2} flex="1">
                        <div 
                          onFocus={(e) => handleEditorFocus(e.currentTarget)}
                          onBlur={handleEditorBlur}
                        >
                          <SlateEditor
                            ref={(node) => {
                              const itemKey = `item-${categoryIndex}-${itemIndex}`;
                              const editorRef = editorRefsMap.current.get(itemKey);
                              if (editorRef && node) {
                                // Use a safer approach to associate the node with the ref
                                const newRef = React.createRef<SlateEditorRef>();
                                (newRef as any).current = node;
                                editorRefsMap.current.set(itemKey, newRef);
                              }
                            }}
                            value={item}
                            onChange={(value) => handleItemChange(categoryIndex, itemIndex, value)}
                            placeholder="Enter an item"
                            compact
                            onFocus={() => {
                              setLastSelectionPath([categoryIndex, itemIndex]);
                              // The SlateEditor will set its ID as active
                            }}
                          />
                        </div>
                      </Box>
                      <HStack spacing={1}>
                        <IconButton
                          aria-label="Move item up"
                          icon={<ChevronUpIcon boxSize={3} />}
                          size="sm"
                          variant="ghost"
                          isDisabled={itemIndex === 0}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleMoveItemUp(categoryIndex, itemIndex);
                          }}
                          sx={appleStyleIconButton}
                          className="apple-button"
                          data-testid={`icon-button-move-item-up-${itemIndex}`}
                        />
                        <IconButton
                          aria-label="Move item down"
                          icon={<ChevronDownIcon boxSize={3} />}
                          size="sm"
                          variant="ghost"
                          isDisabled={itemIndex === category.items.length - 1}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleMoveItemDown(categoryIndex, itemIndex);
                          }}
                          sx={appleStyleIconButton}
                          className="apple-button"
                          data-testid={`icon-button-move-item-down-${itemIndex}`}
                        />
                        <Tooltip label={`Delete item #${itemIndex + 1}`} placement="top">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteItem(categoryIndex, itemIndex);
                            }}
                            aria-label={`Delete item #${itemIndex + 1}`}
                            title={`Delete item #${itemIndex + 1}`}
                            className="apple-button"
                            data-testid={`icon-button-delete-item-${itemIndex}`}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </HStack>
                    </Flex>
                  </Flex>
                ))}
                
                <Flex justify="space-between" align="center" mt={2}>
                  <Button 
                    leftIcon={<AddIcon />} 
                    size="sm" 
                    onClick={() => handleAddItem(categoryIndex)}
                    className="apple-button apple-button-primary"
                  >
                    Add Item
                  </Button>
                  
                  {categories.length > 1 && (
                    <Button 
                      size="sm" 
                      colorScheme="red"
                      variant="outline"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRemoveCategory(categoryIndex);
                      }}
                      className="apple-button"
                    >
                      Remove Category
                    </Button>
                  )}
                </Flex>
              </FormControl>
            </Box>
          ))}
          
          <Flex alignItems="center" gap={3} mb={4}>
            <Button 
              colorScheme="blue" 
              leftIcon={<AddIcon />}
              onClick={handleAddCategory} 
              isDisabled={categories.length >= MAX_CATEGORIES}
              className="apple-button apple-button-primary"
            >
              Add Category
            </Button>
            
            <Text fontSize="sm" color={categories.length >= MAX_CATEGORIES ? "red.500" : "gray.600"}>
              {categories.length >= MAX_CATEGORIES 
                ? `Maximum of ${MAX_CATEGORIES} categories reached` 
                : `${categories.length} of ${MAX_CATEGORIES} categories`}
            </Text>
          </Flex>

          <FormControl>
            <Text mt={2} fontSize="sm" fontStyle={totalItems < eggQty ? "italic" : "normal"} color={totalItems < eggQty ? "red.500" : "gray.600"}>
              Total items: {totalItems} (need at least {eggQty} for the eggs)
            </Text>
          </FormControl>
        </Box>

        <Box className="apple-section">
          <div className="apple-section-header">
            <Heading size="md">Templates</Heading>
          </div>
          {isAdmin ? (
            <FormControl mb={4}>
              <FormLabel>Save Template</FormLabel>
              <Button 
                colorScheme="teal" 
                size="md" 
                onClick={handleSaveAsTemplate}
                isDisabled={!currentUser || categories.length === 0}
                mb={2}
                width="100%"
                className="apple-button apple-button-secondary"
              >
                Save as Template
              </Button>
              <FormControl>
                <FormHelperText>
                  Save your current categories as a reusable template for future games
                </FormHelperText>
              </FormControl>
            </FormControl>
          ) : (
            <Text fontSize="sm" color="gray.500">
              Only administrators can save templates
            </Text>
          )}
        </Box>

        <Box className="apple-section">
          <div className="apple-section-header">
            <Heading size="md">Sharing</Heading>
          </div>
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
          isDisabled={totalItems < eggQty}
          className="apple-button apple-button-primary"
        >
          {isEditing ? "Update Configuration" : "Save Configuration"}
        </Button>
      </VStack>
    </EditorSelectionContext.Provider>
  );
};

export default SortCategoriesEggConfig; 