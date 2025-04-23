import { useState, useEffect } from 'react';
import {
  VStack,
  Select,
  Button,
  FormControl,
  FormLabel,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Switch,
  useToast,
  Box,
  Heading,
  Text,
  Divider,
  Textarea,
} from '@chakra-ui/react';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../../../config/firebase';
import { serverTimestamp } from 'firebase/firestore';

interface GameConfigProps {
  onConfigSelect: (config: any) => void;
}

interface WordCategory {
  title: string;
  words: string[];
}

const DEFAULT_WORD_CATEGORIES: { [key: string]: WordCategory } = {
  short_a: {
    title: "Short 'a' Words",
    words: ['had', 'ran', 'and', 'man', 'can', 'at', 'am', 'an', 'last', 'past', 'fast', 'ask', 'land', 'hand', 'stand']
  },
  short_e: {
    title: "Short 'e' Words",
    words: ['men', 'set', 'let', 'get', 'red', 'end', 'yet', 'yes', 'met', 'ten', 'bed', 'went', 'send', 'sent', 'left']
  },
  short_i: {
    title: "Short 'i' Words",
    words: ['sit', 'him', 'hid', 'did', 'six', 'fix', 'in', 'if', 'it', 'trip', 'milk']
  },
  short_o: {
    title: "Short 'o' Words",
    words: ['top', 'got', 'box', 'not', 'on', 'dog', 'lot', 'drop', 'spot', 'hot', 'stop', 'lost', 'soft', 'from']
  },
  short_u: {
    title: "Short 'u' Words",
    words: ['bug', 'run', 'fun', 'sun', 'cut', 'but', 'up', 'must', 'jump', 'just']
  },
  sh_words: {
    title: "Words with 'sh'",
    words: ['ship', 'shop', 'shut', 'wish', 'dish', 'fish', 'rush']
  },
  ch_words: {
    title: "Words with 'ch'",
    words: ['such', 'much', 'lunch', 'chum', 'chip', 'chap', 'bunch', 'hunch', 'munch', 'punch']
  },
  th_words: {
    title: "Words with 'th'",
    words: ['that', 'than', 'with', 'them', 'then', 'thin', 'thing', 'thank', 'the', 'this']
  },
  wh_words: {
    title: "Words with 'wh'",
    words: ['when', 'which', 'whiz', 'whim', 'whip']
  }
};

const GameConfig: React.FC<GameConfigProps> = ({ onConfigSelect }) => {
  const [title, setTitle] = useState('');
  const [timeLimit, setTimeLimit] = useState(30);
  const [wordList, setWordList] = useState<string[]>([]);
  const [gameCategory, setGameCategory] = useState('');
  const [shareConfig, setShareConfig] = useState(false);
  const [savedConfigs, setSavedConfigs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [customWords, setCustomWords] = useState('');
  const toast = useToast();

  useEffect(() => {
    loadSavedConfigs();
  }, []);

  const loadSavedConfigs = async () => {
    try {
      setIsLoading(true);
      const [adminConfigsSnapshot, userConfigsSnapshot] = await Promise.all([
        getDocs(query(
          collection(db, 'gameConfigs'),
          where('type', '==', 'whack-a-mole')
        )),
        getDocs(query(
          collection(db, 'userGameConfigs'),
          where('type', '==', 'whack-a-mole'),
          where('share', '==', true)
        ))
      ]);

      const configs: any[] = [];
      
      adminConfigsSnapshot.forEach((doc) => {
        configs.push({ id: doc.id, ...doc.data(), isAdminConfig: true });
      });
      
      userConfigsSnapshot.forEach((doc) => {
        configs.push({ id: doc.id, ...doc.data(), isAdminConfig: false });
      });

      setSavedConfigs(configs);
    } catch (error) {
      console.error('Error loading configurations:', error);
      toast({
        title: 'Error',
        description: 'Could not load saved configurations.',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryChange = (category: string) => {
    setGameCategory(category);
    if (DEFAULT_WORD_CATEGORIES[category]) {
      setTitle(DEFAULT_WORD_CATEGORIES[category].title);
      setWordList(DEFAULT_WORD_CATEGORIES[category].words);
      setCustomWords(DEFAULT_WORD_CATEGORIES[category].words.join(', '));
    }
  };

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
      // Validate input
      if (!title.trim()) {
        throw new Error('Please enter a configuration title.');
      }

      // Process word list
      const processedWords = customWords
        .split(',')
        .map(word => word.trim())
        .filter(word => word.length > 0);

      if (processedWords.length === 0) {
        throw new Error('Please add at least one word.');
      }

      if (processedWords.length > 50) {
        throw new Error('Maximum 50 words allowed.');
      }

      const configData = {
        type: 'whack-a-mole',
        title: title.trim(),
        timeLimit: Number(timeLimit),
        wordList: processedWords,
        gameCategory,
        share: shareConfig,
        userId: auth.currentUser.uid,
        email: auth.currentUser.email,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'userGameConfigs'), configData);
      
      toast({
        title: 'Success',
        description: 'Configuration saved successfully',
        status: 'success',
        duration: 3000,
      });

      // Select the new configuration
      onConfigSelect({ id: docRef.id, ...configData });

    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not save configuration.',
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
      </Box>

      <Divider />

      <Box w="100%">
        <Heading size="md" mb={4}>Create New Configuration</Heading>

        <FormControl mb={4}>
          <FormLabel>Word Category</FormLabel>
          <Select
            value={gameCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            placeholder="Select a word category"
          >
            {Object.entries(DEFAULT_WORD_CATEGORIES).map(([key, category]) => (
              <option key={key} value={key}>
                {category.title}
              </option>
            ))}
          </Select>
        </FormControl>

        <FormControl mb={4}>
          <FormLabel>Configuration Title</FormLabel>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter configuration title"
          />
        </FormControl>

        <FormControl mb={4}>
          <FormLabel>Time Limit (seconds)</FormLabel>
          <NumberInput
            value={timeLimit}
            onChange={(_, value) => setTimeLimit(value)}
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

        <FormControl mb={4}>
          <FormLabel>Words (comma-separated)</FormLabel>
          <Textarea
            value={customWords}
            onChange={(e) => setCustomWords(e.target.value)}
            placeholder="Enter words separated by commas"
            rows={6}
          />
          <Text fontSize="sm" color="gray.500" mt={1}>
            Maximum 50 words allowed
          </Text>
        </FormControl>

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