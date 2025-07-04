import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useAppContext } from "../context/AppContext";

interface ApeoutStakingDashboardProps {
  tokenMint: PublicKey;
}

const ApeoutStakingDashboard: React.FC<ApeoutStakingDashboardProps> = ({
  tokenMint,
}) => {
  const { publicKey, connected } = useWallet();
  const { state, stakeTokens, unstakeTokens, setError } = useAppContext();
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [localLoading, setLocalLoading] = useState(false);

  const calculateRewardEstimate = () => {
    if (!state.stakedAmount) return 0;
    return state.stakedAmount * state.stakingMultiplier * 0.005; // 0.5% daily with multiplier
  };

  const handleStake = async () => {
    const amount = parseFloat(stakeAmount);
    if (!amount || amount <= 0) {
      setError("Please enter a valid stake amount");
      return;
    }

    if (!state.apeoutBalance || amount > state.apeoutBalance) {
      setError("Insufficient balance");
      return;
    }

    setLocalLoading(true);
    try {
      await stakeTokens(amount);
      setStakeAmount("");
      setError(null);
    } catch (error) {
      console.error("Stake failed:", error);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleUnstake = async () => {
    const amount = parseFloat(unstakeAmount);
    if (!amount || amount <= 0) {
      setError("Please enter a valid unstake amount");
      return;
    }

    if (!state.stakedAmount || amount > state.stakedAmount) {
      setError("Insufficient staked amount");
      return;
    }

    setLocalLoading(true);
    try {
      await unstakeTokens(amount);
      setUnstakeAmount("");
      setError(null);
    } catch (error) {
      console.error("Unstake failed:", error);
    } finally {
      setLocalLoading(false);
    }
  };

  const isLoading = state.loading || localLoading;

  return (
    <div className="staking-dashboard apeout">
      <h3>🦍 $APEOUT Staking Dashboard</h3>
      {connected ? (
        <>
          <div className="stats-grid">
            <div className="stat-item">
              <label>Wallet Address:</label>
              <span className="wallet-address">
                {publicKey?.toBase58().slice(0, 8)}...
                {publicKey?.toBase58().slice(-8)}
              </span>
            </div>

            <div className="stat-item">
              <label>Available Balance:</label>
              <span>{state.apeoutBalance ?? "..."} APEOUT</span>
            </div>

            <div className="stat-item">
              <label>Currently Staked:</label>
              <span>{state.stakedAmount ?? "..."} APEOUT</span>
            </div>

            <div className="stat-item">
              <label>Staking Tier:</label>
              <span className={`tier ${state.userStakingTier.toLowerCase()}`}>
                {state.userStakingTier}
              </span>
            </div>

            <div className="stat-item">
              <label>Reward Multiplier:</label>
              <span>{state.stakingMultiplier}x</span>
            </div>

            <div className="stat-item">
              <label>Est. Daily Rewards:</label>
              <span>◎{calculateRewardEstimate().toFixed(4)} SOL</span>
            </div>
          </div>

          {state.error && <div className="error-message">⚠️ {state.error}</div>}

          <div className="action-section">
            <div className="action-group">
              <h4>Stake Tokens</h4>
              <div className="input-group">
                <input
                  type="number"
                  placeholder="Amount to stake"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  disabled={isLoading}
                  min="0"
                  max={state.apeoutBalance || 0}
                />
                <button
                  onClick={handleStake}
                  disabled={isLoading || !stakeAmount || !state.apeoutBalance}
                  className="stake-btn"
                >
                  {isLoading ? "Staking..." : "Stake"}
                </button>
              </div>
              {state.apeoutBalance && (
                <small>Max: {state.apeoutBalance} APEOUT</small>
              )}
            </div>

            <div className="action-group">
              <h4>Unstake Tokens</h4>
              <div className="input-group">
                <input
                  type="number"
                  placeholder="Amount to unstake"
                  value={unstakeAmount}
                  onChange={(e) => setUnstakeAmount(e.target.value)}
                  disabled={isLoading}
                  min="0"
                  max={state.stakedAmount || 0}
                />
                <button
                  onClick={handleUnstake}
                  disabled={isLoading || !unstakeAmount || !state.stakedAmount}
                  className="unstake-btn"
                >
                  {isLoading ? "Unstaking..." : "Unstake"}
                </button>
              </div>
              {state.stakedAmount && (
                <small>Max: {state.stakedAmount} APEOUT</small>
              )}
            </div>
          </div>

          <div className="tier-info">
            <h4>Staking Tiers</h4>
            <div className="tier-list">
              <div className="tier-item bronze">
                <span>🥉 Bronze (0-99 APEOUT): 1.0x</span>
              </div>
              <div className="tier-item silver">
                <span>🥈 Silver (100-999 APEOUT): 1.1x</span>
              </div>
              <div className="tier-item gold">
                <span>🥇 Gold (1,000-4,999 APEOUT): 1.5x</span>
              </div>
              <div className="tier-item diamond">
                <span>💎 Diamond (5,000+ APEOUT): 2.0x</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="connect-prompt">
          <p>Please connect your wallet to manage staking.</p>
        </div>
      )}
    </div>
  );
};

export default ApeoutStakingDashboard;
