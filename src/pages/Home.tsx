import { FaGamepad, FaChalkboardTeacher, FaTrophy } from 'react-icons/fa';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { 
  useToast, 
  Modal, 
  ModalOverlay, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalCloseButton,
  Button,
  VStack,
  FormControl,
  FormLabel,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Textarea,
  Switch,
  HStack,
} from '@chakra-ui/react';

const SearchBar = ({ onSearch }: { onSearch: (query: string) => void }) => (
  <div style={{
    marginBottom: 'var(--spacing-4)',
    position: 'relative'
  }}>
    <input
      type="text"
      placeholder="Search..."
      onChange={(e) => onSearch(e.target.value)}
      style={{
        width: '100%',
        padding: 'var(--spacing-2) var(--spacing-3)',
        borderRadius: 'var(--border-radius-md)',
        border: '1px solid var(--color-gray-200)',
        fontSize: 'var(--font-size-md)',
        outline: 'none',
      }}
    />
  </div>
);

interface GameItemProps {
  title: string;
  type: string;
  thumbnail?: string;
  id?: string;
  isPlayable?: boolean;
  config?: any;
  onClick?: () => void;
}

const GameItem = ({ title, type, thumbnail, id, isPlayable, config, onClick }: GameItemProps) => {
  const content = (
    <>
      <div style={{
        width: '60px',
        height: '60px',
        backgroundColor: 'var(--color-primary-100)',
        borderRadius: 'var(--border-radius-md)',
        marginRight: 'var(--spacing-3)',
        overflow: 'hidden',
        flexShrink: 0
      }}>
        {thumbnail ? (
          <img 
            src={thumbnail} 
            alt={title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--color-primary-100)',
            color: 'var(--color-primary-500)',
            fontSize: 'var(--font-size-xl)'
          }}>
            {title.charAt(0)}
          </div>
        )}
      </div>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-1)'
      }}>
        <h3 style={{
          fontSize: 'var(--font-size-md)',
          color: 'var(--color-gray-800)',
          margin: 0
        }}>
          {title}
        </h3>
        <span style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-gray-600)',
        }}>
          Type: {type}
        </span>
      </div>
    </>
  );

  const containerStyles = {
    display: 'flex',
    alignItems: 'center',
    padding: 'var(--spacing-3)',
    backgroundColor: 'white',
    borderRadius: 'var(--border-radius-md)',
    margin: 'var(--spacing-2) 0',
    border: '1px solid var(--color-gray-200)',
    cursor: isPlayable || onClick ? 'pointer' : 'default',
    transition: 'all 0.2s ease-in-out',
    textDecoration: 'none',
    color: 'inherit'
  };

  if (onClick) {
    return (
      <div style={containerStyles} onClick={onClick}>
        {content}
      </div>
    );
  }

  return isPlayable && id ? (
    <RouterLink to={`/game/${id}`} style={containerStyles}>
      {content}
    </RouterLink>
  ) : (
    <div style={containerStyles}>
      {content}
    </div>
  );
};

