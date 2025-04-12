import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useCustomToast, ToastComponent } from '../hooks/useCustomToast';

interface Game {
  id: string;
  title: string;
  description: string;
  isFree: boolean;
  createdBy: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  studentEmail: string;
}

const TeacherDashboard = () => {
  const { currentUser } = useAuth();
  const { toastMessage, showToast } = useCustomToast();
  const [games, setGames] = useState<Game[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [activeTab, setActiveTab] = useState<'games' | 'assignments'>('games');

  const fetchGames = useCallback(async () => {
    try {
      const gamesCollection = collection(db, 'games');
      const gameSnapshot = await getDocs(gamesCollection);
      const gameList = gameSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Game[];
      setGames(gameList.filter(game => game.createdBy === currentUser?.email));
    } catch {
      showToast({
        title: 'Error fetching games',
        status: 'error',
        duration: 3000,
      });
    }
  }, [currentUser?.email, showToast]);

  const fetchAssignments = useCallback(async () => {
    try {
      const assignmentsCollection = collection(db, 'assignments');
      const assignmentSnapshot = await getDocs(assignmentsCollection);
      const assignmentList = assignmentSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Assignment[];
      setAssignments(assignmentList);
    } catch {
      showToast({
        title: 'Error fetching assignments',
        status: 'error',
        duration: 3000,
      });
    }
  }, [showToast]);

  useEffect(() => {
    if (currentUser) {
      fetchGames();
      fetchAssignments();
    }
  }, [currentUser, fetchGames, fetchAssignments]);

  const handleDeleteGame = async (gameId: string) => {
    try {
      await deleteDoc(doc(db, 'games', gameId));
      setGames(games.filter(game => game.id !== gameId));
      showToast({
        title: 'Game deleted',
        status: 'success',
        duration: 3000,
      });
    } catch {
      showToast({
        title: 'Error deleting game',
        status: 'error',
        duration: 3000,
      });
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 16px' }}>
      <ToastComponent toastMessage={toastMessage} />
      
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '32px' }}>
        Teacher Dashboard
      </h1>

      <div>
        <div style={{ 
          display: 'flex', 
          gap: '16px', 
          borderBottom: '1px solid #E2E8F0', 
          marginBottom: '24px' 
        }}>
          <button
            onClick={() => setActiveTab('games')}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderBottom: activeTab === 'games' ? '2px solid #3182CE' : 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: activeTab === 'games' ? '#3182CE' : '#4A5568',
              fontWeight: activeTab === 'games' ? 'bold' : 'normal'
            }}
          >
            My Games
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderBottom: activeTab === 'assignments' ? '2px solid #3182CE' : 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: activeTab === 'assignments' ? '#3182CE' : '#4A5568',
              fontWeight: activeTab === 'assignments' ? 'bold' : 'normal'
            }}
          >
            Assignments
          </button>
        </div>

        {activeTab === 'games' ? (
          <div>
            <button
              style={{
                padding: '8px 16px',
                backgroundColor: '#3182CE',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginBottom: '16px'
              }}
            >
              Create New Game
            </button>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Title</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Description</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game) => (
                  <tr key={game.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '12px' }}>{game.title}</td>
                    <td style={{ padding: '12px' }}>{game.description}</td>
                    <td style={{ padding: '12px' }}>{game.isFree ? 'Free' : 'Premium'}</td>
                    <td style={{ padding: '12px' }}>
                      <button
                        onClick={() => handleDeleteGame(game.id)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#F56565',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div>
            <button
              style={{
                padding: '8px 16px',
                backgroundColor: '#3182CE',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginBottom: '16px'
              }}
            >
              Create New Assignment
            </button>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Title</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Description</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Due Date</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Student</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr key={assignment.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '12px' }}>{assignment.title}</td>
                    <td style={{ padding: '12px' }}>{assignment.description}</td>
                    <td style={{ padding: '12px' }}>{assignment.dueDate}</td>
                    <td style={{ padding: '12px' }}>{assignment.studentEmail}</td>
                    <td style={{ padding: '12px' }}>
                      <button
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#F56565',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard; 