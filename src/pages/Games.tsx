import { useSearchParams, useParams } from 'react-router-dom';
import GameContainer from '../components/GameContainer';

const Games = () => {
  const [searchParams] = useSearchParams();
  const { configId: urlConfigId } = useParams();
  
  // Use URL parameters first, fall back to query parameters
  const gameId = 'sort-categories-egg-reveal';
  const configId = urlConfigId || searchParams.get('configId');

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'var(--spacing-8) var(--spacing-4)' }}>
      <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'bold', marginBottom: 'var(--spacing-8)' }}>
        {configId ? 'Play Game' : 'Educational Games'}
      </h1>
      <GameContainer initialGameId={gameId} initialConfigId={configId} />
    </div>
  );
};

export default Games; 