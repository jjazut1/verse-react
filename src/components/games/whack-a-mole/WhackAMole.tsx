import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Text,
  VStack,
  HStack,
  Button,
  useToast,
  Heading,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  FormHelperText,
  Center
} from '@chakra-ui/react';
import { collection, addDoc, getDocs, query, where, orderBy, limit, serverTimestamp, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import Scene from './Scene';
import { WhackAMoleConfig } from '../../../types/game';
import { sanitizeName, isValidPlayerName } from '../../../utils/profanityFilter';

interface WhackAMoleProps {
  playerName: string;
  onGameComplete: (score: number) => void;
  config: WhackAMoleConfig;
}

interface HighScore {
  id?: string;
  playerName: string;
  score: number;
  configId: string;
  createdAt: Timestamp | Date;
  gameType?: string;
}

const WhackAMole: React.FC<WhackAMoleProps> = ({
  playerName,
  onGameComplete,
  config,
}) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.gameTime);
  const [gameStarted, setGameStarted] = useState(false);
  const [consecutiveHits, setConsecutiveHits] = useState(0);
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [isHighScore, setIsHighScore] = useState(false);
  const [showHighScoreModal, setShowHighScoreModal] = useState(false);
  const [newHighScoreName, setNewHighScoreName] = useState(playerName || "");
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [countdown, setCountdown] = useState(0); // Countdown timer state
  const [showCountdown, setShowCountdown] = useState(false); // Whether to show countdown UI

  const toast = useToast();
  const sceneRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout>();
  const countdownTimerRef = useRef<NodeJS.Timeout>(); // Ref for countdown timer

  // Load high scores
  useEffect(() => {
    loadHighScores();
  }, [config.id]);

  const loadHighScores = async () => {
    if (!config.id) return;

    try {
      const q = query(
        collection(db, 'highScores'),
        where('configId', '==', config.id),
        orderBy('score', 'desc'),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const scores: HighScore[] = [];
      snapshot.forEach(doc => {
        scores.push({
          id: doc.id,
          ...doc.data()
        } as HighScore);
      });
      setHighScores(scores);
    } catch (error) {
      console.error('Error loading high scores:', error);
    }
  };

  // Game timer
  useEffect(() => {
    if (gameStarted && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [gameStarted, timeLeft]);

  // Countdown timer effect
  useEffect(() => {
    if (showCountdown && countdown > 0) {
      countdownTimerRef.current = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      
      return () => {
        if (countdownTimerRef.current) {
          clearTimeout(countdownTimerRef.current);
        }
      };
    } else if (showCountdown && countdown === 0) {
      // When countdown reaches 0, start the actual game
      setShowCountdown(false);
      setGameStarted(true);
    }
  }, [showCountdown, countdown]);

  // Add Comic Neue font from Google Fonts
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Comic+Neue:wght@400;700&display=swap';
    document.head.appendChild(link);
    
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const startCountdown = () => {
    setScore(0);
    setTimeLeft(config.gameTime);
    setGameOver(false);
    setConsecutiveHits(0);
    setCountdown(3); // Set initial countdown to 3
    setShowCountdown(true); // Show countdown UI
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(config.gameTime);
    setGameStarted(true);
    setGameOver(false);
    setConsecutiveHits(0);
  };

  const endGame = () => {
    setGameOver(true);
    setGameStarted(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (sceneRef.current) {
      sceneRef.current.reset();
    }
    onGameComplete(score);
    
    // Check if this is a high score
    checkHighScore(score);
  };

  // Check if score qualifies for high score
  const checkHighScore = (newScore: number) => {
    if (!config.share) return; // Only check for shared configs
    
    if (highScores.length < 10 || newScore > (highScores[highScores.length - 1]?.score || 0)) {
      setIsHighScore(true);
      setShowHighScoreModal(true);
    }
  };

  // Save high score to Firestore
  const saveHighScore = async () => {
    if (!config.id) {
      toast({
        title: 'Error',
        description: 'Cannot save high score: missing game configuration ID',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setIsSubmittingScore(true);

    try {
      // Validate player name
      const sanitizedName = sanitizeName(newHighScoreName.trim());
      
      if (!isValidPlayerName(sanitizedName)) {
        toast({
          title: 'Invalid Name',
          description: 'Please enter a valid name (3-12 alphanumeric characters).',
          status: 'warning',
          duration: 3000,
        });
        setIsSubmittingScore(false);
        return;
      }

      // Check for rate limiting (5 scores per 5 minutes)
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
      
      const recentScoresQuery = query(
        collection(db, 'highScores'),
        where('playerName', '==', sanitizedName),
        where('configId', '==', config.id),
        where('createdAt', '>', fiveMinutesAgo),
        limit(5)
      );
      
      const recentScoresSnap = await getDocs(recentScoresQuery);
      if (recentScoresSnap.size >= 5) {
        toast({
          title: 'Too Many Attempts',
          description: 'Please wait a few minutes before submitting another score.',
          status: 'error',
          duration: 3000,
        });
        setIsSubmittingScore(false);
        return;
      }

      // Verify that the game config exists and is valid
      const configRef = doc(db, 'userGameConfigs', config.id);
      const configSnap = await getDoc(configRef);
      
      if (!configSnap.exists()) {
        toast({
          title: 'Error Saving Score',
          description: 'Game configuration not found.',
          status: 'error',
          duration: 3000,
        });
        setIsSubmittingScore(false);
        return;
      }

      const configData = configSnap.data();

      // Verify that the game config is shared
      if (!configData?.share) {
        toast({
          title: 'Error Saving Score',
          description: 'High scores are not enabled for this game configuration.',
          status: 'error',
          duration: 3000,
        });
        setIsSubmittingScore(false);
        return;
      }

      // Create high score with required fields
      const highScore = {
        playerName: sanitizedName,
        score: score,
        configId: config.id,
        createdAt: serverTimestamp(),
        gameType: 'whack-a-mole'
      };

      // Add to Firestore
      await addDoc(collection(db, 'highScores'), highScore);
      
      toast({
        title: 'High Score Saved!',
        description: 'Your score has been recorded.',
        status: 'success',
        duration: 3000,
      });
      
      setShowHighScoreModal(false);
      loadHighScores();
    } catch (error: any) {
      console.error('Error saving high score:', error);
      
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

  const handleMoleHit = (word: string, isCorrect: boolean) => {
    if (!gameStarted || gameOver) return;

    if (isCorrect) {
      // Calculate points including bonus if applicable
      const newConsecutiveHits = consecutiveHits + 1;
      let points = config.pointsPerHit;
      
      if (newConsecutiveHits >= config.bonusThreshold) {
        points += config.bonusPoints;
        toast({
          title: 'Bonus!',
          description: `+${config.bonusPoints} bonus points!`,
          status: 'success',
          duration: 1000,
        });
      }

      setScore(prev => prev + points);
      setConsecutiveHits(newConsecutiveHits);
    } else {
      // Apply penalty
      setScore(prev => Math.max(0, prev - config.penaltyPoints));
      setConsecutiveHits(0);
      toast({
        title: 'Oops!',
        description: `Wrong word! "${word}" -${config.penaltyPoints} points`,
        status: 'error',
        duration: 1000,
      });
    }
  };

  return (
    <Box width="100%" height="100vh" position="relative">
      {/* Game UI */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        zIndex={1}
        p={4}
        display="flex"
        justifyContent="space-between"
      >
        {/* Title Display */}
        <Box 
          bg="transparent" 
          p={4} 
          borderRadius="md"
          maxWidth="400px"
        >
          <Text 
            fontSize="2xl" 
            fontWeight="bold" 
            color="#001f3f" 
            fontFamily="'Comic Neue', cursive" 
            textShadow="1px 1px 2px rgba(255,255,255,0.8)"
            isTruncated
          >
            {config.title}
          </Text>
        </Box>

        {/* Score and Timer */}
        <HStack 
          justify="space-between" 
          bg="transparent" 
          p={4} 
          borderRadius="md"
          width="300px"
        >
          <Text fontSize="2xl" fontWeight="bold" color="#001f3f" fontFamily="'Comic Neue', cursive" textShadow="1px 1px 2px rgba(255,255,255,0.8)">Score: {score}</Text>
          <Text fontSize="2xl" fontWeight="bold" color="#001f3f" fontFamily="'Comic Neue', cursive" textShadow="1px 1px 2px rgba(255,255,255,0.8)">Time: {timeLeft}s</Text>
        </HStack>
      </Box>

      {/* Game Scene */}
      <Box position="absolute" top={0} left={0} right={0} bottom={0}>
        <Scene
          ref={sceneRef}
          gameActive={gameStarted && !gameOver}
          onMoleHit={handleMoleHit}
          config={config}
        />
      </Box>

      {/* Countdown Overlay */}
      {showCountdown && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="rgba(0, 0, 0, 0.3)"
          zIndex={5}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Center 
            p={8} 
            bg="white" 
            borderRadius="full" 
            boxShadow="0px 0px 20px rgba(0, 31, 63, 0.4)"
            w="150px"
            h="150px"
          >
            <Text 
              fontSize="7xl" 
              fontWeight="bold" 
              fontFamily="'Comic Neue', cursive" 
              color="#001f3f"
              animation="pulse 1s infinite"
            >
              {countdown}
            </Text>
          </Center>
        </Box>
      )}

      {/* Leaderboard - only show if config.share is true and game is not active */}
      {config.share && !gameStarted && !showCountdown && (
        <Box
          position="absolute"
          top="70px"
          right="20px"
          width="200px"
          bg="white"
          borderRadius="lg"
          p={3}
          zIndex={2}
          boxShadow="0 4px 6px rgba(0, 0, 0, 0.1)"
        >
          <Text
            fontSize="lg"
            fontWeight="bold"
            textAlign="center"
            mb={2}
            color="#001f3f"  // Dark navy color
            fontFamily="'Comic Neue', cursive"
          >
            Top Scores
          </Text>
          {highScores.length > 0 ? (
            <VStack spacing={1} align="stretch">
              {highScores.map((hs, index) => (
                <HStack
                  key={hs.id}
                  justify="space-between"
                  bg={index === 0 ? "rgba(0, 31, 63, 0.1)" : "transparent"}  // Light navy for top score
                  p={1}
                  borderRadius="md"
                >
                  <Text
                    fontSize="sm"
                    color="#001f3f"  // Dark navy color
                    fontWeight={index < 3 ? "bold" : "normal"}
                    fontFamily="'Comic Neue', cursive"
                  >
                    {index + 1}. {hs.playerName}
                  </Text>
                  <Text
                    fontSize="sm"
                    color="#001f3f"  // Dark navy color
                    fontWeight={index < 3 ? "bold" : "normal"}
                    fontFamily="'Comic Neue', cursive"
                  >
                    {hs.score}
                  </Text>
                </HStack>
              ))}
            </VStack>
          ) : (
            <Text 
              fontSize="sm" 
              color="#001f3f"  // Dark navy color
              textAlign="center"
              fontFamily="'Comic Neue', cursive"
            >
              No high scores yet!
            </Text>
          )}
        </Box>
      )}

      {/* Game Controls */}
      {(!gameStarted && !showCountdown || gameOver) && (
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          zIndex={2}
          bg="white"
          p={6}
          borderRadius="md"
          boxShadow="xl"
          textAlign="center"
          fontFamily="'Comic Neue', cursive"
        >
          <VStack spacing={4}>
            <Heading size="lg" fontFamily="'Comic Neue', cursive">
              {gameOver ? 'Game Over!' : 'Whack-a-Mole'}
            </Heading>
            {!gameOver && (
              <VStack spacing={2}>
                {config.instructions ? (
                  <Text fontFamily="'Comic Neue', cursive">{config.instructions}</Text>
                ) : (
                  <>
                    <Text fontFamily="'Comic Neue', cursive">Select moles displaying words from {config.categories[0].title}!</Text>
                    <Text fontSize="sm" color="gray.600" fontFamily="'Comic Neue', cursive">
                      Words from {config.categories[0].title} will earn you points.
                      Other words will result in a penalty.
                    </Text>
                  </>
                )}
              </VStack>
            )}
            {gameOver && (
              <Text fontSize="xl" fontFamily="'Comic Neue', cursive">Final Score: {score}</Text>
            )}
            <Button
              colorScheme="blue"
              size="lg"
              onClick={startCountdown}
              fontFamily="'Comic Neue', cursive"
              fontWeight="bold"
            >
              {gameOver ? 'Play Again' : 'Start Game'}
            </Button>
          </VStack>
        </Box>
      )}

      {/* High Score Modal */}
      <Modal isOpen={showHighScoreModal} onClose={() => setShowHighScoreModal(false)}>
        <ModalOverlay />
        <ModalContent fontFamily="'Comic Neue', cursive">
          <ModalHeader fontFamily="'Comic Neue', cursive" fontWeight="bold">New High Score!</ModalHeader>
          <ModalBody>
            <Text mb={4} fontFamily="'Comic Neue', cursive">Congratulations! You scored {score} points.</Text>
            <FormControl>
              <FormLabel fontFamily="'Comic Neue', cursive">Enter your name:</FormLabel>
              <Input 
                value={newHighScoreName} 
                onChange={(e) => setNewHighScoreName(e.target.value)}
                placeholder="Your name"
                maxLength={12}
                fontFamily="'Comic Neue', cursive"
              />
              <FormHelperText fontFamily="'Comic Neue', cursive">
                3-12 characters, alphanumeric only
              </FormHelperText>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button 
              colorScheme="blue" 
              mr={3} 
              onClick={saveHighScore}
              isLoading={isSubmittingScore}
              isDisabled={!isValidPlayerName(sanitizeName(newHighScoreName))}
              fontFamily="'Comic Neue', cursive"
              fontWeight="bold"
            >
              Save Score
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setShowHighScoreModal(false)}
              fontFamily="'Comic Neue', cursive"
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add pulse animation for countdown */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
          }
        `
      }} />
    </Box>
  );
};

export default WhackAMole; 