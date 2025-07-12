import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useStaking, StakingInfo } from "../services/stakingService";

interface ApeoutStakingDashboardProps {
  tokenMint: PublicKey;
}

const ApeoutStakingDashboard: React.FC<ApeoutStakingDashboardProps> = ({
  tokenMint,
}) => {
  const { publicKey, connected } = useWallet();
  const stakingService = useStaking();
  
  const [stakingInfo, setStakingInfo] = useState<StakingInfo | null>(null);
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [processing, setProcessing] = useState<"stake" | "unstake" | null>(null);

  useEffect(() => {
    if (connected) {
      loadStakingInfo();
    }
  }, [connected]);

  const loadStakingInfo = async () => {
    try {
      setLoading(true);
      setError("");
      
      console.log("📊 Loading staking information...");
      const info = await stakingService.getStakingInfo();
      setStakingInfo(info);
      
      console.log("✅ Staking info loaded:", info);
    } catch (err) {
      console.error("❌ Error loading staking info:", err);
      setError(err instanceof Error ? err.message : "Failed to load staking info");
    } finally {
      setLoading(false);
    }
  };

  const handleStake = async () => {
    const amount = parseFloat(stakeAmount);
    if (!amount || amount <= 0) {
      setError("Please enter a valid stake amount");
      return;
    }

    if (!stakingInfo || amount > stakingInfo.availableBalance) {
      setError("Insufficient balance");
      return;
    }

    setProcessing("stake");
    setError("");
    
    try {
      console.log(`🏦 Staking ${amount} APEOUT tokens...`);
      const result = await stakingService.stakeTokens(amount);
      
      if (result.success) {
        console.log("✅ Staking successful:", result.signature);
        setStakeAmount("");
        await loadStakingInfo(); // Refresh data
      } else {
        throw new Error(result.error || "Staking failed");
      }
    } catch (err) {
      console.error("❌ Staking failed:", err);
      setError(err instanceof Error ? err.message : "Staking failed");
    } finally {
      setProcessing(null);
    }
  };

  const handleUnstake = async () => {
    const amount = parseFloat(unstakeAmount);
    if (!amount || amount <= 0) {
      setError("Please enter a valid unstake amount");
      return;
    }

    if (!stakingInfo || amount > stakingInfo.stakedAmount) {
      setError("Insufficient staked amount");
      return;
    }

    setProcessing("unstake");
    setError("");
    
    try {
      console.log(`🏦 Unstaking ${amount} APEOUT tokens...`);
      const result = await stakingService.unstakeTokens(amount);
      
      if (result.success) {
        console.log("✅ Unstaking successful:", result.signature);
        setUnstakeAmount("");
        await loadStakingInfo(); // Refresh data
      } else {
        throw new Error(result.error || "Unstaking failed");
      }
    } catch (err) {
      console.error("❌ Unstaking failed:", err);
      setError(err instanceof Error ? err.message : "Unstaking failed");
    } finally {
      setProcessing(null);
    }
  };

  const getTierProgress = () => {
    if (!stakingInfo) return { progress: 0, nextThreshold: 100, tokensNeeded: 100 };
    
    const staked = stakingInfo.stakedAmount;
    let nextTierThreshold = 100;
    let currentProgress = 0;

    if (staked >= 5000) {
      nextTierThreshold = 5000;
      currentProgress = 100;
    } else if (staked >= 1000) {
      nextTierThreshold = 5000;
      currentProgress = (staked / nextTierThreshold) * 100;
    } else if (staked >= 100) {
      nextTierThreshold = 1000;
      currentProgress = (staked / nextTierThreshold) * 100;
    } else {
      nextTierThreshold = 100;
      currentProgress = (staked / nextTierThreshold) * 100;
    }

    return {
      progress: Math.min(currentProgress, 100),
      nextThreshold: nextTierThreshold,
      tokensNeeded: Math.max(nextTierThreshold - staked, 0),
    };
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case "Diamond": return "💎";
      case "Gold": return "🥇";
      case "Silver": return "🥈";
      case "Bronze": return "🥉";
      default: return "🔰";
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "Diamond": return "#b9f2ff";
      case "Gold": return "#ffd700";
      case "Silver": return "#c0c0c0";
      case "Bronze": return "#cd7f32";
      default: return "#44ff99";
    }
  };

  if (loading) {
    return (
      <div className="staking-dashboard apeout loading">
        <h3>🦍 $APEOUT Staking Dashboard</h3>
        <div className="loading-spinner"></div>
        <p>Loading staking information...</p>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="staking-dashboard apeout">
        <h3>🦍 $APEOUT Staking Dashboard</h3>
        <div className="connect-prompt">
          <p>Please connect your wallet to manage staking.</p>
        </div>
      </div>
    );
  }

  if (!stakingInfo) {
    return (
      <div className="staking-dashboard apeout">
        <h3>🦍 $APEOUT Staking Dashboard</h3>
        <div className="error-message">
          <p>⚠️ Unable to load staking information</p>
          <button onClick={loadStakingInfo}>🔄 Retry</button>
        </div>
      </div>
    );
  }

  const tierInfo = getTierProgress();

  return (
    <div className="staking-dashboard apeout enhanced">
      <h3>🦍 $APEOUT Staking Dashboard</h3>

      {error && (
        <div className="error-message">
          ⚠️ {error}
          <button onClick={() => setError("")} className="error-close">✕</button>
        </div>
      )}

      {/* Current Status */}
      <div className="staking-content">
        <div className="current-status">
          <div className="status-card">
            <div className="tier-display">
              <span className="tier-icon">
                {getTierIcon(stakingInfo.stakingTier)}
              </span>
              <div className="tier-info">
                <h4>{stakingInfo.stakingTier} Tier</h4>
                <p>{stakingInfo.multiplier}x Multiplier</p>
              </div>
            </div>

            <div className="staked-amount">
              <label>Total Staked:</label>
              <span className="amount">{stakingInfo.stakedAmount.toLocaleString()} APEOUT</span>
            </div>

            <div className="available-amount">
              <label>Available Balance:</label>
              <span className="amount">{stakingInfo.availableBalance.toLocaleString()} APEOUT</span>
            </div>
          </div>
        </div>

        {/* Tier Progress */}
        <div className="progress-section">
          <div className="progress-header">
            <h4>Progress to Next Tier</h4>
            <span className="progress-percent">
              {Math.round(tierInfo.progress)}%
            </span>
          </div>

          <div className="progress-bar-container">
            <div
              className="progress-bar"
              style={{
                background: "#333",
                width: "100%",
                height: "16px",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              <div
                className="progress-fill"
                style={{
                  background: `linear-gradient(90deg, ${getTierColor(
                    stakingInfo.stakingTier
                  )}, #44ff99)`,
                  width: `${tierInfo.progress}%`,
                  height: "100%",
                  borderRadius: "8px",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>

          {tierInfo.progress < 100 && (
            <div className="progress-details">
              <p>
                <strong>
                  {tierInfo.tokensNeeded.toLocaleString()} more APEOUT
                </strong>{" "}
                needed for next tier
              </p>
              <small>
                Next threshold: {tierInfo.nextThreshold.toLocaleString()} APEOUT
              </small>
            </div>
          )}

          {tierInfo.progress >= 100 && stakingInfo.stakingTier === "Diamond" && (
            <div className="max-tier">
              <p>🎉 Congratulations! You've reached the highest tier!</p>
            </div>
          )}
        </div>

        {/* Staking Actions */}
        <div className="action-section">
          <div className="action-group">
            <h4>Stake Tokens</h4>
            <div className="input-group">
              <input
                type="number"
                placeholder="Amount to stake"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                disabled={processing !== null}
                min="0"
                max={stakingInfo.availableBalance}
              />
              <button
                onClick={handleStake}
                disabled={processing !== null || !stakeAmount || parseFloat(stakeAmount) > stakingInfo.availableBalance}
                className="stake-btn"
              >
                {processing === "stake" ? "Staking..." : "Stake"}
              </button>
            </div>
            <button
              onClick={() => setStakeAmount(stakingInfo.availableBalance.toString())}
              className="max-btn"
              disabled={processing !== null}
            >
              Stake Max ({stakingInfo.availableBalance.toLocaleString()} APEOUT)
            </button>
          </div>

          <div className="action-group">
            <h4>Unstake Tokens</h4>
            <div className="input-group">
              <input
                type="number"
                placeholder="Amount to unstake"
                value={unstakeAmount}
                onChange={(e) => setUnstakeAmount(e.target.value)}
                disabled={processing !== null}
                min="0"
                max={stakingInfo.stakedAmount}
              />
              <button
                onClick={handleUnstake}
                disabled={processing !== null || !unstakeAmount || parseFloat(unstakeAmount) > stakingInfo.stakedAmount}
                className="unstake-btn"
              >
                {processing === "unstake" ? "Unstaking..." : "Unstake"}
              </button>
            </div>
            <button
              onClick={() => setUnstakeAmount(stakingInfo.stakedAmount.toString())}
              className="max-btn"
              disabled={processing !== null}
            >
              Unstake Max ({stakingInfo.stakedAmount.toLocaleString()} APEOUT)
            </button>
          </div>
        </div>

        {/* Tier Information */}
        <div className="tier-breakdown">
          <h4>All Staking Tiers</h4>
          <div className="tier-list">
            {[
              { name: "Bronze", min: 0, max: 99, multiplier: 1.0 },
              { name: "Silver", min: 100, max: 999, multiplier: 1.1 },
              { name: "Gold", min: 1000, max: 4999, multiplier: 1.5 },
              { name: "Diamond", min: 5000, max: Infinity, multiplier: 2.0 }
            ].map(tier => (
              <div
                key={tier.name}
                className={`tier-item ${stakingInfo.stakingTier === tier.name ? "active" : ""}`}
              >
                <span className="tier-icon">{getTierIcon(tier.name)}</span>
                <div className="tier-details">
                  <strong>{tier.name}</strong>
                  <span>
                    {tier.max === Infinity 
                      ? `${tier.min.toLocaleString()}+` 
                      : `${tier.min.toLocaleString()} - ${tier.max.toLocaleString()}`
                    } APEOUT
                  </span>
                  <span className="multiplier">{tier.multiplier}x rewards</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <div className="benefits-section">
          <h4>Staking Benefits</h4>
          <div className="benefits-grid">
            <div className="benefit-item">
              <span className="benefit-icon">🎁</span>
              <div>
                <strong>Trading Fee Rewards</strong>
                <p>Earn daily SOL from platform trading fees</p>
              </div>
            </div>

            <div className="benefit-item">
              <span className="benefit-icon">💰</span>
              <div>
                <strong>LP Token Claims</strong>
                <p>Get LP tokens when projects become inactive</p>
              </div>
            </div>

            <div className="benefit-item">
              <span className="benefit-icon">📈</span>
              <div>
                <strong>Reward Multipliers</strong>
                <p>Higher tiers = bigger reward multipliers</p>
              </div>
            </div>

            <div className="benefit-item">
              <span className="benefit-icon">🏆</span>
              <div>
                <strong>Priority Access</strong>
                <p>Early access to new features and tokens</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApeoutStakingDashboard;