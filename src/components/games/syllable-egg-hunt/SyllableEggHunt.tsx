import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  HStack,
  Grid,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Container,
  useBreakpointValue,
  Flex,
  SimpleGrid,
  ResponsiveValue,
} from '@chakra-ui/react';
import { useCustomToast } from '../../../hooks/useCustomToast';

// Types
interface Word {
  id: string;
  text: string;
  syllables: number;
}

interface Egg {
  id: string;
  word: Word;
  isCracked: boolean;
  position: { x: number; y: number };
}

interface Basket {
  id: string;
  syllableCount: number;
  words: Word[];
}

// Game configuration
const defaultConfig = {
  totalEggs: 10,
  minSyllables: 1,
  maxSyllables: 3,
  difficulty: 'medium',
};

// Sample words with syllable counts
const sampleWords: Word[] = [
  { id: '1', text: 'cat', syllables: 1 },
  { id: '2', text: 'dog', syllables: 1 },
  { id: '3', text: 'rabbit', syllables: 2 },
  { id: '4', text: 'elephant', syllables: 3 },
  { id: '5', text: 'hippopotamus', syllables: 5 },
  { id: '6', text: 'butterfly', syllables: 3 },
  { id: '7', text: 'caterpillar', syllables: 4 },
  { id: '8', text: 'dinosaur', syllables: 3 },
  { id: '9', text: 'octopus', syllables: 3 },
  { id: '10', text: 'penguin', syllables: 2 },
  { id: '11', text: 'giraffe', syllables: 2 },
  { id: '12', text: 'zebra', syllables: 2 },
  { id: '13', text: 'kangaroo', syllables: 3 },
  { id: '14', text: 'koala', syllables: 3 },
  { id: '15', text: 'panda', syllables: 2 },
  { id: '16', text: 'tiger', syllables: 2 },
  { id: '17', text: 'lion', syllables: 2 },
  { id: '18', text: 'monkey', syllables: 2 },
  { id: '19', text: 'bear', syllables: 1 },
  { id: '20', text: 'wolf', syllables: 1 },
];

