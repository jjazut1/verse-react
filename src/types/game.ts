import { Timestamp, FieldValue } from 'firebase/firestore';

export interface GameConfig {
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
  createdAt?: Timestamp | FieldValue;
  userId?: string;
}

export interface Word {
  text: string;
  category: string;
}

export interface Egg {
  id: string;
  position: {
    x: number;
    y: number;
  };
  word: Word;
  cracked: boolean;
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