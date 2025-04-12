import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Text,
  VStack,
  HStack,
  useToast,
  useBreakpointValue,
  FormControl,
  FormLabel,
  Input,
  ResponsiveValue,
} from '@chakra-ui/react';
import { collection, addDoc, getDocs, query, where, orderBy, limit, serverTimestamp, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../../config/firebase';
import Egg from './Egg';
import Basket from './Basket';
import GameConfig from './GameConfig';
import { GameConfig as GameConfigType, Word, Egg as EggType, Basket as BasketType, HighScore as HighScoreType } from '../../../types/game';
import { motion } from 'framer-motion';
import { sanitizeName, isValidPlayerName } from '../../../utils/profanityFilter';

interface SortCategoriesEggRevealProps {
  playerName: string;
  onGameComplete: (score: number) => void;
  config: GameConfigType;
}

const SortCategoriesEggReveal: React.FC<SortCategoriesEggRevealProps> = ({
  playerName,
  onGameComplete,
  config: initialConfig,
}): JSX.Element => {
  // Game state
  const [score, setScore] = useState(0);
  const [eggs, setEggs] = useState<EggType[]>([]);
  const [crackedEggs, setCrackedEggs] = useState<EggType[]>([]);
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [isWordSelected, setIsWordSelected] = useState(false);
  const [baskets, setBaskets] = useState<BasketType[]>([]);
  const [gameConfig, setGameConfig] = useState<GameConfigType>({
    title: 'Default Configuration',
    type: 'sort-categories-egg-reveal',
    eggQty: 6,
    categories: [
      { name: 'Category 1', items: ['Item 1', 'Item 2', 'Item 3'] },
      { name: 'Category 2', items: ['Item 4', 'Item 5', 'Item 6'] },
    ],
    share: false,
    createdAt: Timestamp.now(),
  });
  const [gameStarted, setGameStarted] = useState(false);
  const [savedConfigs, setSavedConfigs] = useState<GameConfigType[]>([]);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ghostPosition, setGhostPosition] = useState({ x: 0, y: 0 });
  const [targetBasket, setTargetBasket] = useState<BasketType | null>(null);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [highScores, setHighScores] = useState<HighScoreType[]>([]);
  const [isHighScore, setIsHighScore] = useState(false);
  const [showHighScoreModal, setShowHighScoreModal] = useState(false);
  const [newHighScoreName, setNewHighScoreName] = useState("");
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  
  const toast = useToast();
  const gameAreaRef = useRef<HTMLDivElement>(null);

  // Responsive values
  const containerPadding = useBreakpointValue({ base: 2, md: 3, lg: 4 });
  const headingSize = useBreakpointValue({ base: "sm", md: "md" });
  const gameHeight = useBreakpointValue({ base: "300px", md: "400px", lg: "450px" });
  const basketStackDirection = useBreakpointValue({ base: "column", md: "row" }) as ResponsiveValue<"column" | "row">;
  const modalSize = useBreakpointValue({ base: "sm", md: "md", lg: "xl" });
  const eggSize = useBreakpointValue({ base: "45px", md: "50px", lg: "55px" });
  const basketWidth = useBreakpointValue({ base: "120px", md: "140px", lg: "160px" });
  const basketSpacing = useBreakpointValue({ base: 2, md: 3, lg: 4 });

  // Load saved configurations
  useEffect(() => {
    loadSavedConfigs();
  }, []);

  const loadSavedConfigs = async () => {
    try {
      setIsLoading(true);
      const q = query(
        collection(db, 'userGameConfigs'),
        where('type', '==', 'sort-categories-egg'),
        where('share', '==', true)
      );
      const querySnapshot = await getDocs(q);
      const configs: GameConfigType[] = [];
      querySnapshot.forEach((doc) => {
        configs.push({ id: doc.id, ...doc.data() } as GameConfigType);
      });
      setSavedConfigs(configs);
    } catch (error) {
      console.error('Error loading configurations:', error);
      // Provide fallback data
      const fallbackConfigs: GameConfigType[] = [
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
          createdAt: Timestamp.fromDate(new Date())
        }
      ];
      setSavedConfigs(fallbackConfigs);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize game with provided config
  useEffect(() => {
    console.log('Initializing game with initial config:', initialConfig);
    const emptyBaskets = initialConfig.categories.map((category, index) => ({
      id: `basket-${index}`,
      name: category.name,
      items: [],
    }));
    setBaskets(emptyBaskets);
    initializeGame(initialConfig);
  }, [initialConfig]);

  // Initialize game with selected configuration
  const initializeGame = (config: GameConfigType) => {
    console.log('Initializing game with config:', config);
    // Ensure we preserve the ID when setting the game config
    setGameConfig({
      ...config,
      id: config.id // Explicitly preserve the ID
    });
    
    // Load high scores for this configuration
    if (config.id) {
      console.log('Loading high scores for config ID:', config.id);
      loadHighScores(config.id);
    } else {
      console.error('No config ID available for game initialization');
    }
    
    // Create baskets from categories
    const newBaskets: BasketType[] = config.categories.map((category, index) => ({
      id: `basket-${index}`,
      name: category.name,
      items: [],
    }));
    setBaskets(newBaskets);
    
    // Create eggs with random words from categories
    const allWords: Word[] = [];
    config.categories.forEach(category => {
      category.items.forEach(item => {
        allWords.push({ text: item, category: category.name });
      });
    });
    
    // Calculate grid-like positions for eggs
    const newEggs: EggType[] = [];
    const numEggs = Math.min(config.eggQty, allWords.length);
    const gridCols = Math.ceil(Math.sqrt(numEggs));
    
    // Calculate cell dimensions with padding to prevent overlap
    const titleHeight = 20; // Reserve top 20% for title
    const bottomReserve = 30; // Reserve bottom 30% for baskets
    const usableHeight = 100 - titleHeight - bottomReserve; // Remaining space for eggs
    
    const horizontalPadding = 15; // 15% padding from sides
    const usableWidth = 100 - (2 * horizontalPadding);
    
    const cellWidth = usableWidth / gridCols;
    const cellHeight = usableHeight / Math.ceil(numEggs / gridCols);
    
    // Shuffle allWords array before creating eggs
    const shuffledWords = [...allWords].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < numEggs; i++) {
      const randomWord = shuffledWords[i];
      const row = Math.floor(i / gridCols);
      const col = i % gridCols;
      
      // Calculate base position
      const baseX = horizontalPadding + (col * cellWidth) + (cellWidth / 2);
      const baseY = titleHeight + (row * cellHeight) + (cellHeight / 2);
      
      // Add small random offset (max 10% of cell size)
      const maxOffset = Math.min(cellWidth, cellHeight) * 0.1;
      const offsetX = (Math.random() - 0.5) * maxOffset;
      const offsetY = (Math.random() - 0.5) * maxOffset;
      
      newEggs.push({
        id: `egg-${Date.now()}-${i}`,
        word: randomWord,
        cracked: false,
        position: {
          x: baseX + offsetX,
          y: baseY + offsetY,
        },
      });
    }
    setEggs(newEggs);
    setCrackedEggs([]);
    setScore(0);
    setGameStarted(true);
  };

  // Handle egg click
  const handleEggClick = (egg: EggType) => {
    if (egg.cracked) return;
    
    const updatedEggs = eggs.map(e => 
      e.id === egg.id ? { ...e, cracked: true } : e
    );
    setEggs(updatedEggs);
    
    const crackedEgg = updatedEggs.find(e => e.id === egg.id);
    if (crackedEgg) {
      setCrackedEggs([...crackedEggs, crackedEgg]);
      // Remove automatic word selection on crack
      setSelectedWord(null);
      setIsWordSelected(false);
    }
  };

  // Handle word click
  const handleWordClick = (word: Word, e: React.MouseEvent) => {
    if (!gameAreaRef.current) return;
    
    if (isWordSelected && selectedWord?.text === word.text) {
      // If clicking the same word, deselect it
      setSelectedWord(null);
      setIsWordSelected(false);
      setTargetBasket(null);
    } else {
      // Select the word
      setSelectedWord(word);
      setIsWordSelected(true);
      
      const rect = gameAreaRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setGhostPosition({ x, y });
    }
  };

  // Handle mouse move
  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isWordSelected || !gameAreaRef.current || !selectedWord) return;
    
    const rect = gameAreaRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setGhostPosition({ x, y });
    
    // Check if hovering over a basket
    const hoveredBasket = baskets.find(basket => {
      const basketElement = document.querySelector(`.basket-${basket.id}`);
      if (!basketElement) return false;
      
      const basketRect = basketElement.getBoundingClientRect();
      return (
        event.clientX >= basketRect.left &&
        event.clientX <= basketRect.right &&
        event.clientY >= basketRect.top &&
        event.clientY <= basketRect.bottom
      );
    });
    
    setTargetBasket(hoveredBasket || null);
  };

  // Handle click anywhere (for dropping)
  const handleGameAreaClick = (event: React.MouseEvent) => {
    if (!isWordSelected || !selectedWord) return;

    // Find clicked basket
    const clickedBasket = baskets.find(basket => {
      // Look for basket element with class name instead of id
      const basketElement = document.querySelector(`.basket-${basket.id}`);
      if (!basketElement) return false;
      
      const basketRect = basketElement.getBoundingClientRect();
      const isInBasket = (
        event.clientX >= basketRect.left &&
        event.clientX <= basketRect.right &&
        event.clientY >= basketRect.top &&
        event.clientY <= basketRect.bottom
      );
      
      if (isInBasket && selectedWord.category === basket.name) {
        return true;
      }
      return false;
    });

    if (clickedBasket) {
      placeWordInBasket(selectedWord, clickedBasket);
      setSelectedWord(null);
      setIsWordSelected(false);
      setTargetBasket(null);
    }
  };

  useEffect(() => {
    const handleGlobalMouseMove = (event: MouseEvent) => {
      if (!isWordSelected || !gameAreaRef.current) return;
      
      const rect = gameAreaRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      setGhostPosition({ x, y });
    };

    if (isWordSelected) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [isWordSelected]);

  // Place word in basket
  const placeWordInBasket = (word: Word, basket: BasketType) => {
    const newScore = score + 10;
    setScore(newScore);
    
    // Update baskets
    const updatedBaskets = baskets.map(b => {
      if (b.id === basket.id) {
        return {
          ...b,
          items: [...b.items, word],
        };
      }
      return b;
    });
    setBaskets(updatedBaskets);
    
    // Remove word from cracked eggs
    const updatedCrackedEggs = crackedEggs.filter(
      egg => egg.word.text !== word.text
    );
    setCrackedEggs(updatedCrackedEggs);
    
    // Check if game is complete
    const allEggsCracked = eggs.every(egg => egg.cracked);
    const allWordsPlaced = eggs.length === updatedBaskets.reduce((total, basket) => total + basket.items.length, 0);
    
    if (allEggsCracked && allWordsPlaced) {
      const finalScore = newScore;
      onGameComplete(finalScore);
      setIsGameComplete(true);
      
      // Check for high score
      checkHighScore(finalScore);
      
      // Play celebration sound if it's a high score
      if (isHighScore) {
        const audio = new Audio('/sounds/highscore.mp3');
        audio.volume = 0.5;
        audio.play().catch(console.error);
      }
    }
  };

  // Handle configuration selection
  const handleConfigSelect = (config: GameConfigType) => {
    initializeGame(config);
    setIsConfigModalOpen(false);
  };

  // Save current configuration
  const handleSaveConfig = async () => {
    if (!auth.currentUser) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to save configurations.',
        status: 'error',
        duration: 5000,
      });
      return;
    }

    try {
      const configData = {
        type: 'sort-categories-egg',
        title: gameConfig.title,
        eggQty: gameConfig.eggQty,
        categories: gameConfig.categories,
        share: gameConfig.share,
        userId: auth.currentUser.uid,
        email: auth.currentUser.email || undefined,
        createdAt: Timestamp.fromDate(new Date())
      };

      await addDoc(collection(db, 'userGameConfigs'), configData);
      toast({
        title: 'Success',
        description: 'Configuration saved successfully',
        status: 'success',
        duration: 3000,
      });
      await loadSavedConfigs();
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: 'Error',
        description: 'Could not save configuration. Please try again.',
        status: 'error',
        duration: 5000,
      });
    }
  };

  // Handle reset game
  const handleResetGame = () => {
    console.log('Resetting game...');
    // Reset all game state
    setScore(0);
    setEggs([]);
    setCrackedEggs([]);
    setSelectedWord(null);
    setIsWordSelected(false);
    setGhostPosition({ x: 0, y: 0 });
    setTargetBasket(null);
    setIsGameComplete(false);
    setIsHighScore(false);
    setShowHighScoreModal(false);
    setNewHighScoreName("");
    
    // Reset baskets
    const emptyBaskets = gameConfig.categories.map((category, index) => ({
      id: `basket-${index}`,
      name: category.name,
      items: [],
    }));
    setBaskets(emptyBaskets);
    
    // Create a fresh copy of the game config while preserving the original ID
    const freshConfig = {
      ...gameConfig,
      categories: gameConfig.categories.map(cat => ({
        ...cat,
        items: [...cat.items]
      }))
    };
    
    // Re-initialize game with fresh config
    initializeGame(freshConfig);
  };

  // Handle close game
  const handleCloseGame = () => {
    setGameStarted(false);
    setIsGameComplete(false);
  };

  // Load high scores for current configuration
  const loadHighScores = async (configId: string) => {
    try {
      const q = query(
        collection(db, 'highScores'),
        where('configId', '==', configId),
        orderBy('score', 'desc'),
        limit(10)
      );
      const querySnapshot = await getDocs(q);
      const scores: HighScoreType[] = [];
      querySnapshot.forEach((doc) => {
        scores.push({ id: doc.id, ...doc.data() } as HighScoreType);
      });
      setHighScores(scores);
    } catch (error) {
      console.error('Error loading high scores:', error);
      setHighScores([]);
      toast({
        title: 'Error Loading High Scores',
        description: 'Could not load high scores. Please try again later.',
        status: 'error',
        duration: 5000,
      });
    }
  };

  // Check if score qualifies for high score
  const checkHighScore = (newScore: number) => {
    if (highScores.length < 10 || newScore > highScores[highScores.length - 1].score) {
      setIsHighScore(true);
      setShowHighScoreModal(true);
    }
  };

  // Save high score
  const saveHighScore = async () => {
    console.log('Attempting to save high score:', {
      playerName: newHighScoreName,
      score,
      configId: gameConfig.id
    });
    
    if (!gameConfig.id) {
      console.error('No game config ID available');
      toast({
        title: 'Error Saving Score',
        description: 'Invalid game configuration.',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      setIsSubmittingScore(true);

      // Validate player name
      const sanitizedName = newHighScoreName.trim();
      if (!sanitizedName || sanitizedName.length < 3 || sanitizedName.length > 12) {
        toast({
          title: 'Invalid Name',
          description: 'Please enter a name between 3 and 12 characters.',
          status: 'error',
          duration: 3000,
        });
        return;
      }

      // Check if name contains only alphanumeric characters and spaces
      if (!/^[A-Za-z0-9\s]+$/.test(sanitizedName)) {
        toast({
          title: 'Invalid Name',
          description: 'Name can only contain letters, numbers, and spaces.',
          status: 'error',
          duration: 3000,
        });
        return;
      }

      // Basic profanity check (case-insensitive)
      const profanityRegex = /\b(ass|fuck|shit|damn|bitch|crap|piss|dick|cock|pussy|whore|slut|bastard)\b/i;
      if (profanityRegex.test(sanitizedName)) {
        toast({
          title: 'Invalid Name',
          description: 'Please choose an appropriate name.',
          status: 'error',
          duration: 3000,
        });
        return;
      }

      // Validate score
      if (score < 0 || score > 1000) {
        toast({
          title: 'Invalid Score',
          description: 'Score is out of valid range.',
          status: 'error',
          duration: 3000,
        });
        return;
      }

      // Check for recent high scores by this player (rate limiting)
      const fiveMinutesAgo = Timestamp.fromMillis(Date.now() - 5 * 60 * 1000);
      
      const recentScoresQuery = query(
        collection(db, 'highScores'),
        where('playerName', '==', sanitizedName),
        where('configId', '==', gameConfig.id),
        where('createdAt', '>', fiveMinutesAgo),
        limit(5)
      );
      
      const recentScoresSnap = await getDocs(recentScoresQuery);
      if (recentScoresSnap.size >= 5) {
        console.log('Rate limit exceeded:', {
          playerName: sanitizedName,
          recentScores: recentScoresSnap.size,
          timeWindow: '5 minutes'
        });
        toast({
          title: 'Too Many Attempts',
          description: 'Please wait a few minutes before submitting another score.',
          status: 'error',
          duration: 3000,
        });
        return;
      }

      // Verify that the game config exists and is valid
      const configRef = doc(db, 'userGameConfigs', gameConfig.id);
      const configSnap = await getDoc(configRef);
      
      if (!configSnap.exists()) {
        console.error('Game configuration not found:', gameConfig.id);
        toast({
          title: 'Error Saving Score',
          description: 'Game configuration not found.',
          status: 'error',
          duration: 3000,
        });
        return;
      }

      const configData = configSnap.data();
      console.log('Game config data:', configData);

      // Verify that the game config is shared
      if (!configData?.share) {
        console.error('Game configuration is not shared:', {
          shared: configData?.share,
          type: configData?.type
        });
        toast({
          title: 'Error Saving Score',
          description: 'High scores are not enabled for this game configuration.',
          status: 'error',
          duration: 3000,
        });
        return;
      }

      // Create high score with minimal required fields
      const highScore = {
        playerName: sanitizedName,
        score: score,
        configId: gameConfig.id,
        createdAt: serverTimestamp(),
        gameType: configData.type  // Include the game type in the high score
      };

      console.log('Saving high score to Firestore:', {
        ...highScore,
        nameValid: /^[A-Za-z0-9\s]+$/.test(sanitizedName),
        lengthValid: sanitizedName.length >= 3 && sanitizedName.length <= 12,
        scoreValid: score >= 0 && score <= 1000,
        configExists: configSnap.exists(),
        configShared: configData?.share
      });

      // Add to Firestore
      const docRef = await addDoc(collection(db, 'highScores'), highScore);
      console.log('Successfully saved high score with ID:', docRef.id);
      
      toast({
        title: 'High Score Saved!',
        description: 'Your score has been recorded.',
        status: 'success',
        duration: 3000,
      });
      
      setShowHighScoreModal(false);
      await loadHighScores(gameConfig.id);
    } catch (error: any) {
      console.error('Error saving high score:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        gameConfigId: gameConfig.id,
        score,
        playerName: newHighScoreName
      });
      
      toast({
        title: 'Error Saving Score',
        description: 'Could not save your high score. Please try again.',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsSubmittingScore(false);
    }
  };

  // Render configuration modal
  const renderConfigModal = () => (
    <Modal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} size={modalSize}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize={{ base: "md", md: "lg" }}>Game Configuration</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <GameConfig 
            isOpen={isConfigModalOpen} 
            onClose={() => setIsConfigModalOpen(false)} 
            onConfigSelect={handleConfigSelect} 
          />
        </ModalBody>
      </ModalContent>
    </Modal>
  );

  // Render high score modal
  const renderHighScoreModal = () => (
    <Modal 
      isOpen={showHighScoreModal} 
      onClose={() => setShowHighScoreModal(false)}
      closeOnOverlayClick={false}
      size="md"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader 
          fontSize={{ base: "lg", md: "xl" }}
          textAlign="center"
          color="blue.600"
          fontFamily="'Comic Neue', sans-serif"
        >
          🎉 New High Score! 🎉
        </ModalHeader>
        <ModalBody>
          <VStack spacing={4} align="center">
            <Text
              fontSize={{ base: "md", md: "lg" }}
              fontWeight="bold"
              color="gray.700"
              fontFamily="'Comic Neue', sans-serif"
            >
              Your Score: {score}
            </Text>
            <FormControl>
              <FormLabel
                fontSize={{ base: "sm", md: "md" }}
                fontFamily="'Comic Neue', sans-serif"
              >
                Enter your nickname (3-12 characters):
              </FormLabel>
              <Input
                value={newHighScoreName}
                onChange={(e) => setNewHighScoreName(e.target.value)}
                placeholder="Your nickname"
                maxLength={12}
                pattern="[A-Za-z0-9]+"
                fontFamily="'Comic Neue', sans-serif"
              />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter justifyContent="center">
          <Button
            colorScheme="blue"
            onClick={saveHighScore}
            isLoading={isSubmittingScore}
            loadingText="Saving..."
            fontFamily="'Comic Neue', sans-serif"
          >
            Save Score
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );

  // Render leaderboard
  const renderLeaderboard = () => (
    <Box
      position="absolute"
      top="50px"
      right="20px"
      width="200px"
      bg="white"
      borderRadius="lg"
      boxShadow="lg"
      p={3}
      zIndex={2}
    >
      <Text
        fontSize="lg"
        fontWeight="bold"
        textAlign="center"
        mb={2}
        color="blue.600"
        fontFamily="'Comic Neue', sans-serif"
      >
        Top Scores
      </Text>
      <VStack spacing={1} align="stretch">
        {highScores.map((hs, index) => (
          <HStack
            key={hs.id}
            justify="space-between"
            bg={index === 0 ? "yellow.50" : "transparent"}
            p={1}
            borderRadius="md"
          >
            <Text
              fontSize="sm"
              color={index < 3 ? "blue.600" : "gray.600"}
              fontWeight={index < 3 ? "bold" : "normal"}
              fontFamily="'Comic Neue', sans-serif"
            >
              {index + 1}. {hs.playerName}
            </Text>
            <Text
              fontSize="sm"
              color={index < 3 ? "blue.600" : "gray.600"}
              fontWeight={index < 3 ? "bold" : "normal"}
              fontFamily="'Comic Neue', sans-serif"
            >
              {hs.score}
            </Text>
          </HStack>
        ))}
      </VStack>
    </Box>
  );

  // Render game UI
  const renderGameUI = () => (
    <Box 
      width="100vw" 
      maxWidth="100%" 
      minHeight="100%" 
      position="relative"
      left="50%"
      transform="translateX(-50%)"
      bg="blue.50"
    >
      <Box
        width="100%"
        maxW="1400px"
        mx="auto"
        px={containerPadding}
        py={4}
      >
        <Box
          ref={gameAreaRef}
          position="relative"
          width="100%"
          height={gameHeight}
          bg="blue.100"
          borderRadius="lg"
          overflow="hidden"
          onMouseMove={handleMouseMove}
          onClick={handleGameAreaClick}
          cursor={isWordSelected ? "pointer" : "default"}
          boxShadow="lg"
        >
          {/* Game area background pattern */}
          <Box
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
            opacity={0.1}
            backgroundImage="radial-gradient(circle at 1px 1px, gray 1px, transparent 0)"
            backgroundSize="40px 40px"
          />
          
          {/* Configuration Title */}
          <Text
            position="absolute"
            top="10px"
            left="50%"
            transform="translateX(-50%)"
            fontSize={{ base: "md", md: "lg" }}
            fontWeight="bold"
            color="gray.700"
            textAlign="center"
            zIndex={3}
            fontFamily="'Comic Neue', sans-serif"
          >
            {gameConfig.title}
          </Text>
          
          {/* Eggs */}
          {eggs.map((egg) => (
            <Box
              key={egg.id}
              position="absolute"
              left={`${egg.position.x}%`}
              top={`${egg.position.y}%`}
              transform="translate(-50%, -50%)"
              width={eggSize}
              height={eggSize}
              zIndex={egg.cracked ? 2 : 1}
            >
              <Egg
                onClick={() => handleEggClick(egg)}
                item={egg.word.text}
                category={egg.word.category}
                cracked={egg.cracked}
                onWordClick={(item, category, e) => handleWordClick({ text: item, category }, e as React.MouseEvent)}
              />
            </Box>
          ))}
          
          {/* Baskets */}
          <Flex
            position="absolute"
            bottom="10px"
            left="0"
            right="0"
            direction={basketStackDirection}
            justify="center"
            align="center"
            px={basketSpacing}
            gap={basketSpacing}
          >
            {baskets.map((basket) => (
              <Box 
                key={basket.id}
                width={basketWidth}
                mb={{ base: 2, md: 0 }}
                flex={{ base: "1", md: "0 1 auto" }}
                className={`basket-${basket.id}`}
              >
                <Basket
                  category={{ name: basket.name }}
                  items={basket.items.map(item => item.text)}
                  onClick={() => {}}
                />
              </Box>
            ))}
          </Flex>
          
          {/* Game controls */}
          <Flex 
            direction={{ base: "column", md: "row" }} 
            justify="space-between" 
            align="center" 
            mt={2}
            gap={2}
            width="100%"
            bg="white"
            p={3}
            borderRadius="lg"
            boxShadow="md"
            fontFamily="'Comic Neue', sans-serif"
          >
            <HStack spacing={4}>
              <Text fontSize={{ base: "sm", md: "md" }}>Player: {playerName}</Text>
              <Text fontSize={{ base: "sm", md: "md" }}>Score: {score}</Text>
            </HStack>
            
            {isGameComplete ? (
              <HStack spacing={4}>
                <Button 
                  colorScheme="blue" 
                  onClick={handleResetGame}
                  size={{ base: "sm", md: "md" }}
                  fontFamily="'Comic Neue', sans-serif"
                >
                  Play Again
                </Button>
                <Button 
                  colorScheme="gray" 
                  onClick={handleCloseGame}
                  size={{ base: "sm", md: "md" }}
                  fontFamily="'Comic Neue', sans-serif"
                >
                  Close Game
                </Button>
              </HStack>
            ) : (
              <Button 
                colorScheme="blue" 
                onClick={() => setIsConfigModalOpen(true)}
                size={{ base: "sm", md: "md" }}
                fontFamily="'Comic Neue', sans-serif"
              >
                Change Configuration
              </Button>
            )}
          </Flex>
          
          {/* Dragged word */}
          {isWordSelected && selectedWord && (
            <Box
              position="absolute"
              left={`${ghostPosition.x}px`}
              top={`${ghostPosition.y}px`}
              transform="translate(-50%, -50%)"
              pointerEvents="none"
              zIndex={1000}
            >
              <Text
                fontSize={{ base: "sm", md: "md" }}
                fontWeight="bold"
                color="gray.700"
                bg="white"
                p={2}
                borderRadius="md"
                boxShadow="lg"
                fontFamily="'Comic Neue', sans-serif"
              >
                {selectedWord.text}
              </Text>
            </Box>
          )}
        </Box>
      </Box>
      {renderLeaderboard()}
      {renderHighScoreModal()}
    </Box>
  );

  // Render start screen
  const renderStartScreen = () => (
    <Box 
      width="100vw" 
      maxWidth="100%" 
      minHeight="100%" 
      position="relative"
      left="50%"
      transform="translateX(-50%)"
      bg="gray.50"
    >
      <Box
        width="100%"
        maxW="1400px"
        mx="auto"
        px={containerPadding}
        py={8}
      >
        <VStack spacing={6} align="center" width="100%">
          <Heading size={headingSize} textAlign="center">Sort Categories Egg Reveal</Heading>
          <Text fontSize={{ base: "sm", md: "md" }} textAlign="center" maxW="600px">
            Find eggs, crack them open, and sort words into the correct categories!
          </Text>
          
          <SimpleGrid 
            columns={{ base: 1, md: 2 }} 
            spacing={4} 
            width="100%" 
            maxW="600px" 
            mt={4}
          >
            <Button
              colorScheme="blue"
              size={{ base: "md", md: "lg" }}
              onClick={() => setIsConfigModalOpen(true)}
              width="100%"
            >
              Start Game
            </Button>
            
            <Button
              variant="outline"
              size={{ base: "md", md: "lg" }}
              onClick={() => setIsConfigModalOpen(true)}
              width="100%"
            >
              Load Saved Configuration
            </Button>
          </SimpleGrid>
        </VStack>
      </Box>
    </Box>
  );

  return (
    <Box width="100vw" maxWidth="100%" overflow="hidden">
      {renderConfigModal()}
      {gameStarted ? renderGameUI() : renderStartScreen()}
    </Box>
  );
};

export default SortCategoriesEggReveal; 