import React from 'react';
import { Box } from '@chakra-ui/react';
import SortCategoriesEggReveal from './SortCategoriesEggReveal';
import { GameConfig } from '../../../types/game';

interface SortCategoriesEggRevealAdapterProps {
  playerName: string;
  onGameComplete: (score: number) => void;
  config: GameConfig;
}

const SortCategoriesEggRevealAdapter: React.FC<SortCategoriesEggRevealAdapterProps> = ({
  playerName,
  onGameComplete,
  config,
}) => {
  return (
    <Box width="100%" height="100%">
      <SortCategoriesEggReveal
        playerName={playerName}
        onGameComplete={onGameComplete}
        config={config}
      />
    </Box>
  );
};

export default SortCategoriesEggRevealAdapter; 