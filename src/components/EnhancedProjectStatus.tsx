import React, { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useTokenTracker } from '../hooks/useTokenTracker';
import { useApeOutClient } from '../hooks/useApeOutClient';

interface EnhancedProjectStatusProps {
  tokenMint: string;
  tokenName?: string;
  tokenSymbol?: string;
}

export const EnhancedProjectStatus: React.FC<EnhancedProjectStatusProps> = ({ 
  tokenMint, 
  tokenName = "Unknown",
  tokenSymbol = "UNK"
}) => {
  const [tokenMintPubkey] = useState(() => new PublicKey(tokenMint));
  const { tracker, loading, error } = useTokenTracker(tokenMintPubkey);
  const client = useApeOutClient();
  const [statusMessage, setStatusMessage] = useState<string>('');

  const getStatusDisplay = () => {
    if (!tracker) return 'Unknown';
    
    switch (tracker.status) {
      case 'Active':
        return '🟢 Active';
      case 'Warning':
        return '🟡 Warning';
      case 'Dead':
        return '🔴 Dead';
      default:
        return 'Unknown';
    }
  };

  const getAgeInDays = () => {
    if (!tracker) return 0;
    const now = Math.floor(Date.now() / 1000);
    return Math.floor((now - tracker.launchTime.toNumber()) / 86400);
  };

  const formatVolume = (volume: any) => {
    if (!volume) return '0';
    return (volume.toNumber() / 1e9).toFixed(2);
  };

  const formatPrice = (price: any) => {
    if (!price) return '0.000000';
    return (price.toNumber() / 1e6).toFixed(6);
  };

  if (loading) return (
    <div className="project-status-card loading">
      <div className="loading-spinner"></div>
      <p>Loading token data...</p>
    </div>
  );

  if (error) return (
    <div className="project-status-card error">
      <h3>❌ Error</h3>
      <p>{error}</p>
    </div>
  );

  if (!tracker) return (
    <div className="project-status-card">
      <h3>📊 Project Status</h3>
      <p>No tracker data found for this token</p>
    </div>
  );

  return (
    <div className="project-status-card">
      <div className="status-header">
        <h3>📊 {tokenName} ({tokenSymbol})</h3>
        <span className="status-badge">{getStatusDisplay()}</span>
      </div>
      
      <div className="status-grid">
        <div className="status-item">
          <label>Age:</label>
          <span>{getAgeInDays()} days</span>
        </div>
        
        <div className="status-item">
          <label>3D Volume:</label>
          <span>{formatVolume(tracker.volume3d)} SOL</span>
        </div>
        
        <div className="status-item">
          <label>Current Price:</label>
          <span>${formatPrice(tracker.currentPrice)}</span>
        </div>
        
        <div className="status-item">
          <label>ATH Price:</label>
          <span>${formatPrice(tracker.athPrice)}</span>
        </div>

        <div className="status-item">
          <label>Token Mint:</label>
          <span className="token-mint">{tokenMint.slice(0, 8)}...{tokenMint.slice(-8)}</span>
        </div>

        <div className="status-item">
          <label>Wallet Connected:</label>
          <span>{client ? '✅ Yes' : '❌ No'}</span>
        </div>
      </div>

      {tracker.status === 'Dead' && (
        <div className="dead-token-info">
          <h4>🪦 Token Declared Dead</h4>
          <p>LP tokens are now available for redistribution to holders!</p>
          <button className="claim-lp-btn">
            🎁 Claim Your LP Share
          </button>
        </div>
      )}

      {tracker.status === 'Warning' && (
        <div className="warning-info">
          <h4>⚠️ Warning Status</h4>
          <p>This token is approaching death criteria. Trade with caution!</p>
        </div>
      )}

      {statusMessage && (
        <div className="status-message">
          {statusMessage}
        </div>
      )}
    </div>
  );
};

export default EnhancedProjectStatus;
