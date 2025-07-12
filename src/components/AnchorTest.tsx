import React from 'react';
import { useAppContext } from '../context/AppContext';

export const AnchorTest: React.FC = () => {
  const { state } = useAppContext();

  React.useEffect(() => {
    console.log('🔧 Anchor Integration Status:', {
      anchorReady: state.anchorReady,
      anchorSetup: !!state.anchorSetup,
      loading: state.loading,
      error: state.error
    });
  }, [state]);

  return (
    <div style={{ 
      padding: '15px', 
      margin: '10px', 
      backgroundColor: '#e3f2fd', 
      border: '1px solid #2196F3',
      borderRadius: '4px'
    }}>
      <h3>🔧 Anchor Integration Test</h3>
      <p><strong>Anchor Ready:</strong> {state.anchorReady ? '✅ Yes' : '❌ No'}</p>
      <p><strong>Setup Available:</strong> {state.anchorSetup ? '✅ Yes' : '❌ No'}</p>
      {state.error && <p style={{ color: 'red' }}><strong>Error:</strong> {state.error}</p>}
    </div>
  );
};