import { Timestamp, FieldValue } from 'firebase/firestore';

interface BaseGameConfig {
  id?: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
  targetScore: number;
  share: boolean;
  email?: string;
  createdAt?: Timestamp | FieldValue;
  userId?: string;
}

export interface WhackAMoleConfig extends BaseGameConfig {
  type: 'whack-a-mole';
  gameTime: number;
  pointsPerHit: number;
  penaltyPoints: number;
  bonusPoints: number;
  bonusThreshold: number;
  speed?: 1 | 2 | 3; // Speed setting: 1=slow (10-12 moles), 2=medium (14-16 moles), 3=fast (17-19 moles)
  instructions?: string; // Custom instructions for the game
  categories: Array<{
    title: string;
    words: string[];
  }>;
}

interface SortCategoriesConfig extends BaseGameConfig {
  type: 'sort-categories-egg';
  eggQty: number;
  categories: Array<{
    name: string;
    items: string[];
  }>;
}

export type GameConfig = WhackAMoleConfig | SortCategoriesConfig;

export interface Word {
  text: string;
  category: string;
}

export interface Egg {
  id: string;
  word: Word;
  cracked: boolean;
  position: {
    x: number;
    y: number;
  };
}

export interface Basket {
  id: string;
  name: string;
  items: Word[];
}

export interface HighScore {
  id?: string;
  playerName: string;
  score: number;
  configId: string;
  createdAt: Timestamp | FieldValue;
  userId: string;
} 