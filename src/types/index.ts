import { Timestamp } from 'firebase/firestore';

export type AssignmentStatus = 'assigned' | 'started' | 'completed';

export interface Assignment {
  id?: string;
  teacherId: string;
  studentEmail: string;
  gameId: string;
  gameName: string;
  gameType: string;
  linkToken: string;
  deadline: Timestamp;
  timesRequired: number;
  completedCount: number;
  status: AssignmentStatus;
  createdAt: Timestamp;
  lastCompletedAt?: Timestamp;
}

export interface Attempt {
  id?: string;
  assignmentId: string;
  timestamp: Timestamp;
  score?: number;
  duration: number;
  results?: any;
} 