import React, { useState } from 'react';
import { 
  syncTemplateWithGameConfig, 
  syncWhackAMoleTemplate, 
  syncSortCategoriesEggTemplate 
} from '../utils/updateTemplates';

interface TemplateSyncProps {
  templateId: string;
  gameTitle: string;
  gameType?: 'whack-a-mole' | 'sort-categories-egg';
}

const TemplateSync: React.FC<TemplateSyncProps> = ({ 
  templateId, 
  gameTitle,
  gameType 
}) => {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setResult(null);
      
      let success;
      
      if (gameType === 'whack-a-mole') {
        success = await syncWhackAMoleTemplate(templateId, gameTitle);
      } else if (gameType === 'sort-categories-egg') {
        success = await syncSortCategoriesEggTemplate(templateId, gameTitle);
      } else {
        // Auto-detect based on template data
        success = await syncTemplateWithGameConfig(templateId, gameTitle);
      }
      
      if (success) {
        setResult(`Successfully synced template "${gameTitle}"`);
      } else {
        setResult(`Failed to sync template "${gameTitle}"`);
      }
    } catch (error) {
      console.error('Error during sync:', error);
      setResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div style={{ 
      padding: '15px', 
      margin: '15px 0', 
      border: '1px solid #ddd', 
      borderRadius: '5px' 
    }}>
      <h3>Template Sync Utility</h3>
      <p>
        <strong>Template ID:</strong> {templateId}<br />
        <strong>Game Title:</strong> {gameTitle}
        {gameType && <><br /><strong>Game Type:</strong> {gameType}</>}
      </p>
      
      <button 
        onClick={handleSync}
        disabled={syncing}
        style={{
          padding: '8px 16px',
          backgroundColor: syncing ? '#ccc' : 'var(--color-primary-600)',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: syncing ? 'not-allowed' : 'pointer'
        }}
      >
        {syncing ? 'Syncing...' : 'Sync Template with Game Config'}
      </button>
      
      {result && (
        <div style={{ 
          marginTop: '10px',
          padding: '10px',
          backgroundColor: result.includes('Success') ? '#e6fff0' : '#fff0f0',
          border: `1px solid ${result.includes('Success') ? '#a3e9a4' : '#f8aeae'}`,
          borderRadius: '4px'
        }}>
          {result}
        </div>
      )}
      
      <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
        <p>
          This utility updates the categoryTemplate with data from the userGameConfig.
          Use only in development for fixing template sync issues.
        </p>
      </div>
    </div>
  );
};

export default TemplateSync; 