// SyllableEggHunt component
const SyllableEggHunt: React.FC<{ playerName: string; onGameComplete: (score: number) => void }> = ({
  playerName,
  onGameComplete,
}) => {
  // State
  const [score, setScore] = useState(0);
  const [eggs, setEggs] = useState<Egg[]>([]);
  const [crackedEggs, setCrackedEggs] = useState<string[]>([]);
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [baskets, setBaskets] = useState<Basket[]>([]);
  const [gameConfig, setGameConfig] = useState(defaultConfig);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { showToast } = useCustomToast();

  // Responsive values
  const containerPadding = useBreakpointValue({ base: 2, md: 4, lg: 6 });
  const headingSize = useBreakpointValue({ base: "sm", md: "md", lg: "lg" });
  const gameHeight = useBreakpointValue({ base: "400px", md: "500px", lg: "600px" });
  const basketMinWidth = useBreakpointValue({ base: "100px", md: "120px", lg: "150px" });
  const eggSize = useBreakpointValue({ base: "30px", md: "40px", lg: "50px" });
  const eggHeight = useBreakpointValue({ base: "40px", md: "50px", lg: "60px" });
  const crackedEggMinWidth = useBreakpointValue({ base: "50px", md: "60px", lg: "70px" });
  const basketStackDirection = useBreakpointValue({ base: "column", md: "row" }) as ResponsiveValue<"column" | "row">;

  // Initialize game
  useEffect(() => {
    if (gameStarted && !gameCompleted) {
      initializeGame();
    }
  }, [gameStarted, gameConfig]);

  // Check if game is complete
  useEffect(() => {
    if (gameStarted && crackedEggs.length === eggs.length && eggs.length > 0) {
      const allWordsSorted = baskets.every(basket => 
        basket.words.length === eggs.filter(egg => egg.word.syllables === basket.syllableCount).length
      );
      
      if (allWordsSorted) {
        setGameCompleted(true);
        const finalScore = calculateScore();
        onGameComplete(finalScore);
        showToast({
          title: 'Congratulations!',
          description: `You completed the game with a score of ${finalScore}!`,
          status: 'success',
          duration: 5000,
        });
      }
    }
  }, [crackedEggs, baskets, eggs, gameStarted]);

  // Initialize game
  const initializeGame = () => {
    // Create baskets based on syllable range
    const newBaskets: Basket[] = [];
    for (let i = gameConfig.minSyllables; i <= gameConfig.maxSyllables; i++) {
      newBaskets.push({
        id: `basket-${i}`,
        syllableCount: i,
        words: [],
      });
    }
    setBaskets(newBaskets);

    // Select random words for eggs
    const selectedWords = [...sampleWords]
      .sort(() => 0.5 - Math.random())
      .slice(0, gameConfig.totalEggs)
      .filter(word => 
        word.syllables >= gameConfig.minSyllables && 
        word.syllables <= gameConfig.maxSyllables
      );

    // Create eggs with random positions
    const newEggs: Egg[] = selectedWords.map((word, index) => ({
      id: `egg-${index}`,
      word,
      isCracked: false,
      position: {
        x: Math.random() * 80 + 10, // 10-90%
        y: Math.random() * 60 + 20, // 20-80%
      },
    }));

    setEggs(newEggs);
    setCrackedEggs([]);
    setSelectedWord(null);
    setScore(0);
  };

  // Handle egg click
  const handleEggClick = (eggId: string) => {
    if (crackedEggs.includes(eggId)) return;

    const egg = eggs.find(e => e.id === eggId);
    if (!egg) return;

    setSelectedWord(egg.word);
    setCrackedEggs([...crackedEggs, eggId]);
    
    showToast({
      title: 'Egg Cracked!',
      description: `You found the word: ${egg.word.text}`,
      status: 'info',
      duration: 3000,
    });
  };

  // Handle basket click
  const handleBasketClick = (basketId: string) => {
    if (!selectedWord) return;

    const basket = baskets.find(b => b.id === basketId);
    if (!basket) return;

    if (basket.syllableCount === selectedWord.syllables) {
      // Correct basket
      const updatedBaskets = baskets.map(b => {
        if (b.id === basketId) {
          return {
            ...b,
            words: [...b.words, selectedWord],
          };
        }
        return b;
      });
      setBaskets(updatedBaskets);
      setSelectedWord(null);
      setScore(score + 10);
      
      showToast({
        title: 'Correct!',
        description: `${selectedWord.text} has ${selectedWord.syllables} syllable(s)!`,
        status: 'success',
        duration: 2000,
      });
    } else {
      // Incorrect basket
      setScore(Math.max(0, score - 5));
      
      showToast({
        title: 'Incorrect!',
        description: `${selectedWord.text} does not have ${basket.syllableCount} syllable(s).`,
        status: 'error',
        duration: 2000,
      });
    }
  };

  // Calculate final score
  const calculateScore = () => {
    const baseScore = score;
    const timeBonus = Math.floor(Math.random() * 50); // Simulated time bonus
    return baseScore + timeBonus;
  };

  // Start game
  const startGame = () => {
    setGameStarted(true);
    onClose();
  };

  // Reset game
  const resetGame = () => {
    setGameStarted(false);
    setGameCompleted(false);
    setEggs([]);
    setCrackedEggs([]);
    setBaskets([]);
    setSelectedWord(null);
    setScore(0);
  };

  // Render game config modal
  const renderConfigModal = () => (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Game Configuration</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>Difficulty</FormLabel>
              <Select
                value={gameConfig.difficulty}
                onChange={(e) => setGameConfig({
                  ...gameConfig,
                  difficulty: e.target.value,
                })}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </Select>
            </FormControl>
            
            <FormControl>
              <FormLabel>Number of Eggs</FormLabel>
              <NumberInput
                min={5}
                max={20}
                value={gameConfig.totalEggs}
                onChange={(_, value) => setGameConfig({
                  ...gameConfig,
                  totalEggs: value,
                })}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
            
            <FormControl>
              <FormLabel>Syllable Range</FormLabel>
              <HStack>
                <NumberInput
                  min={1}
                  max={gameConfig.maxSyllables}
                  value={gameConfig.minSyllables}
                  onChange={(_, value) => setGameConfig({
                    ...gameConfig,
                    minSyllables: value,
                  })}
                >
                  <NumberInputField placeholder="Min" />
                </NumberInput>
                <Text>to</Text>
                <NumberInput
                  min={gameConfig.minSyllables}
                  max={5}
                  value={gameConfig.maxSyllables}
                  onChange={(_, value) => setGameConfig({
                    ...gameConfig,
                    maxSyllables: value,
                  })}
                >
                  <NumberInputField placeholder="Max" />
                </NumberInput>
              </HStack>
            </FormControl>
            
            <Button colorScheme="blue" onClick={startGame} width="100%">
              Start Game
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );

  // Render game
  const renderGame = () => (
    <Container maxW="container.xl" p={containerPadding}>
      <Box position="relative" height={gameHeight} borderWidth="1px" borderRadius="lg" p={4}>
        <VStack spacing={4} align="stretch" height="100%">
          <Flex 
            direction={{ base: "column", md: "row" }} 
            justify="space-between" 
            align={{ base: "center", md: "center" }}
            gap={2}
          >
            <Heading size={headingSize}>Syllable Egg Hunt</Heading>
            <HStack spacing={4}>
              <Text fontSize={{ base: "sm", md: "md" }}>Player: {playerName}</Text>
              <Text fontSize={{ base: "sm", md: "md" }}>Score: {score}</Text>
            </HStack>
          </Flex>
          
          <Box position="relative" flex="1" borderWidth="1px" borderRadius="md" overflow="hidden">
            {/* Eggs */}
            {eggs.map((egg) => (
              <Box
                key={egg.id}
                position="absolute"
                left={`${egg.position.x}%`}
                top={`${egg.position.y}%`}
                transform="translate(-50%, -50%)"
                cursor="pointer"
                onClick={() => handleEggClick(egg.id)}
                zIndex={crackedEggs.includes(egg.id) ? 1 : 2}
              >
                {crackedEggs.includes(egg.id) ? (
                  <Box
                    p={2}
                    bg="yellow.100"
                    borderRadius="full"
                    borderWidth="2px"
                    borderColor="yellow.400"
                    textAlign="center"
                    minWidth={crackedEggMinWidth}
                  >
                    <Text fontWeight="bold" fontSize={{ base: "xs", md: "sm", lg: "md" }}>{egg.word.text}</Text>
                  </Box>
                ) : (
                  <Box
                    w={eggSize}
                    h={eggHeight}
                    bg="white"
                    borderRadius="full"
                    borderWidth="2px"
                    borderColor="gray.300"
                    boxShadow="md"
                  />
                )}
              </Box>
            ))}
          </Box>
          
          {/* Baskets */}
          <Flex 
            direction={basketStackDirection} 
            justify="center" 
            mt={4}
            gap={3}
            flexWrap="wrap"
          >
            {baskets.map((basket) => (
              <Box
                key={basket.id}
                p={3}
                borderWidth="2px"
                borderColor={selectedWord && selectedWord.syllables === basket.syllableCount ? "green.500" : "gray.300"}
                borderRadius="lg"
                cursor="pointer"
                onClick={() => handleBasketClick(basket.id)}
                minWidth={basketMinWidth}
                textAlign="center"
                flex="1"
                maxW={{ base: "100%", md: "150px" }}
              >
                <Text fontWeight="bold" fontSize={{ base: "sm", md: "md" }}>
                  {basket.syllableCount} {basket.syllableCount === 1 ? 'Syllable' : 'Syllables'}
                </Text>
                <Box mt={2} minHeight="60px">
                  {basket.words.map((word) => (
                    <Text key={word.id} fontSize={{ base: "xs", md: "sm" }}>{word.text}</Text>
                  ))}
                </Box>
              </Box>
            ))}
          </Flex>
          
          <Button 
            colorScheme="blue" 
            onClick={resetGame} 
            size={{ base: "sm", md: "md" }}
          >
            Reset Game
          </Button>
        </VStack>
      </Box>
    </Container>
  );

  // Render start screen
  const renderStartScreen = () => (
    <VStack spacing={6} align="center" justify="center" height="600px">
      <Heading>Syllable Egg Hunt</Heading>
      <Text>Welcome, {playerName}!</Text>
      <Text>Find eggs, crack them open, and sort the words by their syllable count.</Text>
      <Button colorScheme="blue" onClick={onOpen}>
        Start Game
      </Button>
    </VStack>
  );

  return (
    <Box>
      {renderConfigModal()}
      {!gameStarted ? renderStartScreen() : renderGame()}
    </Box>
  );
};

export default SyllableEggHunt; 