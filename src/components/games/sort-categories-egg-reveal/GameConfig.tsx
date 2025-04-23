import { useState, useEffect } from 'react';
import {
  Button,
  VStack,
  Input,
  Textarea,
  FormControl,
  FormLabel,
  Switch,
  Select,
  useToast,
  Box,
  Heading,
  Text,
  Divider,
} from '@chakra-ui/react';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../../../config/firebase';
import { serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import { MAX_ITEMS_PER_CATEGORY, MIN_ITEMS_PER_CATEGORY, MAX_CATEGORIES, MIN_CATEGORIES } from '../../../constants/game';

interface GameConfigProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSelect: (config: any) => void;
}

interface Category {
  name: string;
  items: string;  // Keep as string since we're using textarea input
}

interface SavedCategory {
  name: string;
  items: string[];  // Must be array when saving to Firestore
}

interface GameConfig {
  id?: string;
  type: string;
  title: string;
  eggQty: number;
  categories: Category[];
  share: boolean;
  email?: string;
  createdAt?: Date;
}

const GameConfig: React.FC<GameConfigProps> = ({ isOpen, onClose, onConfigSelect }) => {
  const [title, setTitle] = useState('');
  const [eggQty, setEggQty] = useState(6);
  const [categories, setCategories] = useState<Category[]>([
    { name: '', items: '' }
  ]);
  const [shareConfig, setShareConfig] = useState(false);
  const [savedConfigs, setSavedConfigs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadSavedConfigs();
  }, []);

  const loadSavedConfigs = async () => {
    try {
      setIsLoading(true);
      // Load both admin configs and user configs
      const [adminConfigsSnapshot, userConfigsSnapshot] = await Promise.all([
        getDocs(query(
          collection(db, 'gameConfigs'),
          where('type', '==', 'sort-categories-egg'),
          where('share', '==', true)
        )),
        getDocs(query(
          collection(db, 'userGameConfigs'),
          where('type', '==', 'sort-categories-egg'),
          where('share', '==', true)
        ))
      ]);

      const configs: any[] = [];
      
      // Add admin configs
      adminConfigsSnapshot.forEach((doc) => {
        const data = doc.data();
        // Ensure items are arrays
        const categories = data.categories.map((cat: any) => ({
          ...cat,
          items: Array.isArray(cat.items) ? cat.items : cat.items.split(',').map((item: string) => item.trim())
        }));
        configs.push({ id: doc.id, ...data, categories, isAdminConfig: true });
      });
      
      // Add user configs
      userConfigsSnapshot.forEach((doc) => {
        const data = doc.data();
        // Ensure items are arrays
        const categories = data.categories.map((cat: any) => ({
          ...cat,
          items: Array.isArray(cat.items) ? cat.items : cat.items.split(',').map((item: string) => item.trim())
        }));
        configs.push({ id: doc.id, ...data, categories, isAdminConfig: false });
      });

      setSavedConfigs(configs);
    } catch (error) {
      console.error('Error loading configurations:', error);
      
      // Provide fallback data
      const fallbackConfigs = [
        {
          id: 'fallback1',
          type: 'sort-categories-egg',
          title: 'Animals',
          eggQty: 12,
          categories: [
            { name: 'Mammals', items: ['dog', 'cat', 'elephant', 'giraffe'] },
            { name: 'Birds', items: ['eagle', 'parrot', 'penguin', 'owl'] },
            { name: 'Reptiles', items: ['snake', 'lizard', 'turtle', 'crocodile'] }
          ],
          share: true,
          createdAt: new Date(),
          isAdminConfig: true
        }
      ];
      setSavedConfigs(fallbackConfigs);
      
      toast({
        title: 'Using Sample Configurations',
        description: 'Could not load configurations from server. Using sample configurations instead.',
        status: 'info',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCategory = () => {
    setCategories([...categories, { name: '', items: '' }]);
  };

  const handleCategoryChange = (index: number, field: keyof Category, value: string) => {
    const newCategories = [...categories];
    newCategories[index][field] = value;
    setCategories(newCategories);
  };

  const handleSaveConfig = async () => {
    // Add detailed auth logging
    console.log('Auth state:', {
      currentUser: auth.currentUser,
      isAuthenticated: !!auth.currentUser,
      uid: auth.currentUser?.uid,
      email: auth.currentUser?.email
    });

    if (!auth.currentUser) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to save configurations.',
        status: 'error',
        duration: 5000,
      });
      return;
    }

    // Validate input
    if (!title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a configuration title.',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (categories.some(cat => !cat.name.trim() || !cat.items.trim())) {
      toast({
        title: 'Error',
        description: 'Please fill in all category names and items.',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      // Transform categories to ensure items is always an array
      const transformedCategories: SavedCategory[] = categories.map(cat => ({
        name: cat.name.trim(),
        items: cat.items.split(',')
          .map(item => item.trim())
          .filter(item => item.length > 0)
      }));

      // Check if each category has at least MIN_ITEMS_PER_CATEGORY items
      const categoriesWithTooFewItems = transformedCategories.filter(cat => cat.items.length < MIN_ITEMS_PER_CATEGORY);
      if (categoriesWithTooFewItems.length > 0) {
        toast({
          title: "Not Enough Items",
          description: `Each category must have at least ${MIN_ITEMS_PER_CATEGORY} items.`,
          status: "warning",
          duration: 5000,
        });
        return;
      }
      
      // Check if any category has more than MAX_ITEMS_PER_CATEGORY items
      const categoriesWithTooManyItems = transformedCategories.filter(cat => cat.items.length > MAX_ITEMS_PER_CATEGORY);
      if (categoriesWithTooManyItems.length > 0) {
        toast({
          title: "Too Many Items",
          description: `A category cannot have more than ${MAX_ITEMS_PER_CATEGORY} items.`,
          status: "warning",
          duration: 5000,
        });
        return;
      }

      const configData = {
        type: 'sort-categories-egg',
        title: title.trim(),
        eggQty: Number(eggQty),
        categories: transformedCategories,
        share: shareConfig,
        userId: auth.currentUser.uid,
        email: auth.currentUser.email || undefined,
        createdAt: serverTimestamp()
      };

      // Validate that we have enough items
      const totalItems = transformedCategories.reduce((sum, cat) => sum + cat.items.length, 0);
      if (totalItems < configData.eggQty) {
        toast({
          title: 'Error',
          description: `Not enough items. You need at least ${configData.eggQty} items total, but only have ${totalItems}.`,
          status: 'error',
          duration: 5000,
        });
        return;
      }

      // Save to userGameConfigs collection
      const docRef = await addDoc(collection(db, 'userGameConfigs'), configData);
      console.log('Successfully saved config with ID:', docRef.id);

      toast({
        title: 'Success',
        description: 'Configuration saved successfully',
        status: 'success',
        duration: 3000,
      });

      // Reload configurations
      await loadSavedConfigs();
    } catch (error) {
      console.error('Error saving configuration:', error);
      // Add more detailed error logging
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          code: (error as any).code,
          name: error.name,
          stack: error.stack
        });
      }
      toast({
        title: 'Error',
        description: 'Could not save configuration. Please try again.',
        status: 'error',
        duration: 5000,
      });
    }
  };

  return (
    <VStack spacing={4} pb={6}>
      <Box w="100%">
        <Heading size="md" mb={2}>Load Saved Configuration</Heading>
        <Select
          placeholder="Select a saved configuration"
          onChange={(e) => {
            const config = savedConfigs.find(c => c.id === e.target.value);
            if (config) onConfigSelect(config);
          }}
          isDisabled={isLoading || savedConfigs.length === 0}
        >
          {savedConfigs.map(config => (
            <option key={config.id} value={config.id}>
              {config.title} {config.isAdminConfig ? '(Official)' : `(by ${config.email || 'Unknown'})`}
            </option>
          ))}
        </Select>
        {savedConfigs.length === 0 && !isLoading && (
          <Text fontSize="sm" color="gray.500" mt={1}>
            No saved configurations found. Create one below.
          </Text>
        )}
      </Box>

      <Divider />

      <Box w="100%">
        <Heading size="md" mb={4}>Create New Configuration</Heading>
        
        <FormControl mb={4}>
          <FormLabel>Configuration Title</FormLabel>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter configuration title"
          />
        </FormControl>

        <FormControl mb={4}>
          <FormLabel>Number of Eggs</FormLabel>
          <Input
            type="number"
            value={eggQty}
            onChange={(e) => setEggQty(Number(e.target.value))}
            min={1}
          />
        </FormControl>

        <Heading size="sm" mb={2}>Categories</Heading>
        {categories.map((category, index) => (
          <VStack key={index} w="100%" spacing={2} mb={4}>
            <FormControl>
              <FormLabel>Category {index + 1} Name</FormLabel>
              <Input
                value={category.name}
                onChange={(e) => handleCategoryChange(index, 'name', e.target.value)}
                placeholder="Category name"
              />
            </FormControl>
            <FormControl>
              <FormLabel>Items (comma-separated)</FormLabel>
              <Textarea
                value={category.items}
                onChange={(e) => handleCategoryChange(index, 'items', e.target.value)}
                placeholder="Item1, Item2, Item3"
              />
            </FormControl>
          </VStack>
        ))}

        <Button onClick={handleAddCategory} colorScheme="blue" mb={4}>
          Add Category
        </Button>

        <FormControl display="flex" alignItems="center" mb={4}>
          <FormLabel mb="0">Share Configuration</FormLabel>
          <Switch
            isChecked={shareConfig}
            onChange={(e) => setShareConfig(e.target.checked)}
          />
        </FormControl>

        <Button onClick={handleSaveConfig} colorScheme="green" w="100%">
          Save Configuration
        </Button>
      </Box>
    </VStack>
  );
};

export default GameConfig; 