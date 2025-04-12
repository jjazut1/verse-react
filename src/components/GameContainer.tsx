import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Box, 
  Heading, 
  Container,
  useBreakpointValue,
  Spinner,
  Center,
  Text,
  Image,
  SimpleGrid
} from '@chakra-ui/react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import MathQuiz from './games/MathQuiz';
import SyllableEggHuntAdapter from './games/syllable-egg-hunt/SyllableEggHuntAdapter';
import SortCategoriesEggRevealAdapter from './games/sort-categories-egg-reveal/SortCategoriesEggRevealAdapter';
import { useCustomToast, ToastComponent } from '../hooks/useCustomToast';
import { GameConfig as BaseGameConfig } from '../types/game';

interface GameConfig extends Omit<BaseGameConfig, 'eggQty' | 'categories'> {
  id?: string;
  title: string;
  type: string;
  eggQty: number;
  categories: {
    name: string;
    items: string[];
  }[];
  share: boolean;
  email?: string;
}

interface Game {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  component: React.ComponentType<{ 
    playerName: string; 
    onGameComplete: (score: number) => void; 
    config: GameConfig;
  }>;
}

const games: Game[] = [
  {
    id: 'math-quiz',
    title: 'Math Quiz',
    description: 'Test your math skills with this interactive quiz!',
    thumbnail: 'https://placehold.co/300x200?text=Math+Quiz',
    component: MathQuiz as Game['component']
  },
  {
    id: 'syllable-egg-hunt',
    title: 'Syllable Egg Hunt',
    description: 'Crack eggs to reveal words and sort them by syllable count!',
    thumbnail: 'https://placehold.co/300x200?text=Syllable+Egg+Hunt',
    component: SyllableEggHuntAdapter as Game['component']
  },
  {
    id: 'sort-categories-egg-reveal',
    title: 'Sort Categories Egg Reveal',
    description: 'Crack eggs to reveal words and sort them into categories!',
    thumbnail: 'https://placehold.co/300x200?text=Sort+Categories+Egg+Reveal',
    component: SortCategoriesEggRevealAdapter as Game['component']
  }
];

interface GameContainerProps {
  initialGameId?: string | null;
  initialConfigId?: string | null;
}

const GameContainer: React.FC<GameContainerProps> = ({ initialGameId, initialConfigId }) => {
  const { gameId, configId } = useParams<{ gameId: string; configId: string }>();
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<GameConfig | null>(null);
  const [playerName] = useState('Player');
  const [isLoading, setIsLoading] = useState(false);
  const { toastMessage, showToast } = useCustomToast();
  
  // Responsive values
  const containerPadding = useBreakpointValue({ base: 4, md: 6, lg: 8 });
  const headingSize = useBreakpointValue({ base: "md", md: "lg", lg: "xl" });
  const stackSpacing = useBreakpointValue({ base: 4, md: 6, lg: 8 });
  const gridColumns = useBreakpointValue({ base: 1, sm: 2, md: 3 });

  useEffect(() => {
    const initializeGame = async () => {
      const effectiveGameId = gameId || initialGameId;
      const effectiveConfigId = configId || initialConfigId;

      console.log('Initializing game with:', { effectiveGameId, effectiveConfigId });

      if (effectiveGameId && effectiveConfigId) {
        // Find the game from our games array
        const game = games.find(g => g.id === effectiveGameId);
        console.log('Found game:', game);
        
        if (game) {
          setSelectedGame(game);
          await loadConfigs(effectiveConfigId);
        } else {
          console.error('Game not found for ID:', effectiveGameId);
          showToast({
            title: 'Game not found',
            description: `No game found with ID: ${effectiveGameId}`,
            status: 'error',
            duration: 3000,
          });
        }
      }
    };

    initializeGame();
  }, [gameId, configId, initialGameId, initialConfigId]);

  const loadConfigs = async (configId: string) => {
    try {
      setIsLoading(true);
      console.log('Loading config:', configId);
      
      const docRef = doc(db, 'userGameConfigs', configId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const config = { id: docSnap.id, ...docSnap.data() } as GameConfig;
        console.log('Loaded config:', config);
        setSelectedConfig(config);
      } else {
        console.error('Config not found:', configId);
        showToast({
          title: 'Configuration not found',
          description: 'The game configuration could not be found.',
          status: 'error',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      showToast({
        title: 'Error loading configuration',
        description: 'There was an error loading the game configuration.',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGameComplete = (score: number) => {
    showToast({
      title: 'Game Complete!',
      description: `You scored ${score} points!`,
      status: 'success',
      duration: 5000,
    });
  };

  // Render game if both game and config are loaded
  if (selectedGame && selectedConfig) {
    const GameComponent = selectedGame.component;
    return (
      <Container maxW="container.xl" p={containerPadding} width="100%">
        <Box width="100%">
          <GameComponent 
            playerName={playerName} 
            onGameComplete={handleGameComplete}
            config={selectedConfig}
          />
        </Box>
      </Container>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <Container maxW="container.xl" p={containerPadding}>
        <Center p={4}>
          <Spinner />
        </Center>
      </Container>
    );
  }

  // Show game selection if no game is selected
  return (
    <Container maxW="container.xl" p={containerPadding}>
      <ToastComponent toastMessage={toastMessage} />
      <Heading size={headingSize} mb={stackSpacing} textAlign="center">
        Select a Game
      </Heading>
      <SimpleGrid columns={gridColumns} spacing={6}>
        {games.map((game) => (
          <Box
            key={game.id}
            borderWidth="1px"
            borderRadius="lg"
            overflow="hidden"
            cursor="pointer"
            _hover={{ shadow: "md", transform: "translateY(-4px)", transition: "all 0.3s" }}
            transition="all 0.3s"
          >
            <Box 
              position="relative" 
              paddingTop="56.25%" // 16:9 aspect ratio
            >
              <Image 
                src={game.thumbnail} 
                alt={game.title}
                position="absolute"
                top="0"
                left="0"
                w="100%"
                h="100%"
                objectFit="cover"
              />
            </Box>
            <Box p={4}>
              <Heading size="md" mb={2}>{game.title}</Heading>
              <Text fontSize={{ base: "sm", md: "md" }}>{game.description}</Text>
            </Box>
          </Box>
        ))}
      </SimpleGrid>
    </Container>
  );
};

export default GameContainer; 