const ConfigurationModal = ({ 
  isOpen, 
  onClose, 
  template,
  onSave 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  template: any;
  onSave: (config: any, isUpdate: boolean) => void;
}) => {
  const [title, setTitle] = useState(template?.title || '');
  const [eggQty, setEggQty] = useState(template?.eggQty || 6);
  const [categories, setCategories] = useState<{ name: string; items: string }[]>(
    template?.categories 
      ? template.categories.map((cat: any) => ({ 
          name: cat.name, 
          items: Array.isArray(cat.items) ? cat.items.join(', ') : cat.items 
        }))
      : [{ name: '', items: '' }]
  );
  const [shareConfig, setShareConfig] = useState(template?.share || false);
  const { currentUser } = useAuth();
  const isOwnTemplate = template?.userId === currentUser?.uid;

  // Reset form when template changes
  useEffect(() => {
    if (template) {
      setTitle(template.title || '');
      setEggQty(template.eggQty || 6);
      setCategories(
        template.categories 
          ? template.categories.map((cat: any) => ({ 
              name: cat.name, 
              items: Array.isArray(cat.items) ? cat.items.join(', ') : cat.items 
            }))
          : [{ name: '', items: '' }]
      );
      setShareConfig(template.share || false);
    }
  }, [template]);

  const handleAddCategory = () => {
    setCategories([...categories, { name: '', items: '' }]);
  };

  const handleCategoryChange = (index: number, field: 'name' | 'items', value: string) => {
    const newCategories = [...categories];
    newCategories[index][field] = value;
    setCategories(newCategories);
  };

  const handleSave = (isUpdate: boolean = false) => {
    // Transform categories to ensure items is always an array
    const transformedCategories = categories.map(cat => ({
      name: (cat.name || '').trim(),
      items: (cat.items || '').split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0)
    }));

    // Add the timestamp
    const configData = {
      title: title.trim(),
      type: 'sort-categories-egg',
      eggQty: eggQty,
      categories: transformedCategories,
      share: shareConfig,
      email: currentUser.email,
      userId: currentUser.uid,
      createdAt: serverTimestamp() // Use Firestore's server timestamp
    };

    onSave(configData, isUpdate);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Configure Game Template</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>Configuration Title</FormLabel>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter configuration title"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Number of Eggs</FormLabel>
              <NumberInput
                value={eggQty}
                onChange={(_, value) => setEggQty(value)}
                min={1}
                max={20}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>

            {categories.map((category, index) => (
              <VStack key={index} w="100%" spacing={2}>
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

            <Button onClick={handleAddCategory} colorScheme="blue" width="100%">
              Add Category
            </Button>

            <FormControl display="flex" alignItems="center">
              <FormLabel mb="0">Share Configuration</FormLabel>
              <Switch
                isChecked={shareConfig}
                onChange={(e) => setShareConfig(e.target.checked)}
              />
            </FormControl>

            {isOwnTemplate ? (
              <HStack spacing={4} width="100%">
                <Button onClick={() => handleSave(true)} colorScheme="blue" flex={1}>
                  Update Configuration
                </Button>
                <Button onClick={() => handleSave(false)} colorScheme="green" flex={1}>
                  Save as New
                </Button>
              </HStack>
            ) : (
              <Button onClick={() => handleSave(false)} colorScheme="green" width="100%">
                Save as New Configuration
              </Button>
            )}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

const Home = () => {
  // State for games and search
  const [publicGames, setPublicGames] = useState<Array<{
    id: string;
    title: string;
    type: string;
    thumbnail?: string;
  }>>([]);
  const [freeGamesSearch, setFreeGamesSearch] = useState('');
  const [modifiableSearch, setModifiableSearch] = useState('');
  const [blankSearch, setBlankSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const toast = useToast();
  const [modifiableTemplates, setModifiableTemplates] = useState<Array<{
    id: string;
    title: string;
    type: string;
    thumbnail?: string;
    userId: string;
    categories: Array<{ name: string; items: string[] }>;
    eggQty: number;
    share: boolean;
  }>>([]);
  const [blankTemplates, setBlankTemplates] = useState<Array<{
    id: string;
    title: string;
    type: string;
    thumbnail?: string;
    categories: Array<{ name: string; items: string[] }>;
    eggQty: number;
    share: boolean;
  }>>([]);

  // Fetch public games, modifiable templates, and blank templates
  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true);
        
        // Query for shared games, modifiable templates, and blank templates
        const [publicSnapshot, templatesSnapshot, blankTemplatesSnapshot] = await Promise.all([
          getDocs(query(
            collection(db, 'userGameConfigs'),
            where('share', '==', true)
          )),
          getDocs(collection(db, 'userGameConfigs')),
          getDocs(collection(db, 'blankGameTemplates'))
        ]);

        // Process public games
        const games = publicSnapshot.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title || 'Untitled Game',
          type: 'sort-categories-egg',
          thumbnail: doc.data().thumbnail || undefined
        }));
        setPublicGames(games);

        // Process modifiable templates
        const templates = templatesSnapshot.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title || 'Untitled Template',
          type: 'sort-categories-egg',
          thumbnail: doc.data().thumbnail,
          userId: doc.data().userId,
          categories: doc.data().categories || [],
          eggQty: doc.data().eggQty || 6,
          share: doc.data().share || false
        }));
        setModifiableTemplates(templates);

        // Process blank templates
        const blankTemplatesData = blankTemplatesSnapshot.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title || 'Untitled Template',
          type: doc.data().type || 'sort-categories-egg',
          thumbnail: doc.data().thumbnail,
          categories: doc.data().categories || [],
          eggQty: doc.data().eggQty || 6,
          share: doc.data().share || false
        }));
        setBlankTemplates(blankTemplatesData);

      } catch (error: any) {
        console.error('Error fetching games:', error);
        toast({
          title: 'Error',
          description: 'Could not load games and templates.',
          status: 'error',
          duration: 5000,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [toast]);

  // Filter public games based on search
  const filteredPublicGames = publicGames.filter(game =>
    game.title.toLowerCase().includes(freeGamesSearch.toLowerCase())
  );

  const modifiableTemplatesData = [
    { 
      id: 1, 
      title: 'Customizable Quiz', 
      type: 'Quiz Template',
      thumbnail: '/game-thumbnails/quiz.png'
    },
    { 
      id: 2, 
      title: 'Flashcards Template', 
      type: 'Flashcard Template',
      thumbnail: '/game-thumbnails/flashcards.png'
    },
  ];

  const blankTemplatesData = [
    { 
      id: 1, 
      title: 'Blank Quiz Builder', 
      type: 'Quiz Builder',
      thumbnail: '/game-thumbnails/blank-quiz.png'
    },
    { 
      id: 2, 
      title: 'Empty Game Canvas', 
      type: 'Game Canvas',
      thumbnail: '/game-thumbnails/blank-canvas.png'
    },
  ];

  // Filter modifiable templates based on search
  const filteredModifiable = modifiableTemplates.filter(template =>
    template.title.toLowerCase().includes(modifiableSearch.toLowerCase())
  );

  // Filter blank templates based on search
  const filteredBlank = blankTemplates.filter(template =>
    template.title.toLowerCase().includes(blankSearch.toLowerCase())
  );

  const handleTemplateClick = (template: any, isBlankTemplate: boolean = false) => {
    if (!currentUser) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to access templates.',
        status: 'error',
        duration: 5000,
      });
      return;
    }

    // If it's a blank template, we'll create a new configuration based on the template
    if (isBlankTemplate) {
      const newTemplate = {
        ...template,
        id: undefined, // Remove the template ID so a new one will be generated
        userId: currentUser.uid,
        email: currentUser.email,
        createdAt: new Date().toISOString()
      };
      setSelectedTemplate(newTemplate);
    } else {
      setSelectedTemplate(template);
    }
    setIsConfigModalOpen(true);
  };

  const handleSaveConfig = async (config: any, isUpdate: boolean) => {
    try {
      if (!currentUser) {
        throw new Error('You must be signed in to save configurations');
      }

      // Ensure categories are properly formatted
      const formattedCategories = config.categories.map((cat: any) => ({
        name: cat.name.trim(),
        items: Array.isArray(cat.items) ? cat.items : cat.items.split(',').map((item: string) => item.trim()).filter(Boolean)
      }));

      // Validate categories
      if (formattedCategories.some((cat: { name: string; items: string[] }) => !cat.name || !cat.items.length)) {
        throw new Error('All categories must have a name and at least one item');
      }

      const baseConfigData = {
        title: config.title.trim(),
        type: 'sort-categories-egg',
        eggQty: Number(config.eggQty),
        categories: formattedCategories,
        share: Boolean(config.share),
        userId: currentUser.uid,
        email: currentUser.email || null,
        createdAt: new Date().toISOString()
      };

      console.log('Attempting to save configuration with data:', {
        title: baseConfigData.title,
        type: baseConfigData.type,
        eggQty: baseConfigData.eggQty,
        categories: baseConfigData.categories,
        share: baseConfigData.share,
        userId: baseConfigData.userId,
        email: baseConfigData.email
      });

      if (isUpdate && config.id) {
        // Update existing configuration
        await updateDoc(doc(db, 'userGameConfigs', config.id), {
          ...baseConfigData,
          updatedAt: serverTimestamp()
        });

        // Delete all high scores for this configuration
        const highScoresQuery = query(
          collection(db, 'highScores'),
          where('configId', '==', config.id)
        );
        const highScoresSnapshot = await getDocs(highScoresQuery);
        const deletePromises = highScoresSnapshot.docs.map(doc => 
          deleteDoc(doc.ref)
        );
        await Promise.all(deletePromises);

        toast({
          title: 'Configuration Updated',
          description: 'Configuration updated and high scores reset',
          status: 'success',
          duration: 3000,
        });
      } else {
        // Save as new configuration
        const newConfigData = {
          ...baseConfigData,
          createdAt: serverTimestamp()
        };

        // Validate required fields
        if (!newConfigData.title) {
          throw new Error('Title is required');
        }
        if (!newConfigData.eggQty || newConfigData.eggQty <= 0) {
          throw new Error('Number of eggs must be greater than 0');
        }
        if (!newConfigData.categories || newConfigData.categories.length === 0) {
          throw new Error('At least one category is required');
        }

        console.log('Saving new configuration:', newConfigData);
        const docRef = await addDoc(collection(db, 'userGameConfigs'), newConfigData);
        config.id = docRef.id;

        toast({
          title: 'Success',
          description: 'New configuration saved successfully',
          status: 'success',
          duration: 3000,
        });
      }

      // Close modal and navigate to the game
      setIsConfigModalOpen(false);
      navigate(`/game/${config.id}`);
      
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not save configuration. Please try again.',
        status: 'error',
        duration: 5000,
      });
    }
  };

  return (
    <div style={{ width: '100vw', overflow: 'hidden' }}>
      {/* Hero Section */}
      <div style={{ backgroundColor: 'var(--color-primary-500)', color: 'white', padding: 'var(--spacing-20) 0', width: '100%' }}>
        <div style={{ width: '100%', margin: '0 auto', padding: '0 var(--spacing-4)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)', alignItems: 'center', width: '100%' }}>
            <h1 style={{ fontSize: 'var(--font-size-5xl)', fontWeight: 'bold' }}>
              Free Educational Games
            </h1>
            <p style={{ fontSize: 'var(--font-size-xl)' }}>
              Discover a world of educational games and professional tutoring services
            </p>
            <RouterLink 
              to="/games"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                padding: 'var(--spacing-4) var(--spacing-8)',
                borderRadius: 'var(--border-radius-md)',
                textDecoration: 'none',
                fontWeight: 'bold',
                transition: 'background-color 0.2s ease-in-out'
              }}
            >
              Start Playing
            </RouterLink>
          </div>
        </div>
      </div>

      {/* Three Column Section */}
      <div style={{ 
        padding: 'var(--spacing-16) var(--spacing-4)',
        backgroundColor: 'var(--color-gray-50)',
        width: '100%'
      }}>
        <div style={{ 
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'var(--spacing-8)',
          width: '100%'
        }}>
          {/* Free Games Column */}
          <div style={{ 
            padding: 'var(--spacing-6)',
            backgroundColor: 'white',
            borderRadius: 'var(--border-radius-lg)',
            boxShadow: 'var(--shadow-md)'
          }}>
            <h2 style={{ 
              fontSize: 'var(--font-size-2xl)',
              color: 'var(--color-gray-800)',
              marginBottom: 'var(--spacing-4)'
            }}>
              Free Games
            </h2>
            <SearchBar onSearch={setFreeGamesSearch} />
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 'var(--spacing-4)' }}>
                  Loading games...
                </div>
              ) : filteredPublicGames.length > 0 ? (
                filteredPublicGames.map(game => (
                  <GameItem 
                    key={game.id} 
                    id={game.id}
                    title={game.title} 
                    type={game.type}
                    thumbnail={game.thumbnail}
                    isPlayable={true}
                  />
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: 'var(--spacing-4)' }}>
                  No games found
                </div>
              )}
            </div>
          </div>

          {/* Modifiable Templates Column */}
          <div style={{ 
            padding: 'var(--spacing-6)',
            backgroundColor: 'white',
            borderRadius: 'var(--border-radius-lg)',
            boxShadow: 'var(--shadow-md)'
          }}>
            <h2 style={{ 
              fontSize: 'var(--font-size-2xl)',
              color: 'var(--color-gray-800)',
              marginBottom: 'var(--spacing-4)'
            }}>
              Modifiable Game Templates
            </h2>
            <SearchBar onSearch={setModifiableSearch} />
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 'var(--spacing-4)' }}>
                  Loading templates...
                </div>
              ) : filteredModifiable.length > 0 ? (
                filteredModifiable.map(template => (
                  <GameItem 
                    key={template.id} 
                    title={template.title} 
                    type={template.type}
                    thumbnail={template.thumbnail}
                    onClick={() => handleTemplateClick(template)}
                  />
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: 'var(--spacing-4)' }}>
                  No templates found
                </div>
              )}
            </div>
          </div>

          {/* Blank Templates Column */}
          <div style={{ 
            padding: 'var(--spacing-6)',
            backgroundColor: 'white',
            borderRadius: 'var(--border-radius-lg)',
            boxShadow: 'var(--shadow-md)'
          }}>
            <h2 style={{ 
              fontSize: 'var(--font-size-2xl)',
              color: 'var(--color-gray-800)',
              marginBottom: 'var(--spacing-4)'
            }}>
              Blank Game Templates
            </h2>
            <SearchBar onSearch={setBlankSearch} />
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 'var(--spacing-4)' }}>
                  Loading templates...
                </div>
              ) : filteredBlank.length > 0 ? (
                filteredBlank.map(template => (
                  <GameItem 
                    key={template.id} 
                    title={template.title} 
                    type={template.type}
                    thumbnail={template.thumbnail}
                    onClick={() => handleTemplateClick(template, true)}
                  />
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: 'var(--spacing-4)' }}>
                  No templates found
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfigurationModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        template={selectedTemplate}
        onSave={handleSaveConfig}
      />
    </div>
  );
};

export default Home; 