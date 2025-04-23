import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Center, Spinner, Text } from '@chakra-ui/react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import SortCategoriesEggRevealAdapter from './games/sort-categories-egg-reveal/SortCategoriesEggRevealAdapter';
import WhackAMole from './games/whack-a-mole/WhackAMole';
import { useCustomToast } from '../hooks/useCustomToast';
import { GameConfig } from '../types/game';

const GamePlayer = () => {
  const { configId } = useParams();
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useCustomToast();

  useEffect(() => {
    const loadGameConfig = async () => {
      if (!configId) {
        showToast({
          title: 'Configuration ID missing',
          description: 'No game configuration ID was provided.',
          status: 'error',
          duration: 3000,
        });
        setIsLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'userGameConfigs', configId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const config = { id: docSnap.id, ...docSnap.data() } as GameConfig;
          setGameConfig(config);
        } else {
          showToast({
            title: 'Configuration not found',
            description: 'The game configuration could not be found.',
            status: 'error',
            duration: 3000,
          });
        }
      } catch (error) {
        console.error('Error loading game configuration:', error);
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

    loadGameConfig();
  }, [configId, showToast]);

  const handleGameComplete = (score: number) => {
    showToast({
      title: 'Game Complete!',
      description: `You scored ${score} points!`,
      status: 'success',
      duration: 5000,
    });
  };

  if (isLoading) {
    return (
      <Container maxW="container.xl" centerContent>
        <Center p={8}>
          <Spinner size="xl" />
        </Center>
      </Container>
    );
  }

  if (!gameConfig) {
    return null;
  }

  const renderGame = () => {
    switch (gameConfig.type) {
      case 'whack-a-mole':
        return (
          <WhackAMole
            playerName="Player"
            onGameComplete={handleGameComplete}
            config={gameConfig}
          />
        );
      case 'sort-categories-egg':
        return (
          <SortCategoriesEggRevealAdapter
            playerName="Player"
            onGameComplete={handleGameComplete}
            config={gameConfig}
          />
        );
      default:
        const _exhaustiveCheck: never = gameConfig;
        return (
          <Text>Invalid game configuration type: {(gameConfig as any).type}</Text>
        );
    }
  };

  return (
    <Container maxW="container.xl" p={4}>
      {renderGame()}
    </Container>
  );
};

export default GamePlayer; 