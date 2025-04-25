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
  Select,
  FormHelperText,
} from '@chakra-ui/react';
import { generateAndUploadThumbnail } from '../utils/thumbnailGenerator';
import GameItemDisplay from '../components/GameItemDisplay';

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
  share?: boolean;
  userId?: string;
  isOwner?: boolean;
  onDelete?: () => void;
}

// Helper function to get background color based on game type
function getBackgroundColorByType(type: string): string {
  const colors: Record<string, string> = {
    'sort-categories-egg': '#f0e6ff', // Light purple
    'whack-a-mole': '#e6fff0',  // Light green
    'default': 'var(--color-primary-100)'
  };
  
  return colors[type] || colors.default;
}

// Helper function to get icon based on game type
function getIconByType(type: string): string {
  switch (type) {
    case 'sort-categories-egg':
      return '🥚';
    case 'whack-a-mole':
      return '🔨';
    default:
      return '';
  }
}

const GameItem = ({ title, type, thumbnail, id, isPlayable, config, onClick, isOwner, onDelete }: GameItemProps) => {
  // The icon to show when no thumbnail is available
  const gameIcon = getIconByType(type) || title.charAt(0);
  // Background color for the thumbnail placeholder
  const bgColor = getBackgroundColorByType(type);
  
  const renderThumbnail = () => (
    <div style={{
      width: '60px',
      height: '60px',
      backgroundColor: bgColor,
      borderRadius: 'var(--border-radius-md)',
      marginRight: 'var(--spacing-3)',
      overflow: 'hidden',
      flexShrink: 0,
      position: 'relative'
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
          color: 'var(--color-primary-700)',
          fontSize: 'var(--font-size-xl)'
        }}>
          {gameIcon}
        </div>
      )}
      {/* Type indicator */}
      <div style={{
        position: 'absolute',
        bottom: '2px',
        right: '2px',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: '50%',
        width: '18px',
        height: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px'
      }}>
        {type === 'sort-categories-egg' ? 'S' : 'W'}
      </div>
    </div>
  );
  
  const renderInfo = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--spacing-1)',
      flex: 1
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
        Type: {type === 'sort-categories-egg' ? 'Categories' : 'Whack-a-Mole'}
      </span>
    </div>
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
    color: 'inherit',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    '&:hover': {
      boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
    }
  };

  const renderDeleteButton = () => (
    isOwner && onDelete && (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete();
        }}
        style={{
          position: 'absolute',
          top: '50%',
          right: '16px',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-gray-500)',
          padding: 'var(--spacing-1)',
          borderRadius: 'var(--border-radius-sm)',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10
        }}
        aria-label="Delete"
        title="Delete"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
        </svg>
      </button>
    )
  );

  if (onClick) {
    return (
      <div style={{ position: 'relative' }}>
        <div style={containerStyles} onClick={onClick}>
          {renderThumbnail()}
          {renderInfo()}
        </div>
        {renderDeleteButton()}
      </div>
    );
  }

  return isPlayable && id ? (
    <div style={{ position: 'relative' }}>
      <RouterLink to={`/game/${id}`} style={containerStyles}>
        {renderThumbnail()}
        {renderInfo()}
      </RouterLink>
        {renderDeleteButton()}
    </div>
  ) : (
    <div style={{ position: 'relative' }}>
      <div style={containerStyles}>
        {renderThumbnail()}
        {renderInfo()}
      </div>
        {renderDeleteButton()}
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

  // Whack-a-mole specific state
  const [gameTime, setGameTime] = useState(template?.gameTime || 30);
  const [pointsPerHit, setPointsPerHit] = useState(template?.pointsPerHit || 10);
  const [penaltyPoints, setPenaltyPoints] = useState(template?.penaltyPoints || 5);
  const [bonusPoints, setBonusPoints] = useState(template?.bonusPoints || 10);
  const [bonusThreshold, setBonusThreshold] = useState(template?.bonusThreshold || 3);
  const [gameSpeed, setGameSpeed] = useState(template?.speed || 2);
  const [instructions, setInstructions] = useState(template?.instructions || '');
  const [wordCategories, setWordCategories] = useState<{ title: string; words: string[] }[]>(
    template?.categories || [{ title: '', words: [] }]
  );

  const { currentUser } = useAuth();
  const isOwnTemplate = template?.userId === currentUser?.uid;
  const gameType = template?.type || 'sort-categories-egg';

  // Reset form when template changes
  useEffect(() => {
    if (template) {
      setTitle(template.title || '');
      setShareConfig(template.share || false);

      if (template.type === 'sort-categories-egg') {
        setEggQty(template.eggQty || 6);
        setCategories(
          template.categories 
            ? template.categories.map((cat: any) => ({ 
                name: cat.name, 
                items: Array.isArray(cat.items) ? cat.items.join(', ') : cat.items 
              }))
            : [{ name: '', items: '' }]
        );
      } else if (template.type === 'whack-a-mole') {
        setGameTime(template.gameTime || 30);
        setPointsPerHit(template.pointsPerHit || 10);
        setPenaltyPoints(template.penaltyPoints || 5);
        setBonusPoints(template.bonusPoints || 10);
        setBonusThreshold(template.bonusThreshold || 3);
        setGameSpeed(template.speed || 2);
        setInstructions(template.instructions || '');
        setWordCategories(template.categories || [{ title: '', words: [] }]);
      }
    }
  }, [template]);

  const handleAddCategory = () => {
    if (gameType === 'sort-categories-egg') {
      setCategories([...categories, { name: '', items: '' }]);
    } else {
      setWordCategories([...wordCategories, { title: '', words: [] }]);
    }
  };

  const handleCategoryChange = (index: number, field: 'name' | 'items', value: string) => {
    if (gameType === 'sort-categories-egg') {
      const newCategories = [...categories];
      newCategories[index][field] = value;
      setCategories(newCategories);
    }
  };

  const handleWordCategoryChange = (index: number, field: 'title' | 'words', value: string) => {
    const newCategories = [...wordCategories];
    if (field === 'title') {
      newCategories[index].title = value;
    } else {
      newCategories[index].words = value.split(',').map(word => word.trim());
    }
    setWordCategories(newCategories);
  };

  const handleSave = (isUpdate: boolean = false) => {
    let configData;

    if (gameType === 'sort-categories-egg') {
      // Transform categories to ensure items is always an array
      const transformedCategories = categories.map(cat => ({
        name: (cat.name || '').trim(),
        items: (cat.items || '').split(',')
          .map(item => item.trim())
          .filter(item => item.length > 0)
      }));

      configData = {
        title: title.trim(),
        type: 'sort-categories-egg',
        eggQty: eggQty,
        categories: transformedCategories,
        share: shareConfig,
        email: currentUser?.email || '',
        userId: currentUser?.uid || '',
        createdAt: serverTimestamp()
      };
    } else {
      // Whack-a-mole configuration
      configData = {
        title: title.trim(),
        type: 'whack-a-mole',
        gameTime,
        pointsPerHit,
        penaltyPoints,
        bonusPoints,
        bonusThreshold,
        speed: gameSpeed,
        instructions,
        categories: wordCategories,
        share: shareConfig,
        email: currentUser?.email || '',
        userId: currentUser?.uid || '',
        createdAt: serverTimestamp()
      };
    }

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

            {gameType === 'sort-categories-egg' ? (
              // Sort Categories Egg Configuration
              <>
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
              </>
            ) : (
              // Whack-a-mole Configuration
              <>
                <FormControl>
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

                <FormControl>
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

                <FormControl>
                  <FormLabel>Game Instructions</FormLabel>
                  <Textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Enter custom instructions shown to players (optional)"
                    rows={3}
                  />
                  <FormHelperText>
                    Custom instructions to show on the game start screen. If left empty, default instructions will be shown.
                  </FormHelperText>
                </FormControl>

                <FormControl>
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

                <FormControl>
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
                </FormControl>

                <FormControl>
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

                <FormControl>
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
                </FormControl>

                {wordCategories.map((category, index) => (
                  <VStack key={index} w="100%" spacing={2}>
                    <FormControl>
                      <FormLabel>Category {index + 1} Title</FormLabel>
                      <Input
                        value={category.title}
                        onChange={(e) => handleWordCategoryChange(index, 'title', e.target.value)}
                        placeholder="Category title"
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Words (comma-separated)</FormLabel>
                      <Textarea
                        value={category.words.join(', ')}
                        onChange={(e) => handleWordCategoryChange(index, 'words', e.target.value)}
                        placeholder="word1, word2, word3"
                      />
                    </FormControl>
                  </VStack>
                ))}
              </>
            )}

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

// Define a proper interface for game objects
interface GameObject {
  id: string;
  title: string;
  type: string;
  thumbnail?: string;
  userId?: string;
  share?: boolean;
  categories?: any[];
  eggQty?: number;
}

const Home = () => {
  // State for games and search
  const [publicGames, setPublicGames] = useState<GameObject[]>([]);
  const [freeGamesSearch, setFreeGamesSearch] = useState('');
  const [modifiableSearch, setModifiableSearch] = useState('');
  const [blankSearch, setBlankSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const toast = useToast();
  const [modifiableTemplates, setModifiableTemplates] = useState<GameObject[]>([]);
  const [blankTemplates, setBlankTemplates] = useState<GameObject[]>([]);
  
  // State for deletion confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, type: 'template' | 'game', title: string} | null>(null);

  // Handler for opening delete confirmation dialog
  const handleDeleteClick = (id: string, type: 'template' | 'game', title: string) => {
    setItemToDelete({id, type, title});
    setIsDeleteDialogOpen(true);
  };

  // Function to delete a template and its associated games
  const deleteTemplateAndGames = async () => {
    if (!itemToDelete || !currentUser) return;
    
    try {
      setLoading(true);
      
      // First delete the template
      if (itemToDelete.type === 'template') {
        await deleteDoc(doc(db, 'categoryTemplates', itemToDelete.id));
        
        // Then find and delete any associated games with the same title
        const gamesQuery = query(
          collection(db, 'userGameConfigs'),
          where('userId', '==', currentUser.uid),
          where('title', '==', itemToDelete.title)
        );
        
        const gamesSnapshot = await getDocs(gamesQuery);
        const deletePromises = gamesSnapshot.docs.map(doc => 
          deleteDoc(doc.ref)
        );
        
        await Promise.all(deletePromises);
        
        // Update local state
        setModifiableTemplates(prev => 
          prev.filter(template => template.id !== itemToDelete.id)
        );
        
        // Update games list too
        setPublicGames(prev => 
          prev.filter(game => 
            !(game.userId === currentUser.uid && game.title === itemToDelete.title)
          )
        );
        
        toast({
          title: "Deleted Successfully",
          description: `Deleted template "${itemToDelete.title}" and its associated games`,
          status: "success",
          duration: 3000,
        });
      } 
      // Delete just a single game
      else if (itemToDelete.type === 'game') {
        await deleteDoc(doc(db, 'userGameConfigs', itemToDelete.id));
        
        // Update local state
        setPublicGames(prev => 
          prev.filter(game => game.id !== itemToDelete.id)
        );
        
        toast({
          title: "Deleted Successfully", 
          description: `Deleted game "${itemToDelete.title}"`,
          status: "success",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Error deleting:", error);
      toast({
        title: "Error",
        description: "Failed to delete. Please try again.",
        status: "error",
        duration: 5000,
      });
    } finally {
      setLoading(false);
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  // Deletion confirmation dialog
  const DeleteConfirmationDialog = () => (
    <Modal isOpen={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Confirm Deletion</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {itemToDelete?.type === 'template' ? (
            <p>
              Are you sure you want to delete the template "{itemToDelete?.title}"? 
              This will also delete any associated games with the same title.
            </p>
          ) : (
            <p>Are you sure you want to delete the game "{itemToDelete?.title}"?</p>
          )}
        </ModalBody>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem' }}>
          <Button 
            onClick={() => setIsDeleteDialogOpen(false)}
            style={{ marginRight: '0.5rem' }}
          >
            Cancel
          </Button>
          <Button 
            colorScheme="red" 
            onClick={deleteTemplateAndGames}
            isLoading={loading}
          >
            Delete
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );

  // Fetch public games, modifiable templates, and blank templates
  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true);
        
        // Query for user's own games and publicly shared games by others
        const [
          userOwnGamesSnapshot, 
          publicGamesSnapshot, 
          sortCategoriesTemplatesSnapshot,
          whackAMoleTemplatesSnapshot, 
          blankTemplatesSnapshot
        ] = await Promise.all([
          // Get all of the current user's games (both private and public)
          currentUser ? getDocs(query(
            collection(db, 'userGameConfigs'),
            where('userId', '==', currentUser.uid)
          )) : Promise.resolve({ docs: [] }),
          
          // Get public games (we'll filter by userId in JavaScript)
          getDocs(query(
            collection(db, 'userGameConfigs'),
            where('share', '==', true)
          )),
          
          // Get sort-categories-egg modifiable templates
          getDocs(query(
            collection(db, 'categoryTemplates'),
            where('type', '==', 'sort-categories-egg')
          )),
          
          // Get whack-a-mole modifiable templates
          getDocs(query(
            collection(db, 'categoryTemplates'),
            where('type', '==', 'whack-a-mole')
          )),
          
          // Get blank templates
          getDocs(collection(db, 'blankGameTemplates'))
        ]);

        // Process the user's own games
        const userGames = userOwnGamesSnapshot.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title || 'Untitled Game',
          type: doc.data().type || 'sort-categories-egg',
          thumbnail: doc.data().thumbnail || undefined,
          userId: doc.data().userId || undefined,
          share: doc.data().share || false
        }));

        // Process other users' public games (filter out current user's games)
        const otherGames = publicGamesSnapshot.docs
          .filter(doc => !currentUser || doc.data().userId !== currentUser.uid)
          .map(doc => ({
            id: doc.id,
            title: doc.data().title || 'Untitled Game',
            type: doc.data().type || 'sort-categories-egg',
            thumbnail: doc.data().thumbnail || undefined,
            userId: doc.data().userId || undefined,
            share: doc.data().share || false
          }));

        // Combine into a single array for public games display
        setPublicGames([...userGames, ...otherGames]);

        // Process sort-categories-egg templates
        const sortCategoriesTemplates = sortCategoriesTemplatesSnapshot.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title || 'Untitled Template',
          type: doc.data().type || 'sort-categories-egg',
          thumbnail: doc.data().thumbnail,
          userId: doc.data().userId,
          categories: doc.data().categories || [],
          eggQty: doc.data().eggQty || 6,
          share: doc.data().share || false
        }));
        
        // Process whack-a-mole templates
        const whackAMoleTemplates = whackAMoleTemplatesSnapshot.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title || 'Untitled Template',
          type: doc.data().type || 'whack-a-mole',
          thumbnail: doc.data().thumbnail,
          userId: doc.data().userId,
          words: doc.data().words || [],
          share: doc.data().share || false
        }));
        
        // Combine all templates
        setModifiableTemplates([...sortCategoriesTemplates, ...whackAMoleTemplates]);

        // Process blank templates
        const blankTemplatesData = blankTemplatesSnapshot.docs.map(doc => {
          // Ensure blank templates have a valid game type
          let type = doc.data().type || 'sort-categories-egg';
          
          // Make sure the type is one of our supported game types
          if (type !== 'whack-a-mole' && type !== 'sort-categories-egg') {
            // Default to sort-categories-egg if type is not supported
            type = 'sort-categories-egg';
          }
          
          return {
            id: doc.id,
            title: doc.data().title || 'Untitled Template',
            type: type, // Use the validated type
            thumbnail: doc.data().thumbnail,
            categories: doc.data().categories || [],
            eggQty: doc.data().eggQty || 6,
            share: doc.data().share || false
          };
        });
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
  }, [toast, currentUser]);

  // Filter and separate games based on ownership and search
  const userOwnedGames = publicGames.filter(game => 
    currentUser && game.userId === currentUser.uid &&
    game.title.toLowerCase().includes(freeGamesSearch.toLowerCase())
  );
  
  const otherPublicGames = publicGames.filter(game => 
    (!currentUser || game.userId !== currentUser.uid) &&
    game.share === true && // Only show other users' games if they're public
    game.title.toLowerCase().includes(freeGamesSearch.toLowerCase())
  );

  // Filter and separate templates based on ownership and search
  const userOwnedTemplates = modifiableTemplates.filter(template => 
    currentUser && template.userId === currentUser.uid &&
    template.title.toLowerCase().includes(modifiableSearch.toLowerCase())
  );
  
  const otherTemplates = modifiableTemplates.filter(template => 
    !currentUser || template.userId !== currentUser.uid &&
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

    // Ensure template has a valid type
    let templateType = template.type || 'sort-categories-egg';
    if (templateType !== 'whack-a-mole' && templateType !== 'sort-categories-egg') {
      templateType = 'sort-categories-egg'; // Default to sort-categories-egg
    }

    // Navigate to the appropriate configuration page based on game type
    if (templateType === 'whack-a-mole' || templateType === 'sort-categories-egg') {
      // For games with dedicated config pages, navigate to the appropriate route
      if (template.id) {
        navigate(`/configure/${templateType}/${template.id}`);
      } else {
        navigate(`/configure/${templateType}`);
      }
    } else {
      // For other game types that still use the modal
      setSelectedTemplate({...template, type: templateType});
      setIsConfigModalOpen(true);
    }
  };

  interface Category {
    name: string;
    items: string[];
  }

  interface WordCategory {
    title: string;
    words: string[];
  }

  const handleSaveConfig = async (config: any, isUpdate: boolean) => {
    try {
      if (!currentUser) {
        throw new Error('You must be signed in to save configurations');
      }

      let formattedCategories: Category[] | WordCategory[];
      let baseConfigData: any;
      let docId: string = config.id || '';

      if (config.type === 'whack-a-mole') {
        // Format whack-a-mole categories
        formattedCategories = (config.categories || []).map((cat: { title?: string; words?: string | string[] }) => ({
          title: (cat.title || '').trim(),
          words: typeof cat.words === 'string' 
            ? cat.words.split(',').map(word => word.trim()).filter(Boolean)
            : (cat.words || []).map(word => word.trim()).filter(Boolean)
        })).filter((cat: WordCategory) => cat.title && cat.words.length > 0);

        if (formattedCategories.length === 0) {
          throw new Error('Each category must have a title and at least one word');
        }

        baseConfigData = {
          title: (config.title || '').trim(),
          type: 'whack-a-mole',
          gameTime: Number(config.gameTime) || 30,
          pointsPerHit: Number(config.pointsPerHit) || 10,
          penaltyPoints: Number(config.penaltyPoints) || 5,
          bonusPoints: Number(config.bonusPoints) || 10,
          bonusThreshold: Number(config.bonusThreshold) || 3,
          speed: Number(config.speed) || 2,
          instructions: config.instructions || '',
          categories: formattedCategories,
          share: Boolean(config.share),
          userId: currentUser?.uid || '',
          email: currentUser?.email || null,
          createdAt: serverTimestamp()
        };

        console.log('Saving whack-a-mole configuration:', baseConfigData);

        if (isUpdate && config.id) {
          await updateDoc(doc(db, 'userGameConfigs', config.id), {
            ...baseConfigData,
            updatedAt: serverTimestamp()
          });
          docId = config.id;
        } else {
          const docRef = await addDoc(collection(db, 'userGameConfigs'), baseConfigData);
          docId = docRef.id;
          config.id = docId;
        }
      } else {
        // Format sort-categories-egg categories
        formattedCategories = (config.categories || []).map((cat: { name?: string; items?: string | string[] }) => {
          const name = (cat.name || '').trim();
          const items = Array.isArray(cat.items) 
            ? cat.items.map(item => (item || '').trim()).filter(Boolean)
            : (cat.items || '').split(',').map(item => item.trim()).filter(Boolean);
          return { name, items };
        }).filter((cat: { name: string; items: string[] }): cat is Category => Boolean(cat.name && cat.items.length > 0));

        if (formattedCategories.length === 0) {
          throw new Error('All categories must have a name and at least one item');
        }

        baseConfigData = {
          title: (config.title || '').trim(),
          type: 'sort-categories-egg',
          eggQty: Number(config.eggQty) || 6,
          categories: formattedCategories,
          share: Boolean(config.share),
          userId: currentUser?.uid || '',
          email: currentUser?.email || null,
          createdAt: serverTimestamp()
        };

        console.log('Saving sort-categories-egg configuration:', baseConfigData);

        if (isUpdate && config.id) {
          await updateDoc(doc(db, 'userGameConfigs', config.id), {
            ...baseConfigData,
            updatedAt: serverTimestamp()
          });
          docId = config.id;
        } else {
          const docRef = await addDoc(collection(db, 'userGameConfigs'), baseConfigData);
          docId = docRef.id;
          config.id = docId;
        }
      }

      // Generate and upload thumbnail after saving the document
      try {
        if (docId) {
          console.log('Generating thumbnail for document ID:', docId);
          
          // Generate game-specific thumbnail data
          const gameData = {
            ...baseConfigData,
            id: docId
          };
          
          // Generate and upload the thumbnail
          const thumbnailUrl = await generateAndUploadThumbnail(docId, gameData);
          
          // Update the document with the thumbnail URL
          if (thumbnailUrl) {
            await updateDoc(doc(db, 'userGameConfigs', docId), {
              thumbnail: thumbnailUrl
            });
            console.log('Thumbnail generated and saved:', thumbnailUrl);
          }
        }
      } catch (thumbnailError) {
        console.error('Error generating thumbnail:', thumbnailError);
        // Continue without thumbnail - it's not critical to game functionality
      }

      toast({
        title: isUpdate ? 'Configuration Updated' : 'Success',
        description: isUpdate 
          ? 'Configuration updated successfully' 
          : 'New configuration saved successfully',
        status: 'success',
        duration: 3000,
      });

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

  // For free games section
  const renderGamesList = (
    games: GameObject[],
    isOwner: boolean,
    handleDeleteClick: (id: string, type: 'template' | 'game', title: string) => void
  ) => {
    return games.length > 0 ? (
      <div>
        {games.map(game => (
          <GameItemDisplay
            key={game.id}
            id={game.id}
            title={game.title}
            type={game.type}
            thumbnail={game.thumbnail}
            isPlayable={true}
            isOwner={isOwner}
            onDelete={() => handleDeleteClick(game.id, 'game', game.title)}
          />
        ))}
      </div>
    ) : (
      <div style={{ textAlign: 'center', padding: 'var(--spacing-4)', color: 'var(--color-gray-500)' }}>
        No games found
      </div>
    );
  };

  // For modifiable and blank templates section
  const renderTemplatesList = (
    templates: GameObject[],
    isOwner: boolean,
    onTemplateClick: (template: any) => void,
    handleDeleteClick?: (id: string, type: 'template' | 'game', title: string) => void
  ) => {
    return templates.length > 0 ? (
      <div>
        {templates.map(template => (
          <GameItemDisplay
            key={template.id}
            title={template.title}
            type={template.type}
            thumbnail={template.thumbnail}
            isPlayable={false}
            onClick={() => onTemplateClick(template)}
            isOwner={isOwner}
            onDelete={handleDeleteClick ? () => handleDeleteClick(template.id, 'template', template.title) : undefined}
          />
        ))}
      </div>
    ) : (
      <div style={{ textAlign: 'center', padding: 'var(--spacing-4)', color: 'var(--color-gray-500)' }}>
        No templates found
      </div>
    );
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
              ) : (
                <>
                  {/* User's own games section */}
                  {currentUser && userOwnedGames.length > 0 && (
                    <div>
                      <h3 style={{ 
                        fontSize: 'var(--font-size-lg)',
                        color: 'var(--color-gray-700)',
                        margin: 'var(--spacing-4) 0',
                        paddingBottom: 'var(--spacing-2)',
                        borderBottom: '1px solid var(--color-gray-200)'
                      }}>
                        My Games
                      </h3>
                      {renderGamesList(userOwnedGames, true, handleDeleteClick)}
                    </div>
                  )}
                  
                  {/* Other public games section */}
                  {otherPublicGames.length > 0 && (
                    <div>
                      {currentUser && userOwnedGames.length > 0 && (
                        <h3 style={{ 
                          fontSize: 'var(--font-size-lg)',
                          color: 'var(--color-gray-700)',
                          margin: 'var(--spacing-4) 0',
                          paddingBottom: 'var(--spacing-2)',
                          borderBottom: '1px solid var(--color-gray-200)'
                        }}>
                          Other Public Games
                        </h3>
                      )}
                      {renderGamesList(otherPublicGames, false, handleDeleteClick)}
                    </div>
                  )}
                </>
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
              ) : (
                <>
                  {/* User's own templates section */}
                  {currentUser && userOwnedTemplates.length > 0 && (
                    <div>
                      <h3 style={{ 
                        fontSize: 'var(--font-size-lg)',
                        color: 'var(--color-gray-700)',
                        margin: 'var(--spacing-4) 0',
                        paddingBottom: 'var(--spacing-2)',
                        borderBottom: '1px solid var(--color-gray-200)'
                      }}>
                        My Templates
                      </h3>
                      {renderTemplatesList(userOwnedTemplates, true, handleTemplateClick, handleDeleteClick)}
                    </div>
                  )}
                  
                  {/* Other templates section */}
                  {otherTemplates.length > 0 && (
                    <div>
                      {currentUser && userOwnedTemplates.length > 0 && (
                        <h3 style={{ 
                          fontSize: 'var(--font-size-lg)',
                          color: 'var(--color-gray-700)',
                          margin: 'var(--spacing-4) 0',
                          paddingBottom: 'var(--spacing-2)',
                          borderBottom: '1px solid var(--color-gray-200)'
                        }}>
                          Other Templates
                        </h3>
                      )}
                      {renderTemplatesList(otherTemplates, false, handleTemplateClick, handleDeleteClick)}
                    </div>
                  )}
                  
                  {userOwnedTemplates.length === 0 && otherTemplates.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-4)' }}>
                      No templates found
                    </div>
                  )}
                </>
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
              ) : (
                renderTemplatesList(filteredBlank, false, (template) => handleTemplateClick(template, true))
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

      {/* Render the confirmation dialog */}
      <DeleteConfirmationDialog />
    </div>
  );
};

export default Home; 