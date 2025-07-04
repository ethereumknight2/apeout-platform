import React, { useState } from 'react';
import { useFeeRewards } from '../hooks/useFeeRewards';
import { useAppContext } from '../context/AppContext';
import { useWallet } from '@solana/wallet-adapter-react';

interface EnhancedFeeRewardsProps {
  dayId: number;
}

export const EnhancedFeeRewards: React.FC<EnhancedFeeRewardsProps> = ({ dayId }) => {
  const { connected } = useWallet();
  const { claimRewards, claiming } = useFeeRewards();
  const { state } = useAppContext();
  const [claimResult, setClaimResult] = useState<string>('');

  // Mock data - in real app this would come from your state/API
  const userTokenBalance = state.apeoutBalance || 0;
  const totalSupply = 1000000000; // 1B tokens
  const apeoutStaked = state.stakedAmount || 0;

  const calculateRewards = () => {
    if (!userTokenBalance || !totalSupply) return 0;
    
    // Assume 100 SOL daily rewards pool
    const dailyRewardsPool = 100;
    const baseShare = (userTokenBalance / totalSupply) * dailyRewardsPool;
    
    // Apply staking multiplier
    const multiplier = state.stakingMultiplier;
    
    return baseShare * multiplier;
  };

  const handleClaimRewards = async () => {
    if (!connected) {
      setClaimResult('Please connect your wallet');
      return;
    }

    try {
      setClaimResult('Claiming rewards...');
      const signature = await claimRewards(dayId, userTokenBalance, totalSupply, apeoutStaked);
      setClaimResult(`✅ Rewards claimed successfully! TX: ${signature}`);
    } catch (error) {
      setClaimResult(`❌ Failed to claim: ${error}`);
    }
  };

  const isAlreadyClaimed = state.claimedRewards.has(`FEE_${dayId}`);

  return (
    <div className="fee-rewards-card">
      <div className="card-header">
        <h3>💰 Daily Fee Rewards</h3>
        <span className="day-badge">Day {dayId}</span>
      </div>
      
      <div className="rewards-info">
        <div className="info-grid">
          <div className="info-item">
            <label>Your APEOUT Balance:</label>
            <span>{userTokenBalance.toLocaleString()}</span>
          </div>
          
          <div className="info-item">
            <label>Staked Amount:</label>
            <span>{apeoutStaked.toLocaleString()}</span>
          </div>
          
          <div className="info-item">
            <label>Staking Tier:</label>
            <span className={`tier ${state.userStakingTier.toLowerCase()}`}>
              {state.userStakingTier} ({state.stakingMultiplier}x)
            </span>
          </div>
          
          <div className="info-item">
            <label>Estimated Rewards:</label>
            <span className="rewards-amount">
              {calculateRewards().toFixed(4)} SOL
            </span>
          </div>
        </div>

        <div className="multiplier-info">
          <h4>🎯 Staking Multipliers</h4>
          <ul>
            <li>💎 Diamond (5000+ APEOUT): 2.0x</li>
            <li>🥇 Gold (1000+ APEOUT): 1.5x</li>
            <li>🥈 Silver (100+ APEOUT): 1.1x</li>
            <li>🥉 Bronze (0+ APEOUT): 1.0x</li>
          </ul>
        </div>
      </div>

      <div className="claim-section">
        {isAlreadyClaimed ? (
          <div className="already-claimed">
            ✅ Already claimed rewards for Day {dayId}
          </div>
        ) : (
          <button 
            onClick={handleClaimRewards}
            disabled={!connected || claiming || userTokenBalance === 0}
            className={`claim-btn ${!connected || userTokenBalance === 0 ? 'disabled' : ''}`}
          >
            {claiming ? '⏳ Claiming...' : '🎁 Claim Rewards'}
          </button>
        )}

        {!connected && (
          <p className="wallet-warning">
            ⚠️ Connect your wallet to claim rewards
          </p>
        )}

        {connected && userTokenBalance === 0 && (
          <p className="balance-warning">
            ⚠️ You need APEOUT tokens to claim rewards
          </p>
        )}
      </div>

      {claimResult && (
        <div className="claim-result">
          {claimResult}
        </div>
      )}
    </div>
  );
};

export default EnhancedFeeRewards;
