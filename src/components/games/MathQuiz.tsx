import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useCustomToast, ToastComponent } from '../../hooks/useCustomToast';

interface MathQuizProps {
  playerName: string;
  onGameComplete: (score: number) => void;
}

interface HighScore {
  id: string;
  playerName: string;
  score: number;
  game: string;
  createdAt: any; // Using any for Firestore timestamp compatibility
}

const MathQuiz = ({ playerName, onGameComplete }: MathQuizProps) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isGameActive, setIsGameActive] = useState(true);
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const { toastMessage, showToast } = useCustomToast();

  // Generate a random math question
  const generateQuestion = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operators = ['+', '-', '*'];
    const operator = operators[Math.floor(Math.random() * operators.length)];
    
    let correctAnswer;
    switch (operator) {
      case '+':
        correctAnswer = num1 + num2;
        break;
      case '-':
        correctAnswer = num1 - num2;
        break;
      case '*':
        correctAnswer = num1 * num2;
        break;
      default:
        correctAnswer = 0;
    }
    
    setQuestion(`${num1} ${operator} ${num2} = ?`);
    return correctAnswer;
  };

  // Check answer and update score
  const checkAnswer = () => {
    const correctAnswer = generateQuestion();
    const userAnswer = parseInt(answer);
    
    if (userAnswer === correctAnswer) {
      setScore(score + 1);
      showToast({
        title: 'Correct!',
        status: 'success',
        duration: 1000,
      });
    } else {
      showToast({
        title: 'Incorrect!',
        description: `The correct answer was ${correctAnswer}`,
        status: 'error',
        duration: 2000,
      });
    }
    
    setAnswer('');
  };

  // Save high score to Firestore
  const saveHighScore = useCallback(async () => {
    try {
      // Create new high score entry
      const newScore = {
        playerName,
        score,
        game: 'mathQuiz',
        createdAt: serverTimestamp()
      };

      // Add to Firebase
      const docRef = await addDoc(collection(db, 'highScores'), newScore);
      console.log('Successfully saved high score with ID:', docRef.id);
      
      // Update local high scores immediately
      const newScoreWithId = { id: docRef.id, ...newScore };
      const updatedHighScores = [...highScores];
      
      // Insert the new score in the correct position
      const insertIndex = updatedHighScores.findIndex(hs => hs.score < score);
      if (insertIndex === -1) {
        // Score is lower than all current scores, but we have less than 10 scores
        if (updatedHighScores.length < 10) {
          updatedHighScores.push(newScoreWithId);
        }
      } else {
        updatedHighScores.splice(insertIndex, 0, newScoreWithId);
        // Keep only top 10
        if (updatedHighScores.length > 10) {
          updatedHighScores.pop();
        }
      }
      
      setHighScores(updatedHighScores);
      showToast({
        title: 'High score saved!',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error saving high score:', error);
      showToast({
        title: 'Error saving high score',
        status: 'error',
        duration: 3000,
      });
    }
  }, [playerName, score, showToast, highScores]);

  // Fetch high scores
  const fetchHighScores = useCallback(async () => {
    try {
      const highScoresQuery = query(
        collection(db, 'highScores'),
        where('game', '==', 'mathQuiz'),
        orderBy('score', 'desc'),
        limit(10)
      );
      
      const querySnapshot = await getDocs(highScoresQuery);
      const scores = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as HighScore[];
      
      setHighScores(scores);
    } catch (error) {
      console.error('Error fetching high scores:', error);
    }
  }, []);

  // Timer effect
  useEffect(() => {
    if (timeLeft > 0 && isGameActive) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && isGameActive) {
      setIsGameActive(false);
      onGameComplete(score);
      saveHighScore();
      fetchHighScores();
    }
  }, [timeLeft, isGameActive, score, onGameComplete, saveHighScore, fetchHighScores]);

  // Generate first question
  useEffect(() => {
    generateQuestion();
  }, []);

  return (
    <div className="math-quiz-container" style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      <ToastComponent toastMessage={toastMessage} />
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Math Quiz</h1>
        
        {isGameActive ? (
          <>
            <div style={{ width: '100%' }}>
              <div 
                style={{ 
                  width: '100%', 
                  height: '8px', 
                  backgroundColor: '#E2E8F0',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}
              >
                <div 
                  style={{ 
                    width: `${(timeLeft / 60) * 100}%`, 
                    height: '100%', 
                    backgroundColor: '#3182CE',
                    transition: 'width 1s linear'
                  }}
                />
              </div>
            </div>
            <div>Time left: {timeLeft} seconds</div>
            <div style={{ fontSize: '24px' }}>{question}</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Your answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && checkAnswer()}
                style={{ 
                  padding: '8px 12px', 
                  borderRadius: '4px', 
                  border: '1px solid #CBD5E0',
                  flex: 1
                }}
              />
              <button 
                onClick={checkAnswer}
                style={{ 
                  padding: '8px 16px', 
                  backgroundColor: '#3182CE', 
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Submit
              </button>
            </div>
            <div style={{ fontSize: '20px' }}>Score: {score}</div>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Game Over!</h2>
            <div style={{ fontSize: '20px' }}>Final Score: {score}</div>
            
            <div style={{ width: '100%' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>High Scores</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                {highScores.map((highScore, index) => (
                  <div key={highScore.id}>
                    {index + 1}. {highScore.playerName}: {highScore.score}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MathQuiz; 