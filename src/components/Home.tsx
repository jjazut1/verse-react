import React, { useState, useEffect } from 'react';
import { Box, Button, Container, Heading, Stack, Text, useToast } from '@chakra-ui/react';
import { collection, getDocs, Timestamp, FieldValue } from 'firebase/firestore';
import { db } from '../config/firebase';
import WhackAMole from './games/whack-a-mole/WhackAMole';
import SortCategoriesEggReveal from './games/sort-categories-egg-reveal/SortCategoriesEggRevealAdapter';
import { GameConfig } from '../types/game';

export const Home: React.FC = () => {
  const [gameConfigs, setGameConfigs] = useState<GameConfig[]>([]);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>('Player');
  const toast = useToast();

  useEffect(() => {
    const fetchGameConfigs = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'userGameConfigs'));
        const configs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as GameConfig[];
        setGameConfigs(configs);
      } catch (error) {
        console.error('Error fetching game configs:', error);
        toast({
          title: 'Error',
          description: 'Failed to load game configurations',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    };

    fetchGameConfigs();
  }, [toast]);

  const handleGameComplete = (score: number) => {
    console.log(`Game completed with score: ${score}`);
    setSelectedGame(null);
  };

  const renderSelectedGame = () => {
    const selectedConfig = gameConfigs.find(config => config.id === selectedGame);
    
    if (!selectedConfig) {
      return null;
    }

    switch (selectedConfig.type) {
      case 'whack-a-mole':
        return (
          <WhackAMole
            playerName={playerName}
            onGameComplete={handleGameComplete}
            config={selectedConfig}
          />
        );
      case 'sort-categories-egg':
        return (
          <SortCategoriesEggReveal
            playerName={playerName}
            onGameComplete={handleGameComplete}
            config={selectedConfig}
          />
        );
      default:
        return (
          <Text>Unknown game type</Text>
        );
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <Box textAlign="center" mb={8}>
        <Heading as="h1" size="2xl" mb={4}>
          Welcome to Verse Games!
        </Heading>
        <Text fontSize="xl">Choose a game to begin:</Text>
      </Box>

      {!selectedGame ? (
        <Stack spacing={4}>
          {gameConfigs.map((config) => (
            <Button
              key={config.id}
              size="lg"
              width="100%"
              onClick={() => setSelectedGame(config.id || null)}
            >
              {config.title} - {config.difficulty}
            </Button>
          ))}
        </Stack>
      ) : (
        <Box>
          {renderSelectedGame()}
        </Box>
      )}
    </Container>
  );
}; 