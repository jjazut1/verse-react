import React from 'react';
import SyllableEggHunt from './SyllableEggHunt';

interface SyllableEggHuntAdapterProps {
  playerName: string;
  onGameComplete: (score: number) => void;
}

const SyllableEggHuntAdapter: React.FC<SyllableEggHuntAdapterProps> = ({
  playerName,
  onGameComplete,
}) => {
  return (
    <SyllableEggHunt
      playerName={playerName}
      onGameComplete={onGameComplete}
    />
  );
};

export default SyllableEggHuntAdapter; 